import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ArticleClientPage } from "@/components/reader/ArticleClientPage";
import type { ArticleRecord, ArticleStatus } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const slugPath = Array.isArray(slug) ? slug.join("/") : slug;

    const article = await prisma.article.findFirst({
      where: {
        OR: [{ slug: slugPath }, { id: slugPath }],
      },
      include: {
        author: {
          select: { fullName: true },
        },
      },
    });

    if (!article) {
      return {
        title: "Article Not Found | MPC Handbook",
        description: "The requested article could not be found in the MPC Handbook.",
      };
    }

    const title = `${article.title} | MPC Handbook`;
    const description =
      article.summary ||
      (article.plainText ? `${article.plainText.slice(0, 155)}...` : "Internal Handbook and Training Roadmap for MPC Club members.");

    const coverUrl =
      article.coverImage && !article.coverImage.startsWith("preset:")
        ? article.coverImage
        : "https://handbook.mpclub.dev/assets/cover-fallback.png";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        url: `https://handbook.mpclub.dev/docs/${article.slug}`,
        siteName: "MPC Handbook - Programming Club Training & Playbook",
        images: [
          {
            url: coverUrl,
            width: 1200,
            height: 630,
            alt: article.title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [coverUrl],
      },
    };
  } catch (err) {
    console.warn("generateMetadata error in /docs/[...slug]:", err);
    return {
      title: "Lesson | MPC Handbook",
    };
  }
}

export default async function DocsArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const slugPath = Array.isArray(slug) ? slug.join("/") : slug;

  let dbArticle: any = null;
  try {
    dbArticle = await prisma.article.findFirst({
      where: {
        OR: [{ slug: slugPath }, { id: slugPath }],
      },
      include: {
        author: { select: { fullName: true } },
        quiz: true,
        likes: { select: { userId: true } },
      },
    });
  } catch (dbErr) {
    console.error("DocsArticlePage database query error:", dbErr);
  }

  if (!dbArticle) {
    // If not found in DB or transient connection drop, let ArticleClientPage check HandbookContext
    return <ArticleClientPage initialArticle={null} slug={slugPath} />;
  }

  const initialArticle: ArticleRecord = {
    id: dbArticle.id,
    title: dbArticle.title,
    slug: dbArticle.slug,
    summary: dbArticle.summary || "",
    coverImage: dbArticle.coverImage || "",
    content: (dbArticle.content as any) || [],
    plainText: dbArticle.plainText || "",
    readingTime: dbArticle.readingTime || 1,
    attachments: (dbArticle.attachments as any) || [],
    categoryId: dbArticle.categoryId,
    orderIndex: dbArticle.orderIndex,
    status: (dbArticle.status as ArticleStatus) || (dbArticle.isPublished ? "PUBLISHED" : "DRAFT"),
    isPublished: dbArticle.isPublished,
    visibility: (dbArticle.visibility || "PUBLIC") as any,
    audience: (dbArticle.audience || "INTERNAL") as any,
    requirePrevious: Boolean(dbArticle.requirePrevious),
    requireScrollToBottom: Boolean(dbArticle.requireScrollToBottom),
    passScorePercent: dbArticle.passScorePercent ?? 0,
    isRequired: dbArticle.isRequired ?? true,
    allowedGroups: (dbArticle.allowedGroups as any) || [],
    authorId: dbArticle.authorId,
    authorName: dbArticle.author?.fullName || "MPC Executive Board",
    updaterId: dbArticle.updaterId || undefined,
    createdAt: dbArticle.createdAt.toISOString(),
    updatedAt: dbArticle.updatedAt.toISOString(),
    quizQuestions: (dbArticle.quiz?.questions as any) || [],
    quizDurationMinutes: dbArticle.quiz?.durationMinutes ?? 0,
    quizMaxAttempts: dbArticle.quiz?.maxAttempts ?? 0,
    quizIsExam: Boolean(dbArticle.quiz?.isExam),
    likesCount: dbArticle.likesCount ?? dbArticle.likes?.length ?? 0,
    viewsCount: dbArticle.viewsCount ?? 0,
    likedUserIds: dbArticle.likes?.map((l: any) => l.userId) || [],
  };

  return <ArticleClientPage initialArticle={initialArticle} slug={slugPath} />;
}
