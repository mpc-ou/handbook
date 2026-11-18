import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireStaff, requireUser } from "@/lib/authz";
import { apiError } from "@/lib/api-errors";
import { fireAndForget, notifyAssignmentGraded, notifyIfCourseCompleted } from "@/lib/notifications";

const attemptInclude = {
  user: {
    select: { id: true, fullName: true, email: true, avatarUrl: true, department: true, role: true },
  },
  quiz: {
    select: {
      id: true,
      title: true,
      isExam: true,
      durationMinutes: true,
      passScorePercent: true,
      item: {
        select: {
          id: true,
          title: true,
          slug: true,
          passScorePercent: true,
          lesson: { select: { slug: true, course: { select: { slug: true } } } },
        },
      },
    },
  },
} satisfies Prisma.QuizAttemptInclude;

const bad = apiError;

/** Thành viên chỉ xem được lượt làm của chính mình; ADMIN/EDITOR xem tất cả. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const isStaff = user.role !== "MEMBER";

    const where: Prisma.QuizAttemptWhereInput = {
      userId: isStaff ? (searchParams.get("userId") ?? undefined) : user.id,
    };
    const quizId = searchParams.get("quizId");
    const itemId = searchParams.get("itemId");
    if (quizId) where.quizId = quizId;
    if (itemId) where.quiz = { itemId };

    const attempts = await prisma.quizAttempt.findMany({
      where,
      include: attemptInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      attempts: attempts.map((a) => ({
        id: a.id,
        userId: a.userId,
        userFullName: a.user?.fullName || "Member",
        userEmail: a.user?.email || "",
        userAvatarUrl: a.user?.avatarUrl || undefined,
        userDepartment: a.user?.department || "",
        quizId: a.quizId,
        quizTitle: a.quiz.title || a.quiz.item?.title || "Bài kiểm tra",
        itemId: a.quiz.item?.id || a.quizId,
        itemTitle: a.quiz.item?.title || "Chương/bài tập",
        itemSlug: a.quiz.item?.slug || "",
        lessonSlug: a.quiz.item?.lesson.slug || "",
        courseSlug: a.quiz.item?.lesson.course.slug || "",
        scorePercent: a.scorePercent,
        isPassed: a.isPassed,
        timeSpentSec: a.timeSpentSec ?? undefined,
        status: a.status,
        answers: a.answers,
        feedback: a.feedback || undefined,
        gradedBy: a.gradedBy || undefined,
        gradedAt: a.gradedAt ? a.gradedAt.toISOString() : undefined,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Chấm tay bài tự luận/nộp file — chỉ ADMIN/EDITOR; người chấm lấy từ session. */
export async function PUT(req: NextRequest) {
  try {
    const grader = await requireStaff();
    const { attemptId, scorePercent, feedback } = await req.json();
    if (!attemptId) return bad("missingAttemptId");
    const score = Number(scorePercent);
    if (!Number.isFinite(score) || score < 0 || score > 100) return bad("scoreRange");

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { item: { select: { passScorePercent: true } } } } },
    });
    if (!attempt) return bad("attemptNotFound", 404);

    const requiredScore = attempt.quiz.item?.passScorePercent ?? attempt.quiz.passScorePercent ?? 80;
    const isPassed = score >= requiredScore;

    const updated = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        scorePercent: score,
        isPassed,
        feedback: feedback || null,
        gradedBy: grader.fullName,
        gradedAt: new Date(),
        status: "GRADED",
      },
    });

    const itemId = attempt.quiz.itemId;
    if (itemId && attempt.quiz.item) {
      const existing = await prisma.userProgress.findUnique({
        where: { userId_itemId: { userId: attempt.userId, itemId } },
      });
      const highest = Math.max(existing?.highestQuizScore ?? 0, score);
      const completedNow = isPassed;

      await prisma.userProgress.upsert({
        where: { userId_itemId: { userId: attempt.userId, itemId } },
        update: {
          highestQuizScore: highest,
          isCompleted: completedNow || existing?.isCompleted || false,
          completedAt: completedNow ? (existing?.completedAt ?? new Date()) : existing?.completedAt,
        },
        create: {
          userId: attempt.userId,
          itemId,
          highestQuizScore: score,
          isCompleted: completedNow,
          completedAt: completedNow ? new Date() : null,
        },
      });

      if (completedNow && !existing?.isCompleted) fireAndForget(notifyIfCourseCompleted(attempt.userId, itemId));
      fireAndForget(notifyAssignmentGraded({ learnerId: attempt.userId, itemId, grader, score }));
    }

    return NextResponse.json({ success: true, attempt: { ...updated, createdAt: updated.createdAt.toISOString(), gradedAt: updated.gradedAt?.toISOString() } });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Xóa lượt làm bài và tính lại điểm cao nhất — chỉ ADMIN/EDITOR. */
export async function DELETE(req: NextRequest) {
  try {
    await requireStaff();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return bad("missingAttemptId");

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id },
      include: { quiz: { select: { itemId: true, passScorePercent: true, item: { select: { passScorePercent: true } } } } },
    });
    if (!attempt) return bad("attemptNotFound", 404);

    await prisma.quizAttempt.delete({ where: { id } });

    if (attempt.quiz.itemId) {
      const best = await prisma.quizAttempt.findFirst({
        where: { userId: attempt.userId, quizId: attempt.quizId },
        orderBy: { scorePercent: "desc" },
        select: { scorePercent: true },
      });
      const highest = best?.scorePercent ?? 0;
      const requiredScore = attempt.quiz.item?.passScorePercent ?? attempt.quiz.passScorePercent ?? 80;

      await prisma.userProgress.updateMany({
        where: { userId: attempt.userId, itemId: attempt.quiz.itemId },
        data: { highestQuizScore: highest, isCompleted: highest >= requiredScore },
      });
    }

    return NextResponse.json({ success: true, message: "Đã xóa bài nộp." });
  } catch (error) {
    return handleApiError(error);
  }
}
