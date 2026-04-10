import {
  EvidenceScopeMode,
  Prisma,
  QuestionReviewState,
  QuestionReviewStatus,
  QuestionSystemStatus,
  ReuseMatchType,
  type QuestionnaireItem
} from "@prisma/client";
import { NOT_FOUND_TEXT, answerQuestionFromEvidence, type Citation } from "@/lib/answer-engine";
import { AppError } from "@/lib/errors";
import { buildQuestionnaireExportCsv } from "@/lib/export";
import { buildQuestionTextMetadata } from "@/lib/question-text";
import { parseQuestionnaireCsv } from "@/lib/questionnaire-csv";
import { createEmbedding } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { embeddingToVectorLiteral } from "@/lib/retrieval";
import { requireWorkspaceAccess } from "@/lib/workspaces";

type PrismaTx = Prisma.TransactionClient | typeof prisma;

function getQuestionnaireScopeDocumentCount(questionnaire: {
  evidenceScopeMode: EvidenceScopeMode;
  evidenceScopeDocumentIds: string[];
}) {
  if (questionnaire.evidenceScopeDocumentIds.length > 0) {
    return questionnaire.evidenceScopeDocumentIds.length;
  }

  return questionnaire.evidenceScopeMode === EvidenceScopeMode.ALL_READY ? 0 : questionnaire.evidenceScopeDocumentIds.length;
}

export function describeQuestionnaireEvidenceScope(questionnaire: {
  evidenceScopeMode: EvidenceScopeMode;
  evidenceScopeDocumentIds: string[];
}) {
  const count = getQuestionnaireScopeDocumentCount(questionnaire);

  if (questionnaire.evidenceScopeMode === EvidenceScopeMode.SELECTED_DOCUMENTS) {
    return {
      mode: questionnaire.evidenceScopeMode,
      count,
      label: `${count} selected source file${count === 1 ? "" : "s"}`
    };
  }

  return {
    mode: questionnaire.evidenceScopeMode,
    count,
    label: `All ready evidence${count > 0 ? ` (${count})` : ""}`
  };
}

function jsonToCitations(value: Prisma.JsonValue): Citation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Citation => {
      return (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as Citation).chunkId === "string" &&
        typeof (entry as Citation).docName === "string" &&
        typeof (entry as Citation).quotedSnippet === "string"
      );
    })
    .map((entry) => ({
      chunkId: entry.chunkId,
      docName: entry.docName,
      quotedSnippet: entry.quotedSnippet
    }));
}

function normalizeItemAnswer(answer: string | null, notFoundReason: string | null) {
  if (!answer) {
    return null;
  }

  if (notFoundReason || answer.trim() === NOT_FOUND_TEXT) {
    return null;
  }

  return answer;
}

async function recomputeQuestionnaireStats(tx: PrismaTx, questionnaireId: string) {
  const items = await tx.questionnaireItem.findMany({
    where: {
      questionnaireId
    },
    select: {
      answer: true,
      reviewState: true
    }
  });

  const answeredCount = items.filter((item) => Boolean(item.answer?.trim())).length;
  const approvedCount = items.filter((item) => item.reviewState === QuestionReviewState.APPROVED).length;
  const needsReviewCount = items.filter((item) => item.reviewState === QuestionReviewState.NEEDS_REVIEW).length;

  await tx.questionnaire.update({
    where: {
      id: questionnaireId
    },
    data: {
      answeredCount,
      approvedCount,
      needsReviewCount
    }
  });
}

