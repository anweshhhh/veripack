UPDATE "Questionnaire"
SET "evidenceScopeDocumentIds" = ARRAY[]::TEXT[]
WHERE "evidenceScopeMode" = 'ALL_READY'::"EvidenceScopeMode";
