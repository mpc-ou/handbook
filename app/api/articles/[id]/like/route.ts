import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;
    const body = await req.json().catch(() => ({}));
    const { userId } = body;

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: "Missing article ID" },
        { status: 400 }
      );
    }

    // Default to admin or specified user
    let activeUserId = userId;
    if (!activeUserId) {
      const defaultUser = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      });
      activeUserId = defaultUser?.id;
    }

    if (!activeUserId) {
      return NextResponse.json(
        { success: false, error: "Please sign in to like this article." },
        { status: 401 }
      );
    }

    const existingLike = await prisma.articleLike.findUnique({
      where: {
        userId_articleId: {
          userId: activeUserId,
          articleId,
        },
      },
    });

    let isLiked = false;
    let newLikesCount = 0;

    if (existingLike) {
      // Unlike
      await prisma.articleLike.delete({
        where: { id: existingLike.id },
      });
      const updatedArticle = await prisma.article.update({
        where: { id: articleId },
        data: {
          likesCount: {
            decrement: 1,
          },
        },
        select: { likesCount: true },
      });
      isLiked = false;
      newLikesCount = Math.max(0, updatedArticle.likesCount);
    } else {
      // Like
      await prisma.articleLike.create({
        data: {
          userId: activeUserId,
          articleId,
        },
      });
      const updatedArticle = await prisma.article.update({
        where: { id: articleId },
        data: {
          likesCount: {
            increment: 1,
          },
        },
        select: { likesCount: true },
      });
      isLiked = true;
      newLikesCount = updatedArticle.likesCount;
    }

    return NextResponse.json({
      success: true,
      isLiked,
      likesCount: newLikesCount,
    });
  } catch (error: any) {
    console.error("Error toggling article like:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

