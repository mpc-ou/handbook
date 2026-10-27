import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_ARTICLES } from "@/lib/seed-data";
import { QuizGradeResponse, QuizQuestion } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      articleId,
      userId,
      userAnswers,
      passScorePercent,
      questions: providedQuestions,
      timeSpentSec,
    }: {
      articleId: string;
      userId?: string;
      userAnswers: Record<string, string[]>;
      passScorePercent?: number;
      questions?: QuizQuestion[];
      timeSpentSec?: number;
    } = body;

    if (!articleId || !userAnswers || typeof userAnswers !== "object") {
      return NextResponse.json(
        { error: "Invalid submission data." },
        { status: 400 }
      );
    }

    // Try finding quiz in Postgres
    let questions: QuizQuestion[] = [];
    let requiredScore = passScorePercent;
    let quizRecordId: string | null = null;
    let maxAttemptsLimit: number | null = null;

    try {
      const dbQuiz = await prisma.quiz.findUnique({
        where: { articleId },
        include: { article: { select: { passScorePercent: true } } },
      });
      if (dbQuiz) {
        maxAttemptsLimit = dbQuiz.maxAttempts;
        quizRecordId = dbQuiz.id;
        if (Array.isArray(dbQuiz.questions) && dbQuiz.questions.length > 0) {
          questions = dbQuiz.questions as any;
          if (requiredScore === undefined && dbQuiz.article?.passScorePercent != null) {
            requiredScore = dbQuiz.article.passScorePercent ?? 80;
          }
        }
      }
    } catch {
      // Fallback
    }

    // Check max attempts constraint
    if (quizRecordId && maxAttemptsLimit && maxAttemptsLimit > 0 && userId) {
      const priorCount = await prisma.quizAttempt.count({
        where: { quizId: quizRecordId, userId },
      });
      if (priorCount >= maxAttemptsLimit) {
        return NextResponse.json(
          {
            error: `You have completed this quiz and reached the maximum allowed attempts (${maxAttemptsLimit}).`,
          },
          { status: 403 }
        );
      }
    }

    if (questions.length === 0) {
      const seedArticle = INITIAL_ARTICLES.find((a) => a.id === articleId);
      questions =
        providedQuestions && providedQuestions.length > 0
          ? providedQuestions
          : seedArticle?.quizQuestions || [];
      if (requiredScore === undefined) {
        requiredScore = seedArticle?.passScorePercent ?? 80;
      }
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "This article does not have an attached quiz." },
        { status: 400 }
      );
    }

    let correctCount = 0;
    const feedback: QuizGradeResponse["feedback"] = {};

    for (const q of questions) {
      const submitted = userAnswers[q.id] || [];
      let isCorrect = false;

      if (q.type === "fill_blank") {
        const submittedText = (submitted[0] || "").trim().toLowerCase();
        const acceptableAnswers = (q.correctTextAnswer || "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

        if (acceptableAnswers.length === 0) {
          isCorrect = submittedText.length > 0;
        } else {
          isCorrect = acceptableAnswers.some(
            (ans) => ans === submittedText || submittedText.includes(ans)
          );
        }
      } else if (q.type === "essay") {
        // Essay is answered if non-empty text is submitted
        isCorrect = (submitted[0] || "").trim().length > 0;
      } else if (q.type === "scale") {
        // Scale rating is answered if value is selected
        isCorrect = Boolean(submitted[0]);
      } else if (q.type === "file_upload") {
        // File submission is answered if URL is present
        isCorrect = Boolean(submitted[0]);
      } else if (q.type === "single" || !q.type) {
        // Single Choice: strictly match against the single correct option
        const expectedId = q.correctOptionIds?.[0];
        const submittedId = submitted[0];
        isCorrect = Boolean(expectedId && submittedId && expectedId === submittedId);
      } else {
        // Multiple Choice: match all selected against all expected
        const subSorted = [...submitted].sort();
        const expSorted = [...(q.correctOptionIds || [])].sort();
        isCorrect =
          subSorted.length > 0 &&
          subSorted.length === expSorted.length &&
          subSorted.every((val, idx) => val === expSorted[idx]);
      }

      if (isCorrect) {
        correctCount++;
      }

      feedback[q.id] = {
        isCorrect,
        explanation: q.explanation,
        correctOptionIds: q.correctOptionIds || [],
      };
    }

    const scorePercent = Math.round((correctCount / questions.length) * 100);
    const finalRequired = requiredScore ?? 80;
    const isPassed = scorePercent >= finalRequired;

    // Record attempt & update progress in Postgres if userId is provided
    if (userId) {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user && quizRecordId) {
          const hasManualReview = questions.some(
            (q) => q.type === "essay" || q.type === "file_upload"
          );
          await prisma.quizAttempt.create({
            data: {
              userId: user.id,
              quizId: quizRecordId,
              scorePercent,
              answers: userAnswers as any,
              isPassed,
              timeSpentSec: timeSpentSec ? Number(timeSpentSec) : null,
              status: hasManualReview ? "PENDING_REVIEW" : "COMPLETED",
            },
          });
        }

        // Update progress
        const existingProg = await prisma.userProgress.findUnique({
          where: { userId_articleId: { userId, articleId } },
        });
        const prevHighest = existingProg?.highestQuizScore ?? 0;
        const newHighest = Math.max(prevHighest, scorePercent);
        const article = await prisma.article.findUnique({ where: { id: articleId } });
        const scrollOk = !article?.requireScrollToBottom || Boolean(existingProg?.hasScrolledBottom);
        const isCompleted = isPassed && scrollOk;

        await prisma.userProgress.upsert({
          where: { userId_articleId: { userId, articleId } },
          update: {
            highestQuizScore: newHighest,
            isCompleted: isCompleted || existingProg?.isCompleted || false,
            completedAt: isCompleted ? (existingProg?.completedAt || new Date()) : existingProg?.completedAt,
            lastAccessedAt: new Date(),
          },
          create: {
            userId,
            articleId,
            hasScrolledBottom: false,
            highestQuizScore: scorePercent,
            isCompleted,
            completedAt: isCompleted ? new Date() : null,
          },
        });
      } catch (err) {
        console.warn("Could not save quiz attempt to Postgres:", err);
      }
    }

    const response: QuizGradeResponse = {
      scorePercent,
      requiredScore: finalRequired,
      isPassed,
      isCompleted: isPassed,
      correctCount,
      totalQuestions: questions.length,
      feedback,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Quiz grading error:", error);
    return NextResponse.json(
      { error: "An error occurred while grading the quiz on server." },
      { status: 500 }
    );
  }
}
