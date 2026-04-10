import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { toApiErrorResponse } from "@/lib/api-response";
import { deleteEvidenceDocument } from "@/lib/evidence";

export async function DELETE(request: Request, { params }: { params: { documentId: string } }) {
  try {
    const workspaceSlug = new URL(request.url).searchParams.get("workspaceSlug")?.trim() || "";
    const currentUser = await requireApiUser();
    const result = await deleteEvidenceDocument({
      userId: currentUser.user.id,
      workspaceSlug,
      documentId: params.documentId
    });

    return NextResponse.json(result);
  } catch (error) {
    return toApiErrorResponse(error, "Failed to delete evidence.");
  }
}
