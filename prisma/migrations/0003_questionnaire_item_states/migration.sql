CREATE TYPE "QuestionSystemStatus" AS ENUM ('PENDING', 'READY', 'PARTIAL', 'BLOCKED');
CREATE TYPE "QuestionReviewState" AS ENUM ('UNREVIEWED', 'NEEDS_REVIEW', 'APPROVED');

ALTER TABLE "QuestionnaireItem"
ADD COLUMN "systemStatus" "QuestionSystemStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewState" "QuestionReviewState" NOT NULL DEFAULT 'UNREVIEWED';

UPDATE "QuestionnaireItem"
SET
  "systemStatus" = CASE
    WHEN "notFoundReason" IS NOT NULL THEN 'BLOCKED'::"QuestionSystemStatus"
    WHEN COALESCE("answer", '') LIKE 'Partial answer:%' THEN 'PARTIAL'::"QuestionSystemStatus"
    WHEN COALESCE(jsonb_array_length("citations"::jsonb), 0) > 0 AND COALESCE("answer", '') <> '' THEN 'READY'::"QuestionSystemStatus"
    ELSE 'PENDING'::"QuestionSystemStatus"
  END,
  "reviewState" = CASE
    WHEN "reviewStatus" = 'APPROVED' THEN 'APPROVED'::"QuestionReviewState"
    WHEN "reviewStatus" = 'NEEDS_REVIEW' THEN 'NEEDS_REVIEW'::"QuestionReviewState"
    ELSE 'UNREVIEWED'::"QuestionReviewState"
  END;

CREATE INDEX "QuestionnaireItem_questionnaireId_systemStatus_idx" ON "QuestionnaireItem"("questionnaireId", "systemStatus");
CREATE INDEX "QuestionnaireItem_questionnaireId_reviewState_idx" ON "QuestionnaireItem"("questionnaireId", "reviewState");
