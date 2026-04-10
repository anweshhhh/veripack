import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getQuestionnairePageData, runAutofillBatch } from "@/lib/questionnaires";
import { toApiErrorResponse } from "@/lib/api-response";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await requireApiUser();
    const payload = (await request.json()) as { workspaceSlug?: string; batchSize?: number };
    const workspaceSlug = payload.workspaceSlug?.trim() || "";

    const batch = await runAutofillBatch({
      userId: currentUser.user.id,
      workspaceSlug,
      questionnaireId: params.id,
      batchSize: payload.batchSize
    });

    const data = await getQuestionnairePageData(currentUser.user.id, workspaceSlug, params.id);
    return NextResponse.json({
      questionnaire: data.questionnaire,
      items: data.items,
      processedCount: batch.processedCount,
      nextCursor: batch.nextCursor,
      done: batch.done
    });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to run autofill.");
  }
}
