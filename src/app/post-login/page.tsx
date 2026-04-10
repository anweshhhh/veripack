export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth";

export default async function PostLoginPage() {
  const currentUser = await requireCurrentUser();
  redirect(`/w/${currentUser.access.workspace.slug}`);
}
