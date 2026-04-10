export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default async function QuestionnairesPage({ params }: { params: { workspaceSlug: string } }) {
  redirect(`/w/${params.workspaceSlug}/library?tab=questionnaires`);
}
