import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function buildQuestionTextMetadata(value) {
  const normalizedQuestionText = value
    .normalize("NFKC")
    .replace(/[‐‑‒–—―−]/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9./\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    normalizedQuestionText,
    questionTextHash: sha256(normalizedQuestionText)
  };
}

const evidenceTemplates = [
  {
    name: "signal-demo-soc2-controls.md",
    content: `
Access reviews are performed quarterly for all production systems.
Backups for critical databases run every day and recovery tests run monthly.
Vendors handling sensitive data are reviewed annually and monitored for material changes.
Encryption at rest is enforced across managed databases and object storage.
Incident response owners are on call at all times and tabletop exercises run twice a year.
`
  },
  {
    name: "signal-demo-vendor-security.md",
    content: `
Third-party vendors are classified by risk and critical vendors are reassessed every year.
Security questionnaires are collected before onboarding and renewed for high-risk vendors.
Material changes in vendor posture trigger out-of-cycle review.
`
  },
  {
    name: "signal-demo-business-continuity.md",
    content: `
Business continuity planning is reviewed annually.
Disaster recovery exercises are completed twice a year.
Recovery point and recovery time objectives are documented for critical services.
`
  },
  {
    name: "signal-demo-privacy-policy.md",
    content: `
Customer data retention schedules are documented and reviewed every year.
Deletion requests are processed through a defined workflow with audit logging.
Access to regulated data is limited by role and reviewed quarterly.
`
  },
  {
    name: "signal-demo-engineering-handbook.md",
    content: `
Changes to production systems require peer review and tracked approvals.
Security patches for critical systems are prioritized within seven days.
Infrastructure changes are logged and deployment history is retained.
`
  },
  {
    name: "signal-demo-incident-postmortems.md",
    content: `
Post-incident reviews capture root cause, remediation steps, and ownership.
Follow-up actions are tracked to completion and reviewed in weekly operations meetings.
`
  }
];

const questionTemplates = [
  "Do you perform backups of critical databases? How often?",
  "How frequently are user access reviews completed for production systems?",
  "What is your cadence for critical vendor reassessment?",
  "Do you encrypt data at rest across managed storage systems?",
  "How often are disaster recovery exercises performed?",
  "How are deletion requests handled and audited?",
  "What is your incident response testing cadence?",
  "Are security patches for critical systems prioritized within a defined SLA?",
  "How are production changes reviewed before deployment?",
  "Do you maintain documented recovery objectives for critical services?",
  "How often is the business continuity plan reviewed?",
  "How are post-incident follow-up actions tracked?"
];

function buildCitation(chunk, docName, quotedSnippet) {
  return {
    chunkId: chunk.id,
    docName,
    quotedSnippet
  };
}

async function resolveTargetWorkspace() {
  const requestedSlug = process.argv[2];

  if (requestedSlug) {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: requestedSlug }
    });

    if (!workspace) {
      throw new Error(`Workspace not found for slug "${requestedSlug}"`);
    }

    return workspace;
  }

  const primaryUser = await prisma.user.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      lastUsedWorkspaceId: true
    }
  });

  if (!primaryUser?.lastUsedWorkspaceId) {
    throw new Error("Could not resolve a last-used workspace. Pass a workspace slug to the script.");
  }

  return prisma.workspace.findUniqueOrThrow({
    where: { id: primaryUser.lastUsedWorkspaceId }
  });
}

async function ensureOwnerUser(workspaceId) {
  const membership = await prisma.membership.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: { userId: true }
  });

  if (!membership) {
    throw new Error("Workspace has no members to attribute sample data to.");
  }

  return membership.userId;
}

async function createEvidence(workspaceId, userId) {
  const created = [];

  for (let index = 0; index < evidenceTemplates.length; index += 1) {
    const template = evidenceTemplates[index];
    const bytes = Buffer.from(template.content.trim(), "utf8");
    const evidenceFingerprint = sha256(bytes);
    const document = await prisma.evidenceDocument.create({
      data: {
        workspaceId,
        name: template.name,
        originalName: template.name,
        mimeType: "text/markdown",
        storagePath: `sample://${template.name}`,
        byteSize: bytes.byteLength,
        status: "READY",
        uploadedByUserId: userId,
        evidenceFingerprint,
        chunkCount: 2,
        createdAt: daysAgo(14 - index),
        updatedAt: daysAgo(index === 0 ? 2 : 6 - Math.min(index, 5))
      }
    });

    const paragraphs = template.content
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const chunks = [];
    for (let chunkIndex = 0; chunkIndex < Math.min(paragraphs.length, 2); chunkIndex += 1) {
      const chunk = await prisma.evidenceChunk.create({
        data: {
          documentId: document.id,
          chunkIndex,
          content: paragraphs[chunkIndex],
          evidenceFingerprint
        }
      });
      chunks.push(chunk);
    }

    created.push({ document, chunks });
  }

  return created;
}

