export const dynamic = "force-dynamic";

import { DocumentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePageWorkspaceAccess } from "@/lib/auth";
import { describeQuestionnaireEvidenceScope } from "@/lib/questionnaires";
import {
  WorkspaceHomeStage,
  type WorkspaceHomeNextAction,
  type WorkspaceHomeMode,
  type WorkspaceHomeStepStatus,
  type WorkspaceHomeInsightState
} from "@/components/workspace-home-stage";

type CitationLike = {
  docName: string;
};

function parseCitationDocNames(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is CitationLike => {
      return typeof entry === "object" && entry !== null && typeof (entry as CitationLike).docName === "string";
    })
    .map((entry) => entry.docName);
}

function resolveHomeState(params: {
  workspaceSlug: string;
  evidenceCount: number;
  readyEvidenceCount: number;
  questionnaireCount: number;
  latestQuestionnaire:
    | {
        id: string;
        name: string;
        totalCount: number;
        approvedCount: number;
        needsReviewCount: number;
        evidenceScopeMode: "ALL_READY" | "SELECTED_DOCUMENTS";
        evidenceScopeDocumentIds: string[];
      }
    | null;
}) {
  const questionnaireReady =
    params.latestQuestionnaire && params.latestQuestionnaire.totalCount > 0
      ? params.latestQuestionnaire.approvedCount >= params.latestQuestionnaire.totalCount
      : false;

  if (params.evidenceCount === 0) {
    return {
      mode: "empty" as WorkspaceHomeMode,
      title: "Start the first proof packet.",
      description: "Upload source once and let the packet take shape.",
      kicker: "Workspace ready",
      ctaHref: undefined,
      ctaLabel: undefined,
      secondaryHref: undefined,
      secondaryLabel: undefined
    };
  }

  if (params.questionnaireCount === 0) {
    return {
      mode: "questionnaire" as WorkspaceHomeMode,
      title: "Add the review packet.",
      description: `The first packet will start against ${params.readyEvidenceCount} ready source file${params.readyEvidenceCount === 1 ? "" : "s"}.`,
      ctaHref: `/w/${params.workspaceSlug}/library?tab=questionnaires`,
      ctaLabel: "Import packet",
      secondaryHref: undefined,
      secondaryLabel: undefined,
      kicker: "Workspace primed"
    };
  }

  if (!questionnaireReady && params.latestQuestionnaire) {
    const scope = describeQuestionnaireEvidenceScope(params.latestQuestionnaire);
    return {
      mode: "review" as WorkspaceHomeMode,
      title: "Approve the next grounded answer.",
      description: `This packet is grounded against ${scope.label.toLowerCase()}.`,
      ctaHref: `/w/${params.workspaceSlug}/review?questionnaireId=${encodeURIComponent(params.latestQuestionnaire.id)}`,
      ctaLabel: "Continue review",
      secondaryHref: undefined,
      secondaryLabel: undefined,
      kicker: "In review"
    };
  }

  if (params.latestQuestionnaire) {
    return {
      mode: "export" as WorkspaceHomeMode,
      title: "Export the approved file.",
      description: "The latest packet has settled into a finished file.",
      ctaHref: `/api/questionnaires/${params.latestQuestionnaire.id}/export?workspaceSlug=${encodeURIComponent(params.workspaceSlug)}`,
      ctaLabel: "Export latest",
      secondaryHref: undefined,
      secondaryLabel: undefined,
      kicker: "Ready to finish"
    };
  }

  return {
    mode: "review" as WorkspaceHomeMode,
    title: "Continue the review workflow.",
    description: "Keep moving through the next answer.",
    ctaHref: `/w/${params.workspaceSlug}/review`,
    ctaLabel: "Open review",
    secondaryHref: undefined,
    secondaryLabel: undefined,
    kicker: "Workspace"
  };
}

