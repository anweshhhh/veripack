import { prisma } from "@/lib/prisma";
import { buildQuestionTextMetadata, questionTextNearExactSimilarity } from "@/lib/question-text";
import { createEmbedding } from "@/lib/openai";
import { embeddingToVectorLiteral } from "@/lib/retrieval";
import { sanitizeExtractedText } from "@/lib/text-normalization";

const NEAR_EXACT_MIN_SIMILARITY = 0.93;
const SEMANTIC_MIN_SIMILARITY = 0.88;

type ChunkCitation = {
  chunkId: string;
  docName: string;
  quotedSnippet: string;
};

type SemanticCandidateRow = {
  id: string;
  distance: number;
};

export type ReusedApprovedAnswer = {
  approvedAnswerId: string;
  answerText: string;
  citations: ChunkCitation[];
  matchType: "EXACT" | "NEAR_EXACT" | "SEMANTIC";
};

const APPROVED_ANSWER_SEMANTIC_SQL = `
SELECT
  aa."id" as "id",
  (aa."questionEmbedding" <=> $1::vector) as "distance"
FROM "ApprovedAnswer" aa
WHERE aa."workspaceId" = $2
  AND aa."questionEmbedding" IS NOT NULL
ORDER BY distance ASC, aa."id" ASC
LIMIT 12
`;

async function resolveCitationChunkIds(
  workspaceId: string,
  chunkIds: string[],
  allowedDocumentIds?: string[]
): Promise<ChunkCitation[] | null> {
  const chunks = await prisma.evidenceChunk.findMany({
    where: {
      id: {
        in: chunkIds
      },
      document: {
        workspaceId,
        ...(allowedDocumentIds?.length
          ? {
              id: {
                in: allowedDocumentIds
              }
            }
          : {})
      }
    },
    select: {
      id: true,
      content: true,
      document: {
        select: {
          name: true
        }
      }
    }
  });

  if (chunks.length !== chunkIds.length) {
    return null;
  }

  const map = new Map(
    chunks.map((chunk) => [
      chunk.id,
      {
        chunkId: chunk.id,
        docName: chunk.document.name,
        quotedSnippet: sanitizeExtractedText(chunk.content).replace(/\s+/g, " ").trim().slice(0, 700)
      }
    ])
  );

  return chunkIds.map((chunkId) => map.get(chunkId)).filter((value): value is ChunkCitation => Boolean(value));
}

export async function isApprovedAnswerStale(approvedAnswerId: string, workspaceId: string) {
  const snapshots = await prisma.approvedAnswerEvidence.findMany({
    where: {
      approvedAnswerId,
      approvedAnswer: {
        workspaceId
      }
    },
    include: {
      chunk: {
        select: {
          evidenceFingerprint: true,
          document: {
            select: {
              workspaceId: true
            }
          }
        }
      }
    }
  });

  if (snapshots.length === 0) {
    return true;
  }

  return snapshots.some((snapshot) => {
    return (
      snapshot.chunk.document.workspaceId !== workspaceId ||
      snapshot.chunk.evidenceFingerprint !== snapshot.fingerprintAtApproval
    );
  });
}

export async function findApprovedAnswerReuse(params: {
  workspaceId: string;
  questionText: string;
  evidenceDocumentIds?: string[];
}): Promise<ReusedApprovedAnswer | null> {
  const candidates = await prisma.approvedAnswer.findMany({
    where: {
      workspaceId: params.workspaceId
    },
    select: {
      id: true,
      answerText: true,
      citationChunkIds: true,
      normalizedQuestionText: true,
      questionTextHash: true,
      updatedAt: true
    }
  });

  if (candidates.length === 0) {
    return null;
  }

  const { normalizedQuestionText, questionTextHash } = buildQuestionTextMetadata(params.questionText);

  const exactCandidates = candidates
    .filter(
      (candidate) =>
        candidate.questionTextHash === questionTextHash ||
        candidate.normalizedQuestionText === normalizedQuestionText
    )
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  for (const candidate of exactCandidates) {
    const maybeExact = await resolveReuseCandidate(params.workspaceId, candidate, "EXACT", params.evidenceDocumentIds);
    if (maybeExact) {
      return maybeExact;
    }
  }

  const nearCandidates = candidates
    .map((candidate) => ({
      candidate,
      similarity: questionTextNearExactSimilarity(normalizedQuestionText, candidate.normalizedQuestionText)
    }))
    .filter((entry) => entry.similarity >= NEAR_EXACT_MIN_SIMILARITY)
    .sort((left, right) => right.similarity - left.similarity || right.candidate.updatedAt.getTime() - left.candidate.updatedAt.getTime())
    .map((entry) => entry.candidate);

  for (const candidate of nearCandidates) {
    const maybeNear = await resolveReuseCandidate(params.workspaceId, candidate, "NEAR_EXACT", params.evidenceDocumentIds);
    if (maybeNear) {
      return maybeNear;
    }
  }

  const questionEmbedding = await createEmbedding(params.questionText);
  const semanticRows = await prisma.$queryRawUnsafe<SemanticCandidateRow[]>(
    APPROVED_ANSWER_SEMANTIC_SQL,
    embeddingToVectorLiteral(questionEmbedding),
    params.workspaceId
  );

  const semanticIds = semanticRows
    .map((row) => ({
      id: row.id,
      similarity: 1 - Number(row.distance)
    }))
    .filter((row) => row.similarity >= SEMANTIC_MIN_SIMILARITY)
    .map((row) => row.id);

  const semanticCandidates = semanticIds
    .map((id) => candidates.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

  for (const candidate of semanticCandidates) {
    const maybeSemantic = await resolveReuseCandidate(params.workspaceId, candidate, "SEMANTIC", params.evidenceDocumentIds);
    if (maybeSemantic) {
      return maybeSemantic;
    }
  }

  return null;
}

async function resolveReuseCandidate(
  workspaceId: string,
  candidate:
    | {
        id: string;
        answerText: string;
        citationChunkIds: string[];
      }
    | undefined,
  matchType: "EXACT" | "NEAR_EXACT" | "SEMANTIC",
  allowedDocumentIds?: string[]
) {
  if (!candidate) {
    return null;
  }

  if (await isApprovedAnswerStale(candidate.id, workspaceId)) {
    return null;
  }

  const citations = await resolveCitationChunkIds(workspaceId, candidate.citationChunkIds, allowedDocumentIds);
  if (!citations?.length) {
    return null;
  }

  return {
    approvedAnswerId: candidate.id,
    answerText: candidate.answerText.trim(),
    citations,
    matchType
  } satisfies ReusedApprovedAnswer;
}