async function createQuestionnaire(params) {
  const {
    workspaceId,
    userId,
    name,
    daysOffset,
    evidence,
    statusPattern,
    exportDaysAgo,
    staleOne = false
  } = params;

  const questionnaire = await prisma.questionnaire.create({
    data: {
      workspaceId,
      name,
      sourceFileName: `${name}.csv`,
      questionColumn: "Question",
      originalHeaders: ["Question"],
      evidenceScopeMode: "ALL_READY",
      evidenceScopeDocumentIds: evidence.map((entry) => entry.document.id),
      totalCount: questionTemplates.length,
      createdByUserId: userId,
      autofillStatus: "COMPLETED",
      autofillCursor: questionTemplates.length,
      lastAutofilledAt: daysAgo(daysOffset)
    }
  });

  const createdItems = [];
  const approvedItems = [];

  for (let index = 0; index < questionTemplates.length; index += 1) {
    const template = statusPattern[index % statusPattern.length];
    const evidenceEntry = evidence[index % evidence.length];
    const chunk = evidenceEntry.chunks[index % evidenceEntry.chunks.length];
    const citations =
      template.systemStatus === "BLOCKED"
        ? []
        : [buildCitation(chunk, evidenceEntry.document.name, chunk.content.slice(0, 180))];

    const answer =
      template.systemStatus === "BLOCKED"
        ? null
        : template.reused
          ? `Reused control language confirms: ${chunk.content}`
          : `Grounded response: ${chunk.content}`;

    const item = await prisma.questionnaireItem.create({
      data: {
        questionnaireId: questionnaire.id,
        rowIndex: index,
        sourceRow: { Question: questionTemplates[index] },
        text: questionTemplates[index],
        answer,
        citations,
        systemStatus: template.systemStatus,
        reviewState: template.reviewState,
        reviewStatus: template.reviewState === "APPROVED" ? "APPROVED" : template.reviewState === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : "DRAFT",
        draftSuggestionApplied: template.systemStatus !== "BLOCKED",
        reusedFromApprovedAnswerId: null,
        reuseMatchType: template.reused ? "EXACT" : null,
        notFoundReason: template.systemStatus === "BLOCKED" ? "NO_RELEVANT_EVIDENCE" : null,
        createdAt: daysAgo(daysOffset + 1),
        updatedAt: daysAgo(daysOffset - Math.min(index, 6))
      }
    });

    createdItems.push({ item, evidenceEntry, chunk, template });
    if (template.reviewState === "APPROVED" && answer) {
      approvedItems.push({ item, evidenceEntry, chunk });
    }
  }

  for (let index = 0; index < approvedItems.length; index += 1) {
    const { item, evidenceEntry, chunk } = approvedItems[index];
    const { normalizedQuestionText, questionTextHash } = buildQuestionTextMetadata(item.text);
    const approvedAnswer = await prisma.approvedAnswer.create({
      data: {
        workspaceId,
        sourceQuestionId: item.id,
        questionText: item.text,
        normalizedQuestionText,
        questionTextHash,
        answerText: item.answer,
        citationChunkIds: [chunk.id],
        createdByUserId: userId,
        createdAt: daysAgo(daysOffset - Math.min(index, 10)),
        updatedAt: daysAgo(daysOffset - Math.min(index, 10))
      }
    });

    await prisma.approvedAnswerEvidence.create({
      data: {
        approvedAnswerId: approvedAnswer.id,
        chunkId: chunk.id,
        fingerprintAtApproval: staleOne && index === 0 ? `stale-${chunk.evidenceFingerprint}` : chunk.evidenceFingerprint,
        createdAt: daysAgo(daysOffset - Math.min(index, 10))
      }
    });
  }

  if (exportDaysAgo !== null) {
    await prisma.exportRecord.create({
      data: {
        questionnaireId: questionnaire.id,
        format: "csv",
        fileName: `${name}-attestly-export.csv`,
        createdByUserId: userId,
        createdAt: daysAgo(exportDaysAgo)
      }
    });
  }

  const approvedCount = createdItems.filter(({ template }) => template.reviewState === "APPROVED").length;
  const needsReviewCount = createdItems.filter(({ template }) => template.reviewState === "NEEDS_REVIEW").length;
  const answeredCount = createdItems.filter(({ item }) => Boolean(item.answer)).length;

  await prisma.questionnaire.update({
    where: { id: questionnaire.id },
    data: {
      answeredCount,
      approvedCount,
      needsReviewCount,
      updatedAt: daysAgo(daysOffset)
    }
  });
}

