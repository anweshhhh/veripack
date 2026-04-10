export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default async function QuestionnaireDetailPage({
  params
}: {
  params: { workspaceSlug: string; questionnaireId: string };
}) {
  redirect(`/w/${params.workspaceSlug}/review?questionnaireId=${encodeURIComponent(params.questionnaireId)}`);
}
