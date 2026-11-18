import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { apiError } from "@/lib/api-errors";
import { fireAndForget, notifyAssignmentSubmitted, notifyIfCourseCompleted } from "@/lib/notifications";
import { QuizGradeResponse, QuizQuestion } from "@/types";

const fail = apiError;

/**
 * Chấm bài của một Item (QUIZ/ASSIGNMENT hoặc CONTENT có quiz).
 * Câu hỏi, đáp án và điểm đạt luôn lấy từ DB; người dùng lấy từ session.
 * Khách (chưa đăng nhập) vẫn được chấm nhưng không lưu lượt làm bài/tiến độ.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      itemId,
      userAnswers,
      timeSpentSec,
    }: {
      itemId: string;
      userAnswers: Record<string, string[]>;
      timeSpentSec?: number;
    } = body;

    if (!itemId || !userAnswers || typeof userAnswers !== "object") {
      return fail("quizInvalidSubmission", 400);
    }

    const quiz = await prisma.quiz.findUnique({
      where: { itemId },
      include: {
        item: { select: { type: true, passScorePercent: true, requireScrollToBottom: true } },
      },
    });
    const questions = (quiz?.questions as unknown as QuizQuestion[]) ?? [];
    if (!quiz || questions.length === 0 || quiz.item?.type === "CONTENT") {
      return fail("quizMissing", 400);
    }

    const user = await requireUser().catch(() => null);

    if (user && quiz.maxAttempts && quiz.maxAttempts > 0) {
      const priorCount = await prisma.quizAttempt.count({
        where: { quizId: quiz.id, userId: user.id },
      });
      if (priorCount >= quiz.maxAttempts) {
        return fail("quizNoAttemptsLeft", 403, { max: quiz.maxAttempts });
      }
    }

    let correctCount = 0;
    const feedback: QuizGradeResponse["feedback"] = {};

    for (const q of questions) {
      const submitted = userAnswers[q.id] || [];
      let isCorrect = false;

      if (q.type === "fill_blank") {
        const submittedText = (submitted[0] || "").trim().toLowerCase();
        const acceptable = (q.correctTextAnswer || "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        isCorrect =
          acceptable.length === 0
            ? submittedText.length > 0
            : acceptable.some((ans) => ans === submittedText || submittedText.includes(ans));
      } else if (q.type === "essay" || q.type === "scale" || q.type === "file_upload" || q.type === "code_submission") {
        // Các dạng này chỉ cần có câu trả lời; essay/file chờ chấm tay
        isCorrect = (submitted[0] || "").trim().length > 0;
      } else if (q.type === "single" || !q.type) {
        const expectedId = q.correctOptionIds?.[0];
        isCorrect = Boolean(expectedId && submitted[0] && expectedId === submitted[0]);
      } else {
        const subSorted = [...submitted].sort();
        const expSorted = [...(q.correctOptionIds || [])].sort();
        isCorrect =
          subSorted.length > 0 &&
          subSorted.length === expSorted.length &&
          subSorted.every((val, idx) => val === expSorted[idx]);
      }

      if (isCorrect) correctCount++;
      feedback[q.id] = {
        isCorrect,
        explanation: q.explanation,
        correctOptionIds: q.correctOptionIds || [],
      };
    }

    const scorePercent = Math.round((correctCount / questions.length) * 100);
    const requiredScore = quiz.item?.passScorePercent ?? quiz.passScorePercent ?? 80;
    const isPassed = scorePercent >= requiredScore;
    const requiresReview = questions.some((q) => q.type === "essay" || q.type === "file_upload");

    if (user) {
      try {
        await prisma.quizAttempt.create({
          data: {
            userId: user.id,
            quizId: quiz.id,
            scorePercent,
            answers: userAnswers as Prisma.InputJsonValue,
            isPassed,
            timeSpentSec: timeSpentSec ? Number(timeSpentSec) : null,
            status: requiresReview ? "PENDING_REVIEW" : "COMPLETED",
          },
        });

        const existing = await prisma.userProgress.findUnique({
          where: { userId_itemId: { userId: user.id, itemId } },
        });
        const highest = Math.max(existing?.highestQuizScore ?? 0, scorePercent);
        // Quiz/bài tập là item riêng, không có yêu cầu cuộn đọc: đạt điểm là hoàn thành
        const completedNow = isPassed;

        await prisma.userProgress.upsert({
          where: { userId_itemId: { userId: user.id, itemId } },
          update: {
            highestQuizScore: highest,
            isCompleted: completedNow || existing?.isCompleted || false,
            completedAt: completedNow ? (existing?.completedAt ?? new Date()) : existing?.completedAt,
            lastAccessedAt: new Date(),
          },
          create: {
            userId: user.id,
            itemId,
            highestQuizScore: scorePercent,
            isCompleted: completedNow,
            completedAt: completedNow ? new Date() : null,
          },
        });

        if (completedNow && !existing?.isCompleted) fireAndForget(notifyIfCourseCompleted(user.id, itemId));
        if (requiresReview) fireAndForget(notifyAssignmentSubmitted(user.id, itemId));
      } catch (err) {
        console.error("Không lưu được lượt làm bài:", err);
        return fail("quizSaveFailed", 500);
      }
    }

    const response: QuizGradeResponse = {
      scorePercent,
      requiredScore,
      isPassed,
      isCompleted: isPassed,
      requiresReview,
      status: requiresReview ? "PENDING_REVIEW" : "COMPLETED",
      correctCount,
      totalQuestions: questions.length,
      feedback,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Quiz grading error:", error);
    return fail("quizGradeFailed", 500);
  }
}
