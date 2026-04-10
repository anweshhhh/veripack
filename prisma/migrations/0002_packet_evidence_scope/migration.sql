CREATE TYPE "EvidenceScopeMode" AS ENUM ('ALL_READY', 'SELECTED_DOCUMENTS');

ALTER TABLE "Questionnaire"
ADD COLUMN "evidenceScopeMode" "EvidenceScopeMode" NOT NULL DEFAULT 'ALL_READY',
ADD COLUMN "evidenceScopeDocumentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Questionnaire" q
SET "evidenceScopeDocumentIds" = COALESCE(
  (
    SELECT array_agg(ed."id" ORDER BY ed."createdAt" ASC)
    FROM "EvidenceDocument" ed
    WHERE ed."workspaceId" = q."workspaceId"
      AND ed."status" = 'READY'
      AND ed."archivedAt" IS NULL
  ),
  ARRAY[]::TEXT[]
);
