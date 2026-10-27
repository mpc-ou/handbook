import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: "Missing article ID" },
        { status: 400 }
      );
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        viewsCount: {
          increment: 1,
        },
      },
      select: { viewsCount: true },
    });

    return NextResponse.json({
      success: true,
      viewsCount: updatedArticle.viewsCount,
    });
  } catch (error: any) {
    console.error("Error incrementing article views:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

