import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, articleId, hasScrolledBottom, highestQuizScore, isCompleted } = body;

    if (!userId || !articleId) {
      return NextResponse.json({ success: false, error: "Missing userId or articleId" }, { status: 400 });
    }

    const existing = await prisma.userProgress.findUnique({
      where: {
        userId_articleId: { userId, articleId },
      },
    });

    const finalScrolled = hasScrolledBottom ?? existing?.hasScrolledBottom ?? false;
    const currentHighest = existing?.highestQuizScore ?? 0;
    const nextHighest = highestQuizScore !== undefined ? Math.max(currentHighest, highestQuizScore) : currentHighest;

    // Check article requirement
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    const quizRequired = (article?.passScorePercent ?? 0) > 0;
    const quizPassed = !quizRequired || nextHighest >= (article?.passScorePercent ?? 0);
    const scrollOk = !article?.requireScrollToBottom || finalScrolled;
    const finalCompleted = isCompleted || (scrollOk && quizPassed);

    const progress = await prisma.userProgress.upsert({
      where: {
        userId_articleId: { userId, articleId },
      },
      update: {
        hasScrolledBottom: finalScrolled,
        highestQuizScore: nextHighest,
        isCompleted: finalCompleted,
        completedAt: finalCompleted ? (existing?.completedAt || new Date()) : null,
        lastAccessedAt: new Date(),
      },
      create: {
        userId,
        articleId,
        hasScrolledBottom: finalScrolled,
        highestQuizScore: nextHighest,
        isCompleted: finalCompleted,
        completedAt: finalCompleted ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      progress: {
        ...progress,
        completedAt: progress.completedAt?.toISOString() || null,
        lastAccessedAt: progress.lastAccessedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating progress in Postgres:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

