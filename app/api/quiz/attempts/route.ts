import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const quizId = searchParams.get("quizId");
    const articleId = searchParams.get("articleId");

    const where: any = {};
    if (userId) where.userId = userId;
    if (quizId) where.quizId = quizId;
    if (articleId) {
      where.quiz = { articleId };
    }

    const attempts = await prisma.quizAttempt.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            department: true,
            role: true,
          },
        },
        quiz: {
          select: {
            id: true,
            title: true,
            isExam: true,
            durationMinutes: true,
            passScorePercent: true,
            article: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = attempts.map((a) => ({
      id: a.id,
      userId: a.userId,
      userFullName: a.user?.fullName || "Member",
      userEmail: a.user?.email || "",
      userAvatarUrl: a.user?.avatarUrl || undefined,
      userDepartment: a.user?.department || "",
      quizId: a.quizId,
      quizTitle: a.quiz?.title || a.quiz?.article?.title || "Quiz Assessment",
      articleId: a.quiz?.article?.id || a.quizId,
      articleTitle: a.quiz?.article?.title || "Lesson Article",
      articleSlug: a.quiz?.article?.slug || "",
      scorePercent: a.scorePercent,
      isPassed: a.isPassed,
      timeSpentSec: a.timeSpentSec ?? undefined,
      status: a.status || "COMPLETED",
      answers: a.answers,
      feedback: a.feedback || undefined,
      gradedBy: a.gradedBy || undefined,
      gradedAt: a.gradedAt ? a.gradedAt.toISOString() : undefined,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, attempts: formatted });
  } catch (error: any) {
    console.error("Error fetching quiz attempts:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { attemptId, scorePercent, feedback, gradedBy } = body;

    if (!attemptId) {
      return NextResponse.json(
        { success: false, error: "Missing submission ID" },
        { status: 400 }
      );
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            article: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { success: false, error: "Quiz submission not found" },
        { status: 404 }
      );
    }

    const requiredScore =
      attempt.quiz.passScorePercent ??
      attempt.quiz.article?.passScorePercent ??
      80;
    const isPassed = Number(scorePercent) >= requiredScore;

    const updated = await prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        scorePercent: Number(scorePercent),
        isPassed,
        feedback: feedback || null,
        gradedBy: gradedBy || "Tech Board Evaluator",
        gradedAt: new Date(),
        status: "GRADED",
      },
    });

    // Also update UserProgress highest score if needed
    if (attempt.quiz.articleId) {
      const existingProg = await prisma.userProgress.findUnique({
        where: {
          userId_articleId: {
            userId: attempt.userId,
            articleId: attempt.quiz.articleId,
          },
        },
      });

      const newHighest = Math.max(
        existingProg?.highestQuizScore ?? 0,
        Number(scorePercent)
      );
      const isCompleted = isPassed && Boolean(existingProg?.hasScrolledBottom);

      await prisma.userProgress.upsert({
        where: {
          userId_articleId: {
            userId: attempt.userId,
            articleId: attempt.quiz.articleId,
          },
        },
        update: {
          highestQuizScore: newHighest,
          isCompleted: isCompleted || existingProg?.isCompleted || false,
          completedAt:
            isCompleted && !existingProg?.completedAt
              ? new Date()
              : existingProg?.completedAt,
        },
        create: {
          userId: attempt.userId,
          articleId: attempt.quiz.articleId,
          highestQuizScore: Number(scorePercent),
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      });
    }

    return NextResponse.json({ success: true, attempt: updated });
  } catch (error: any) {
    console.error("Error updating quiz grade:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing submission ID to delete" },
        { status: 400 }
      );
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id },
      include: {
        quiz: {
          select: {
            id: true,
            articleId: true,
            passScorePercent: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { success: false, error: "Quiz submission not found" },
        { status: 404 }
      );
    }

    // Delete the attempt record
    await prisma.quizAttempt.delete({
      where: { id },
    });

    // Recalculate user progress highest quiz score if articleId exists
    if (attempt.quiz?.articleId) {
      const remainingAttempts = await prisma.quizAttempt.findMany({
        where: {
          userId: attempt.userId,
          quizId: attempt.quizId,
        },
        orderBy: { scorePercent: "desc" },
      });

      const newHighest = remainingAttempts[0]?.scorePercent ?? 0;
      const requiredScore = attempt.quiz.passScorePercent ?? 80;
      const isPassed = newHighest >= requiredScore;

      await prisma.userProgress.updateMany({
        where: {
          userId: attempt.userId,
          articleId: attempt.quiz.articleId,
        },
        data: {
          highestQuizScore: newHighest,
          isCompleted: isPassed,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Submission deleted successfully." });
  } catch (error: any) {
    console.error("Error deleting quiz attempt:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