async function clearPreviousSamples(workspaceId) {
  const sampleDocs = await prisma.evidenceDocument.findMany({
    where: {
      workspaceId,
      storagePath: {
        startsWith: "sample://"
      }
    },
    select: { id: true }
  });

  const sampleQuestionnaires = await prisma.questionnaire.findMany({
    where: {
      workspaceId,
      sourceFileName: {
        startsWith: "signal-demo-"
      }
    },
    select: { id: true }
  });

  const questionnaireIds = sampleQuestionnaires.map((q) => q.id);

  if (questionnaireIds.length > 0) {
    await prisma.exportRecord.deleteMany({ where: { questionnaireId: { in: questionnaireIds } } });

    const questionnaireItems = await prisma.questionnaireItem.findMany({
      where: { questionnaireId: { in: questionnaireIds } },
      select: { id: true }
    });
    const questionIds = questionnaireItems.map((item) => item.id);

    if (questionIds.length > 0) {
      const approvedAnswers = await prisma.approvedAnswer.findMany({
        where: { sourceQuestionId: { in: questionIds } },
        select: { id: true }
      });
      const approvedAnswerIds = approvedAnswers.map((entry) => entry.id);

      if (approvedAnswerIds.length > 0) {
        await prisma.approvedAnswerEvidence.deleteMany({ where: { approvedAnswerId: { in: approvedAnswerIds } } });
      }

      await prisma.approvedAnswer.deleteMany({ where: { sourceQuestionId: { in: questionIds } } });
      await prisma.questionnaireItem.deleteMany({ where: { id: { in: questionIds } } });
    }

    await prisma.questionnaire.deleteMany({ where: { id: { in: questionnaireIds } } });
  }

  const docIds = sampleDocs.map((doc) => doc.id);
  if (docIds.length > 0) {
    await prisma.evidenceChunk.deleteMany({ where: { documentId: { in: docIds } } });
    await prisma.evidenceDocument.deleteMany({ where: { id: { in: docIds } } });
  }
}

async function main() {
  const workspace = await resolveTargetWorkspace();
  const userId = await ensureOwnerUser(workspace.id);

  await clearPreviousSamples(workspace.id);

  const evidence = await createEvidence(workspace.id, userId);

  const reviewPattern = [
    { systemStatus: "READY", reviewState: "UNREVIEWED", reused: false },
    { systemStatus: "PARTIAL", reviewState: "NEEDS_REVIEW", reused: false },
    { systemStatus: "READY", reviewState: "APPROVED", reused: false },
    { systemStatus: "READY", reviewState: "APPROVED", reused: true },
    { systemStatus: "BLOCKED", reviewState: "NEEDS_REVIEW", reused: false },
    { systemStatus: "PENDING", reviewState: "UNREVIEWED", reused: false }
  ];

  const exportPattern = [
    { systemStatus: "READY", reviewState: "APPROVED", reused: false },
    { systemStatus: "READY", reviewState: "APPROVED", reused: true },
    { systemStatus: "PARTIAL", reviewState: "NEEDS_REVIEW", reused: false },
    { systemStatus: "READY", reviewState: "APPROVED", reused: false }
  ];

  await createQuestionnaire({
    workspaceId: workspace.id,
    userId,
    name: "signal-demo-security-packet-q2",
    daysOffset: 3,
    evidence,
    statusPattern: reviewPattern,
    exportDaysAgo: null,
    staleOne: true
  });

  await createQuestionnaire({
    workspaceId: workspace.id,
    userId,
    name: "signal-demo-vendor-packet-q1",
    daysOffset: 12,
    evidence,
    statusPattern: exportPattern,
    exportDaysAgo: 4,
    staleOne: false
  });

  await createQuestionnaire({
    workspaceId: workspace.id,
    userId,
    name: "signal-demo-privacy-packet-q4",
    daysOffset: 28,
    evidence,
    statusPattern: exportPattern,
    exportDaysAgo: 16,
    staleOne: false
  });

  console.log(`Seeded home sample data into workspace "${workspace.slug}"`);
  console.log("Created 6 sample evidence docs and 3 sample packets with mixed states.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
