import { NextResponse } from "next/server";
import { QuestionReviewState } from "@prisma/client";
import { requireApiUser } from "@/lib/auth";
import { getQuestionnairePageData, reviewQuestionnaireItem } from "@/lib/questionnaires";
import { toApiErrorResponse } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const currentUser = await requireApiUser();
    const payload = (await request.json()) as {
      workspaceSlug?: string;
      answer?: string;
      reviewState?: string;
    };

    const reviewState =
      payload.reviewState === QuestionReviewState.APPROVED
        ? QuestionReviewState.APPROVED
        : QuestionReviewState.NEEDS_REVIEW;

    await reviewQuestionnaireItem({
      userId: currentUser.user.id,
      workspaceSlug: payload.workspaceSlug?.trim() || "",
      questionnaireId: params.id,
      itemId: params.itemId,
      answer: payload.answer ?? "",
      reviewState
    });

    const data = await getQuestionnairePageData(
      currentUser.user.id,
      payload.workspaceSlug?.trim() || "",
      params.id
    );

    return NextResponse.json({
      questionnaire: data.questionnaire,
      items: data.items
    });
  } catch (error) {
    return toApiErrorResponse(error, "Failed to review questionnaire item.");
  }
}
