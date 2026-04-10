export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default async function EvidencePage({ params }: { params: { workspaceSlug: string } }) {
  redirect(`/w/${params.workspaceSlug}/library?tab=evidence`);
}