async function persistApprovedAnswerFromItem(params: {
  tx: PrismaTx;
  workspaceId: string;
  userId: string;
  item: Pick<QuestionnaireItem, "id" | "text" | "answer"> & { citations: Prisma.JsonValue };
}) {
  const citations = jsonToCitations(params.item.citations);
  if (!params.item.answer?.trim() || citations.length === 0) {
    return;
  }

  const { normalizedQuestionText, questionTextHash } = buildQuestionTextMetadata(params.item.text);
  const questionEmbedding = await createEmbedding(params.item.text);

  await params.tx.approvedAnswer.upsert({
    where: {
      sourceQuestionId: params.item.id
    },
    update: {
      questionText: params.item.text,
      normalizedQuestionText,
      questionTextHash,
      answerText: params.item.answer.trim(),
      citationChunkIds: citations.map((citation) => citation.chunkId),
      createdByUserId: params.userId
    },
    create: {
      workspaceId: params.workspaceId,
      sourceQuestionId: params.item.id,
      questionText: params.item.text,
      normalizedQuestionText,
      questionTextHash,
      answerText: params.item.answer.trim(),
      citationChunkIds: citations.map((citation) => citation.chunkId),
      createdByUserId: params.userId
    }
  });

  const approvedAnswer = await params.tx.approvedAnswer.findUniqueOrThrow({
    where: {
      sourceQuestionId: params.item.id
    }
  });

  await params.tx.$executeRawUnsafe(
    'UPDATE "ApprovedAnswer" SET "questionEmbedding" = $1::vector WHERE "id" = $2',
    embeddingToVectorLiteral(questionEmbedding),
    approvedAnswer.id
  );

  await params.tx.approvedAnswerEvidence.deleteMany({
    where: {
      approvedAnswerId: approvedAnswer.id
    }
  });

  if (citations.length === 0) {
    return;
  }

  const chunks = await params.tx.evidenceChunk.findMany({
    where: {
      id: {
        in: citations.map((citation) => citation.chunkId)
      }
    },
    select: {
      id: true,
      evidenceFingerprint: true
    }
  });

  if (chunks.length === 0) {
    return;
  }

  await params.tx.approvedAnswerEvidence.createMany({
    data: chunks.map((chunk) => ({
      approvedAnswerId: approvedAnswer.id,
      chunkId: chunk.id,
      fingerprintAtApproval: chunk.evidenceFingerprint
    }))
  });
}