function buildStepStatuses(params: {
  evidenceCount: number;
  questionnaireCount: number;
  latestQuestionnaire:
    | {
        totalCount: number;
        approvedCount: number;
      }
    | null;
}) {
  const reviewDone =
    params.latestQuestionnaire && params.latestQuestionnaire.totalCount > 0
      ? params.latestQuestionnaire.approvedCount >= params.latestQuestionnaire.totalCount
      : false;

  const hasQuestionnaire = params.questionnaireCount > 0;
  const hasEvidence = params.evidenceCount > 0;

  const stepOne: WorkspaceHomeStepStatus = hasEvidence ? "done" : "current";
  const stepTwo: WorkspaceHomeStepStatus = hasQuestionnaire ? "done" : hasEvidence ? "current" : "upcoming";
  const stepThree: WorkspaceHomeStepStatus = hasQuestionnaire ? (reviewDone ? "done" : "current") : "upcoming";
  const stepFour: WorkspaceHomeStepStatus = reviewDone ? "current" : "upcoming";

  return [stepOne, stepTwo, stepThree, stepFour];
}

function formatRelativeAge(from: Date | null, now: Date) {
  if (!from) {
    return null;
  }

  const diffMs = Math.max(now.getTime() - from.getTime(), 0);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return "just now";
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  return `${Math.floor(diffDays / 30)}mo ago`;
}

function buildDailySeries(entries: Date[], days: number, now: Date) {
  const series = Array.from({ length: days }, () => 0);

  entries.forEach((date) => {
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < days) {
      const index = days - diffDays - 1;
      series[index] += 1;
    }
  });

  return series;
}

