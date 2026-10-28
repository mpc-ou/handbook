import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    let departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    });

    if (departments.length === 0) {
      const DEFAULT_DEPTS = [
        { name: "Executive Board", description: "General leadership and overall club operations", color: "#8b5cf6" },
        { name: "Tech & Academic Board", description: "R&D, technology innovation and technical curriculum", color: "#3b82f6" },
        { name: "Media & Events Board", description: "External relations, graphic design and event playbooks", color: "#ec4899" },
        { name: "HR & External Affairs", description: "Member engagement, internal culture and sponsor relations", color: "#f59e0b" },
      ];
      for (const d of DEFAULT_DEPTS) {
        await prisma.department.create({ data: d }).catch(() => {});
      }
      departments = await prisma.department.findMany({
        orderBy: { name: "asc" },
      });
    }

    const [categories, articles, users, progress, attempts] = await Promise.all([
      prisma.category.findMany({
        orderBy: [{ depth: "asc" }, { orderIndex: "asc" }],
      }),
      prisma.article.findMany({
        include: {
          quiz: true,
          author: { select: { fullName: true } },
          likes: { select: { userId: true } },
        },
        orderBy: { orderIndex: "asc" },
      }),
      prisma.user.findMany({
        include: {
          managedCategories: true,
        },
        orderBy: { fullName: "asc" },
      }),
      prisma.userProgress.findMany(),
      prisma.quizAttempt.findMany({
        include: {
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true, department: true } },
          quiz: { select: { id: true, title: true, isExam: true, article: { select: { id: true, title: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Format articles with quiz questions, authorName and likes
    const formattedArticles = articles.map((art) => ({
      id: art.id,
      title: art.title,
      slug: art.slug,
      summary: art.summary,
      coverImage: art.coverImage,
      content: art.content,
      plainText: art.plainText,
      readingTime: art.readingTime,
      attachments: art.attachments,
      categoryId: art.categoryId,
      orderIndex: art.orderIndex,
      status: (art.status as any) || (art.isPublished ? "PUBLISHED" : "DRAFT"),
      isPublished: art.isPublished,
      visibility: ((art as any).visibility || "PUBLIC") as any,
      audience: ((art as any).audience || "INTERNAL") as any,
      requirePrevious: art.requirePrevious,
      requireScrollToBottom: art.requireScrollToBottom,
      passScorePercent: art.passScorePercent ?? 0,
      isRequired: art.isRequired ?? true,
      allowedGroups: (art.allowedGroups as any) || [],
      likesCount: art.likesCount ?? 0,
      viewsCount: art.viewsCount ?? 0,
      likedUserIds: art.likes?.map((l) => l.userId) || [],
      authorId: art.authorId,
      authorName: art.author?.fullName || "MPC Executive Board",
      updaterId: art.updaterId || art.authorId,
      createdAt: art.createdAt.toISOString(),
      updatedAt: art.updatedAt.toISOString(),
      quizQuestions: (art.quiz?.questions as any) || [],
      quizDurationMinutes: art.quiz?.durationMinutes ?? 0,
      quizMaxAttempts: art.quiz?.maxAttempts ?? 0,
      quizIsExam: Boolean(art.quiz?.isExam),
    }));

    const formattedCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      icon: cat.icon || "Folder",
      orderIndex: cat.orderIndex,
      isPublished: cat.isPublished,
      depth: cat.depth,
      parentId: cat.parentId || "",
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    }));

    const formattedUsers = users.map((u) => ({
      uid: u.id,
      ssoId: u.ssoId,
      email: u.email,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl || undefined,
      department: u.department || "",
      managedGroups: (u.managedGroups as any) || [],
      role: u.role,
      noPassword: Boolean(u.noPassword),
      managedCategoryIds: u.managedCategories.map((m) => m.categoryId),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    const formattedProgress = progress.map((p) => ({
      id: p.id,
      userId: p.userId,
      articleId: p.articleId,
      hasScrolledBottom: p.hasScrolledBottom,
      highestQuizScore: p.highestQuizScore ?? 0,
      isCompleted: p.isCompleted,
      completedAt: p.completedAt ? p.completedAt.toISOString() : null,
      lastAccessedAt: p.lastAccessedAt.toISOString(),
    }));

    const formattedAttempts = attempts.map((a) => ({
      id: a.id,
      userId: a.userId,
      userFullName: a.user?.fullName || "Member",
      userEmail: a.user?.email || "",
      userAvatarUrl: a.user?.avatarUrl || undefined,
      userDepartment: a.user?.department || "",
      quizId: a.quizId,
      articleId: a.quiz?.article?.id || a.quizId,
      articleTitle: a.quiz?.article?.title || a.quiz?.title || "Quiz Assessment",
      scorePercent: a.scorePercent,
      answers: a.answers as any,
      isPassed: a.isPassed,
      timeSpentSec: a.timeSpentSec ?? undefined,
      status: a.status || "COMPLETED",
      feedback: a.feedback || undefined,
      createdAt: a.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        success: true,
        categories: formattedCategories,
        articles: formattedArticles,
        allUsers: formattedUsers,
        allProgress: formattedProgress,
        quizAttempts: formattedAttempts,
        departments: departments.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          color: d.color,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Failed to load PostgreSQL handbook data:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