export async function listQuestionnaires(userId: string, workspaceSlug: string) {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "VIEW_QUESTIONNAIRES");
  const questionnaires = await prisma.questionnaire.findMany({
    where: {
      workspaceId: access.workspace.id
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return {
    access,
    questionnaires
  };
}

export async function importQuestionnaire(params: {
  userId: string;
  workspaceSlug: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  questionColumnKey?: string;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "IMPORT_QUESTIONNAIRES");
  const parsed = parseQuestionnaireCsv({
    fileName: params.fileName,
    mimeType: params.mimeType,
    bytes: params.bytes
  });

  const questionColumnKey = params.questionColumnKey || parsed.suggestedQuestionColumnKey;
  const questionHeader = parsed.headers.find((header) => header.key === questionColumnKey);
  if (!questionHeader) {
    throw new AppError("Choose a valid question column.", {
      code: "INVALID_QUESTION_COLUMN",
      status: 400
    });
  }

  const normalizedRows = parsed.rows
    .map((row) => ({
      rowIndex: row.sourceRowNumber - 2,
      sourceRow: Object.fromEntries(parsed.headers.map((header) => [header.label, row.cells[header.key] ?? ""])),
      text: row.cells[questionHeader.key]?.trim() ?? ""
    }))
    .filter((row) => row.text);

  if (normalizedRows.length === 0) {
    throw new AppError("No non-empty questions were found in the selected question column.", {
      code: "QUESTIONNAIRE_EMPTY",
      status: 400
    });
  }

  return prisma.$transaction(async (tx) => {
    const readyEvidenceDocuments = await tx.evidenceDocument.findMany({
      where: {
        workspaceId: access.workspace.id,
        status: "READY",
        archivedAt: null
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true
      }
    });

    const questionnaire = await tx.questionnaire.create({
      data: {
        workspaceId: access.workspace.id,
        name: params.fileName.replace(/\.csv$/i, ""),
        sourceFileName: params.fileName,
        questionColumn: questionHeader.label,
        originalHeaders: parsed.headers.map((header) => header.label),
        evidenceScopeMode: EvidenceScopeMode.ALL_READY,
        evidenceScopeDocumentIds: readyEvidenceDocuments.map((document) => document.id),
        totalCount: normalizedRows.length,
        createdByUserId: access.userId
      }
    });

    await tx.questionnaireItem.createMany({
      data: normalizedRows.map((row, index) => ({
        questionnaireId: questionnaire.id,
        rowIndex: index,
        sourceRow: row.sourceRow,
        text: row.text,
        citations: []
      }))
    });

    return questionnaire;
  });
}

export async function getQuestionnairePageData(userId: string, workspaceSlug: string, questionnaireId: string) {
  const access = await requireWorkspaceAccess(userId, workspaceSlug, "VIEW_QUESTIONNAIRES");
  const questionnaire = await prisma.questionnaire.findFirst({
    where: {
      id: questionnaireId,
      workspaceId: access.workspace.id
    },
    include: {
      items: {
        orderBy: {
          rowIndex: "asc"
        }
      }
    }
  });

  if (!questionnaire) {
    throw new AppError("Questionnaire not found.", {
      code: "QUESTIONNAIRE_NOT_FOUND",
      status: 404
    });
  }

  return {
    access,
    questionnaire,
    items: questionnaire.items.map((item) => ({
      ...item,
      answer: normalizeItemAnswer(item.answer, item.notFoundReason),
      citations: jsonToCitations(item.citations)
    }))
  };
}

export async function runAutofillBatch(params: {
  userId: string;
  workspaceSlug: string;
  questionnaireId: string;
  batchSize?: number;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "RUN_AUTOFILL");
  const questionnaire = await prisma.questionnaire.findFirst({
    where: {
      id: params.questionnaireId,
      workspaceId: access.workspace.id
    },
    select: {
      id: true,
      workspaceId: true,
      autofillCursor: true,
      totalCount: true
    }
  });

  if (!questionnaire) {
    throw new AppError("Questionnaire not found.", {
      code: "QUESTIONNAIRE_NOT_FOUND",
      status: 404
    });
  }

  const batchSize = Math.max(1, Math.min(params.batchSize ?? 8, 12));

  await prisma.questionnaire.update({
    where: {
      id: questionnaire.id
    },
    data: {
      autofillStatus: "RUNNING",
      autofillError: null
    }
  });

  const items = await prisma.questionnaireItem.findMany({
    where: {
      questionnaireId: questionnaire.id
    },
    orderBy: {
      rowIndex: "asc"
    },
    skip: questionnaire.autofillCursor,
    take: batchSize
  });

  for (const item of items) {
    const answer = await answerQuestionFromEvidence({
      workspaceId: access.workspace.id,
      questionText: item.text,
      evidenceDocumentIds: questionnaire.evidenceScopeDocumentIds
    });

    await prisma.questionnaireItem.update({
      where: {
        id: item.id
      },
      data: {
        answer: answer.answer,
        citations: answer.citations,
        systemStatus: answer.systemStatus as QuestionSystemStatus,
        reviewState: QuestionReviewState.UNREVIEWED,
        reviewStatus: QuestionReviewStatus.DRAFT,
        draftSuggestionApplied: false,
        reusedFromApprovedAnswerId: answer.reusedFromApprovedAnswerId,
        reuseMatchType: answer.reusedFromApprovedMatchType
          ? (answer.reusedFromApprovedMatchType as ReuseMatchType)
          : null,
        reusedAt: answer.reusedFromApprovedAnswerId ? new Date() : null,
        notFoundReason: answer.notFoundReason ?? null
      }
    });
  }

  const nextCursor = questionnaire.autofillCursor + items.length;

  await prisma.questionnaire.update({
    where: {
      id: questionnaire.id
    },
    data: {
      autofillCursor: nextCursor,
      autofillStatus: nextCursor >= questionnaire.totalCount ? "COMPLETED" : "IDLE",
      lastAutofilledAt: new Date()
    }
  });

  await recomputeQuestionnaireStats(prisma, questionnaire.id);

  return {
    processedCount: items.length,
    nextCursor,
    done: nextCursor >= questionnaire.totalCount
  };
}

export async function reviewQuestionnaireItem(params: {
  userId: string;
  workspaceSlug: string;
  questionnaireId: string;
  itemId: string;
  answer: string;
  reviewState: QuestionReviewState;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "APPROVE_ANSWERS");
  const item = await prisma.questionnaireItem.findFirst({
    where: {
      id: params.itemId,
      questionnaireId: params.questionnaireId,
      questionnaire: {
        workspaceId: access.workspace.id
      }
    }
  });

  if (!item) {
    throw new AppError("Questionnaire item not found.", {
      code: "QUESTIONNAIRE_ITEM_NOT_FOUND",
      status: 404
    });
  }

  return prisma.$transaction(async (tx) => {
    const nextAnswer = params.answer.trim();
    const currentCitations = jsonToCitations(item.citations);

    if (params.reviewState === QuestionReviewState.APPROVED) {
      if (item.systemStatus === QuestionSystemStatus.BLOCKED) {
        throw new AppError("Blocked rows cannot be approved until grounded evidence is found.", {
          code: "BLOCKED_ROW_CANNOT_BE_APPROVED",
          status: 400
        });
      }

      if (!nextAnswer) {
        throw new AppError("Write or generate an answer before approval.", {
          code: "ANSWER_REQUIRED_FOR_APPROVAL",
          status: 400
        });
      }

      if (currentCitations.length === 0) {
        throw new AppError("Supported approved answers must keep at least one citation.", {
          code: "CITATIONS_REQUIRED_FOR_APPROVAL",
          status: 400
        });
      }
    }

    const updated = await tx.questionnaireItem.update({
      where: {
        id: item.id
      },
      data: {
        answer: nextAnswer,
        reviewState: params.reviewState,
        reviewStatus:
          params.reviewState === QuestionReviewState.APPROVED
            ? QuestionReviewStatus.APPROVED
            : params.reviewState === QuestionReviewState.NEEDS_REVIEW
              ? QuestionReviewStatus.NEEDS_REVIEW
              : QuestionReviewStatus.DRAFT,
        draftSuggestionApplied: params.reviewState === QuestionReviewState.APPROVED
      }
    });

    if (params.reviewState === QuestionReviewState.APPROVED) {
      await persistApprovedAnswerFromItem({
        tx,
        workspaceId: access.workspace.id,
        userId: access.userId,
        item: {
          id: updated.id,
          text: updated.text,
          answer: updated.answer,
          citations: updated.citations
        }
      });
    }

    await recomputeQuestionnaireStats(tx, params.questionnaireId);
    return updated;
  });
}

export async function exportQuestionnaireCsv(params: {
  userId: string;
  workspaceSlug: string;
  questionnaireId: string;
}) {
  const access = await requireWorkspaceAccess(params.userId, params.workspaceSlug, "EXPORT_RESULTS");
  const questionnaire = await prisma.questionnaire.findFirst({
    where: {
      id: params.questionnaireId,
      workspaceId: access.workspace.id
    },
    include: {
      items: {
        orderBy: {
          rowIndex: "asc"
        }
      }
    }
  });

  if (!questionnaire) {
    throw new AppError("Questionnaire not found.", {
      code: "QUESTIONNAIRE_NOT_FOUND",
      status: 404
    });
  }

  const csv = buildQuestionnaireExportCsv(
    questionnaire.originalHeaders,
    questionnaire.items.map((item) => ({
      sourceRow: item.sourceRow as Record<string, string>,
      answer: item.answer ?? "",
      citations: jsonToCitations(item.citations),
      reviewStatus: item.reviewState === QuestionReviewState.APPROVED ? "APPROVED" : item.reviewState === QuestionReviewState.NEEDS_REVIEW ? "NEEDS_REVIEW" : "DRAFT"
    }))
  );

  const filename = `${questionnaire.name.replace(/[^a-zA-Z0-9._-]+/g, "-") || "questionnaire"}-attestly-export.csv`;
  await prisma.exportRecord.create({
    data: {
      questionnaireId: questionnaire.id,
      format: "csv",
      fileName: filename,
      createdByUserId: access.userId
    }
  });

  return {
    filename,
    csv
  };
}
