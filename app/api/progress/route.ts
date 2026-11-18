import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireUser } from "@/lib/authz";
import { apiError } from "@/lib/api-errors";
import { fireAndForget, notifyIfCourseCompleted } from "@/lib/notifications";

/**
 * Cập nhật tiến độ của người dùng hiện tại trên một Item.
 * userId lấy từ session; `isCompleted` do client gửi bị bỏ qua — hoàn thành được
 * tính ở server từ điều kiện cuộn hết bài + điểm quiz.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { itemId, hasScrolledBottom, highestQuizScore } = await req.json();
    if (!itemId) {
      return apiError("missingItemRef");
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: {
        type: true,
        passScorePercent: true,
        requireScrollToBottom: true,
        quiz: { select: { passScorePercent: true } },
      },
    });
    if (!item) {
      return apiError("itemNotFound", 404);
    }

    const existing = await prisma.userProgress.findUnique({
      where: { userId_itemId: { userId: user.id, itemId } },
    });

    const scrolled = hasScrolledBottom ?? existing?.hasScrolledBottom ?? false;
    const currentHighest = existing?.highestQuizScore ?? 0;
    const highest =
      typeof highestQuizScore === "number" ? Math.max(currentHighest, highestQuizScore) : currentHighest;

    // Điểm bắt buộc: cấu hình trên Item, hoặc theo Quiz với bài tập/kiểm tra
    const requiredScore =
      item.passScorePercent ?? (item.type === "CONTENT" ? 0 : (item.quiz?.passScorePercent ?? 0));
    const quizPassed = requiredScore <= 0 || highest >= requiredScore;
    // Item thuần quiz không có nội dung để cuộn
    const scrollOk = item.type !== "CONTENT" || !item.requireScrollToBottom || scrolled;
    const completed = Boolean(existing?.isCompleted) || (scrollOk && quizPassed);

    const progress = await prisma.userProgress.upsert({
      where: { userId_itemId: { userId: user.id, itemId } },
      update: {
        hasScrolledBottom: scrolled,
        highestQuizScore: highest,
        isCompleted: completed,
        completedAt: completed ? (existing?.completedAt ?? new Date()) : null,
        lastAccessedAt: new Date(),
      },
      create: {
        userId: user.id,
        itemId,
        hasScrolledBottom: scrolled,
        highestQuizScore: highest,
        isCompleted: completed,
        completedAt: completed ? new Date() : null,
      },
    });

    // Vừa hoàn thành lần đầu → có thể là chương cuối của khóa học
    if (completed && !existing?.isCompleted) fireAndForget(notifyIfCourseCompleted(user.id, itemId));

    return NextResponse.json({
      success: true,
      progress: {
        ...progress,
        completedAt: progress.completedAt?.toISOString() ?? null,
        lastAccessedAt: progress.lastAccessedAt.toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
