UPDATE "QuestionnaireItem"
SET "answer" = NULL
WHERE
  COALESCE("answer", '') = 'Not enough evidence was found to support a grounded answer.'
  AND (
    "systemStatus" = 'BLOCKED'::"QuestionSystemStatus"
    OR "notFoundReason" IS NOT NULL
  );