function buildInsightState(params: {
  mode: WorkspaceHomeMode;
  readyEvidenceCount: number;
  evidenceCount: number;
  approvedAnswersCount: number;
  processingEvidenceCount: number;
  staleApprovalsCount: number;
  workspaceSlug: string;
  latestQuestionnaireId: string | null;
  latestQuestionnaire:
    | {
        totalCount: number;
        approvedCount: number;
      }
    | null;
  approvalSeriesLast7Days: number[];
  approvalsLast7Days: number;
  approvalsPrevious7Days: number;
  approvalsLast30Days: number;
  approvalsPrevious30Days: number;
  answerMix: {
    groundedCount: number;
    reusedCount: number;
    insufficientCount: number;
    totalCount: number;
  };
  latestExportAge: string | null;
  latestEvidenceRefreshAge: string | null;
}): WorkspaceHomeInsightState {
  const pendingRowsCount = params.latestQuestionnaire
    ? Math.max(params.latestQuestionnaire.totalCount - params.latestQuestionnaire.approvedCount, 0)
    : 0;

  return {
    showHybrid: params.mode === "review" || params.mode === "export",
    supportLine:
      params.mode === "questionnaire"
        ? `${params.readyEvidenceCount}/${Math.max(params.evidenceCount, 1)} files ready • ${params.processingEvidenceCount} still processing • ${params.approvedAnswersCount} reusable answers`
        : null,
    exceptionItems: [
      params.processingEvidenceCount > 0
        ? {
            label: "Evidence processing",
            count: params.processingEvidenceCount,
            href: `/w/${params.workspaceSlug}/library?tab=evidence`
          }
        : null,
      pendingRowsCount > 0 && params.latestQuestionnaireId
        ? {
            label: "Rows pending",
            count: pendingRowsCount,
            href: `/w/${params.workspaceSlug}/review?questionnaireId=${encodeURIComponent(params.latestQuestionnaireId)}`
          }
        : null,
      params.staleApprovalsCount > 0
        ? {
            label: "Stale approvals",
            count: params.staleApprovalsCount,
            href: `/w/${params.workspaceSlug}/library?tab=questionnaires`
          }
        : null
    ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
    approvalVelocity: {
      series: params.approvalSeriesLast7Days,
      last7Days: params.approvalsLast7Days,
      previous7Days: params.approvalsPrevious7Days,
      last30Days: params.approvalsLast30Days,
      previous30Days: params.approvalsPrevious30Days
    },
    answerMix: params.answerMix,
    quietContext: {
      reusableAnswersCount: params.approvedAnswersCount,
      latestExportAge: params.latestExportAge,
      latestEvidenceRefreshAge: params.latestEvidenceRefreshAge
    }
  };
}

export default async function WorkspaceHomePage({ params }: { params: { workspaceSlug: string } }) {
  const access = await requirePageWorkspaceAccess(params.workspaceSlug, "VIEW_HOME");
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);
  const fourteenDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 14);
  const thirtyDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
  const sixtyDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60);

  const [
    evidenceCount,
    readyEvidenceCount,
    processingEvidenceCount,
    questionnaireCount,
    approvedAnswersCount,
    latestQuestionnaire,
    exportCount,
    latestExportRecord,
    latestReadyEvidence,
    recentApprovedItems,
    staleApprovalRows
  ] = await Promise.all([
    prisma.evidenceDocument.count({
      where: {
        workspaceId: access.workspace.id
      }
    }),
    prisma.evidenceDocument.count({
      where: {
        workspaceId: access.workspace.id,
        status: "READY"
      }
    }),
    prisma.evidenceDocument.count({
      where: {
        workspaceId: access.workspace.id,
        status: {
          in: [DocumentStatus.UPLOADED, DocumentStatus.PROCESSING]
        }
      }
    }),
    prisma.questionnaire.count({
      where: {
        workspaceId: access.workspace.id
      }
    }),
    prisma.approvedAnswer.count({
      where: {
        workspaceId: access.workspace.id
      }
    }),
    prisma.questionnaire.findFirst({
      where: {
        workspaceId: access.workspace.id
      },
      orderBy: {
        updatedAt: "desc"
      },
      select: {
        id: true,
        name: true,
        totalCount: true,
        approvedCount: true,
        needsReviewCount: true,
        evidenceScopeMode: true,
        evidenceScopeDocumentIds: true
      }
    }),
    prisma.exportRecord.count({
      where: {
        questionnaire: {
          workspaceId: access.workspace.id
        }
      }
    }),
    prisma.exportRecord.findFirst({
      where: {
        questionnaire: {
          workspaceId: access.workspace.id
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        createdAt: true
      }
    }),
    prisma.evidenceDocument.findFirst({
      where: {
        workspaceId: access.workspace.id,
        status: "READY"
      },
      orderBy: {
        updatedAt: "desc"
      },
      select: {
        updatedAt: true
      }
    }),
    prisma.questionnaireItem.findMany({
      where: {
        questionnaire: {
          workspaceId: access.workspace.id
        },
        reviewState: "APPROVED",
        updatedAt: {
          gte: sixtyDaysAgo
        }
      },
      select: {
        updatedAt: true
      }
    }),
    prisma.$queryRaw<{ approvedAnswerId: string }[]>(Prisma.sql`
      SELECT DISTINCT aae."approvedAnswerId"
      FROM "ApprovedAnswerEvidence" aae
      INNER JOIN "ApprovedAnswer" aa ON aa."id" = aae."approvedAnswerId"
      INNER JOIN "EvidenceChunk" ec ON ec."id" = aae."chunkId"
      WHERE aa."workspaceId" = ${access.workspace.id}
        AND ec."evidenceFingerprint" <> aae."fingerprintAtApproval"
    `)
  ]);

  const answerMixCounts = latestQuestionnaire
    ? await Promise.all([
        prisma.questionnaireItem.count({
          where: {
            questionnaireId: latestQuestionnaire.id,
            answer: {
              not: null
            },
            notFoundReason: null,
            reusedFromApprovedAnswerId: null
          }
        }),
        prisma.questionnaireItem.count({
          where: {
            questionnaireId: latestQuestionnaire.id,
            reusedFromApprovedAnswerId: {
              not: null
            }
          }
        }),
        prisma.questionnaireItem.count({
          where: {
            questionnaireId: latestQuestionnaire.id,
            notFoundReason: {
              not: null
            }
          }
        })
      ])
    : ([0, 0, 0] as const);

  const nextActionCandidates = latestQuestionnaire
    ? await prisma.questionnaireItem.findMany({
        where: {
          questionnaireId: latestQuestionnaire.id,
          reviewState: {
            in: ["UNREVIEWED", "NEEDS_REVIEW"]
          }
        },
        orderBy: {
          rowIndex: "asc"
        },
        select: {
          rowIndex: true,
          text: true,
          answer: true,
          citations: true,
          systemStatus: true,
          reviewState: true
        }
      })
    : [];

  const nextActionPriority = {
    READY_UNREVIEWED: 0,
    PARTIAL_UNREVIEWED: 1,
    READY_NEEDS_REVIEW: 2,
    PARTIAL_NEEDS_REVIEW: 3,
    BLOCKED_NEEDS_REVIEW: 4,
    BLOCKED_UNREVIEWED: 5,
    PENDING_UNREVIEWED: 6,
    PENDING_NEEDS_REVIEW: 7
  } as const;

  const nextActionItem = nextActionCandidates
    .slice()
    .sort((left, right) => {
      const leftKey = `${left.systemStatus}_${left.reviewState}` as keyof typeof nextActionPriority;
      const rightKey = `${right.systemStatus}_${right.reviewState}` as keyof typeof nextActionPriority;
      const leftPriority = nextActionPriority[leftKey] ?? 99;
      const rightPriority = nextActionPriority[rightKey] ?? 99;
      return leftPriority - rightPriority || left.rowIndex - right.rowIndex;
    })[0] ?? null;

  const nextAction: WorkspaceHomeNextAction | null = nextActionItem
    ? {
        rowIndex: nextActionItem.rowIndex,
        totalCount: latestQuestionnaire?.totalCount ?? 0,
        questionText: nextActionItem.text,
        answerText: nextActionItem.answer?.trim() || null,
        citationSource: parseCitationDocNames(nextActionItem.citations)[0] ?? null,
        citationCount: parseCitationDocNames(nextActionItem.citations).length,
        systemStatus: nextActionItem.systemStatus,
        reviewState: nextActionItem.reviewState
      }
    : null;

  const homeState = resolveHomeState({
    workspaceSlug: params.workspaceSlug,
    evidenceCount,
    readyEvidenceCount,
    questionnaireCount,
    latestQuestionnaire
  });

  const stepStatuses = buildStepStatuses({
    evidenceCount,
    questionnaireCount,
    latestQuestionnaire
  });

  const approvalsLast7Days = recentApprovedItems.filter((item) => item.updatedAt >= sevenDaysAgo).length;
  const approvalsPrevious7Days = recentApprovedItems.filter(
    (item) => item.updatedAt < sevenDaysAgo && item.updatedAt >= fourteenDaysAgo
  ).length;
  const approvalsLast30Days = recentApprovedItems.filter((item) => item.updatedAt >= thirtyDaysAgo).length;
  const approvalsPrevious30Days = recentApprovedItems.filter(
    (item) => item.updatedAt < thirtyDaysAgo && item.updatedAt >= sixtyDaysAgo
  ).length;

  const insightState = buildInsightState({
    mode: homeState.mode,
    readyEvidenceCount,
    evidenceCount,
    approvedAnswersCount,
    processingEvidenceCount,
    staleApprovalsCount: staleApprovalRows.length,
    workspaceSlug: params.workspaceSlug,
    latestQuestionnaireId: latestQuestionnaire?.id ?? null,
    latestQuestionnaire,
    approvalSeriesLast7Days: buildDailySeries(
      recentApprovedItems.filter((item) => item.updatedAt >= sevenDaysAgo).map((item) => item.updatedAt),
      7,
      now
    ),
    approvalsLast7Days,
    approvalsPrevious7Days,
    approvalsLast30Days,
    approvalsPrevious30Days,
    answerMix: {
      groundedCount: answerMixCounts[0],
      reusedCount: answerMixCounts[1],
      insufficientCount: answerMixCounts[2],
      totalCount: latestQuestionnaire?.totalCount ?? 0
    },
    latestExportAge: formatRelativeAge(latestExportRecord?.createdAt ?? null, now),
    latestEvidenceRefreshAge: formatRelativeAge(latestReadyEvidence?.updatedAt ?? null, now)
  });

  const isFirstRun = evidenceCount === 0 && questionnaireCount === 0 && !latestQuestionnaire;

  return (
    <div className={`page-stack workspace-home-stack ${isFirstRun ? "workspace-home-stack-first-run" : ""}`}>
      <WorkspaceHomeStage
        approvedAnswersCount={approvedAnswersCount}
        ctaHref={homeState.ctaHref}
        ctaLabel={homeState.ctaLabel}
        description={homeState.description}
        evidenceCount={evidenceCount}
        exportCount={exportCount}
        insightState={insightState}
        kicker={homeState.kicker}
        latestQuestionnaire={latestQuestionnaire}
        mode={homeState.mode}
        nextAction={nextAction}
        readyEvidenceCount={readyEvidenceCount}
        secondaryHref={homeState.secondaryHref}
        secondaryLabel={homeState.secondaryLabel}
        stepStatuses={stepStatuses}
        title={homeState.title}
        workspaceSlug={params.workspaceSlug}
      />
    </div>
  );
}
