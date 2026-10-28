import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify, extractPlainTextFromBlocks, estimateReadingTime } from "@/lib/seed-data";
import { extractCloudinaryUrlsFromArticle, syncArticleAttachments } from "@/lib/cloudinary-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 5));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ];
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: [{ orderIndex: "asc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
        include: {
          category: { select: { id: true, name: true } },
          author: { select: { id: true, fullName: true } },
        },
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      articles,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      slug,
      summary,
      coverImage,
      content,
      attachments,
      categoryId,
      orderIndex,
      isPublished,
      status: incomingStatus,
      requirePrevious,
      requireScrollToBottom,
      passScorePercent,
      isRequired,
      allowedGroups,
      quizDurationMinutes,
      quizMaxAttempts,
      quizIsExam,
      authorId,
      visibility,
      audience,
      quizQuestions,
    } = body;

    const finalStatus =
      incomingStatus || (Boolean(isPublished) ? "PUBLISHED" : "DRAFT");
    const finalIsPublished = finalStatus === "PUBLISHED";

    const plainText = extractPlainTextFromBlocks(content || []);
    const readingTime = estimateReadingTime(plainText, (content || []).length);
    const finalSlug = slug || slugify(title);

    // Ensure valid authorId exists in DB or fallback to admin
    let finalAuthorId = authorId;
    let authorUser = null;
    if (finalAuthorId) {
      authorUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: finalAuthorId },
            { email: finalAuthorId },
            { ssoId: finalAuthorId },
          ],
        },
        select: { id: true },
      });
    }
    if (!authorUser) {
      authorUser = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true },
      });
    }
    finalAuthorId = authorUser?.id || "usr_admin_trieu";

    const article: any = await (prisma.article as any).create({
      data: {
        title,
        slug: finalSlug,
        summary: summary || "",
        coverImage: coverImage || null,
        content: (content || []) as any,
        plainText,
        readingTime,
        attachments: (attachments || []) as any,
        categoryId,
        orderIndex: orderIndex ?? 0,
        status: finalStatus as any,
        isPublished: finalIsPublished,
        visibility: (visibility || "PUBLIC") as string,
        audience: (audience || "INTERNAL") as string,
        requirePrevious: Boolean(requirePrevious),
        requireScrollToBottom: requireScrollToBottom !== false,
        passScorePercent: passScorePercent ?? 0,
        isRequired: isRequired !== false,
        allowedGroups: (allowedGroups || []) as any,
        authorId: finalAuthorId,
        updaterId: finalAuthorId,
        quiz: (quizQuestions && quizQuestions.length > 0) || quizDurationMinutes || quizMaxAttempts || quizIsExam
          ? {
              create: {
                questions: (quizQuestions || []) as any,
                durationMinutes: quizDurationMinutes ? Number(quizDurationMinutes) : null,
                maxAttempts: quizMaxAttempts ? Number(quizMaxAttempts) : null,
                isExam: Boolean(quizIsExam),
                passScorePercent: passScorePercent ?? 80,
              },
            }
          : undefined,
      },
      include: {
        quiz: true,
        author: { select: { fullName: true } },
      },
    });

    // Sync uploaded Cloudinary files into database as attached
    const activeUrls = extractCloudinaryUrlsFromArticle({
      coverImage: article.coverImage,
      content: article.content,
      attachments: article.attachments,
    });
    syncArticleAttachments(article.id, activeUrls).catch(() => {});

    return NextResponse.json({
      success: true,
      article: {
        ...article,
        authorName: article.author?.fullName || "MPC Executive Board",
        isRequired: article.isRequired ?? true,
        allowedGroups: (article.allowedGroups as any) || [],
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
        quizQuestions: (article.quiz?.questions as any) || [],
        quizDurationMinutes: article.quiz?.durationMinutes ?? 0,
        quizMaxAttempts: article.quiz?.maxAttempts ?? 0,
        quizIsExam: Boolean(article.quiz?.isExam),
      },
    });
  } catch (error: any) {
    console.error("Error creating article in Postgres:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      quizQuestions,
      quizDurationMinutes,
      quizMaxAttempts,
      quizIsExam,
      ...patch
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing article ID" }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (patch.title !== undefined) dataToUpdate.title = patch.title;
    if (patch.slug !== undefined) dataToUpdate.slug = patch.slug;
    if (patch.summary !== undefined) dataToUpdate.summary = patch.summary;
    if (patch.coverImage !== undefined) dataToUpdate.coverImage = patch.coverImage;
    if (patch.content !== undefined) {
      dataToUpdate.content = patch.content;
      dataToUpdate.plainText = extractPlainTextFromBlocks(patch.content);
      dataToUpdate.readingTime = estimateReadingTime(dataToUpdate.plainText, patch.content.length);
    }
    if (patch.attachments !== undefined) dataToUpdate.attachments = patch.attachments;
    if (patch.categoryId) {
      const catExists = await prisma.category.findUnique({
        where: { id: patch.categoryId },
        select: { id: true },
      });
      if (catExists) {
        dataToUpdate.category = { connect: { id: patch.categoryId } };
      }
    }
    if (patch.orderIndex !== undefined) dataToUpdate.orderIndex = patch.orderIndex;
    if (patch.status) {
      dataToUpdate.status = patch.status;
      dataToUpdate.isPublished = patch.status === "PUBLISHED";
    } else if (patch.isPublished !== undefined) {
      dataToUpdate.isPublished = Boolean(patch.isPublished);
      dataToUpdate.status = patch.isPublished ? "PUBLISHED" : "DRAFT";
    }
    if (patch.requirePrevious !== undefined) dataToUpdate.requirePrevious = Boolean(patch.requirePrevious);
    if (patch.requireScrollToBottom !== undefined) dataToUpdate.requireScrollToBottom = Boolean(patch.requireScrollToBottom);
    if (patch.passScorePercent !== undefined) dataToUpdate.passScorePercent = patch.passScorePercent;
    if (patch.isRequired !== undefined) dataToUpdate.isRequired = Boolean(patch.isRequired);
    if (patch.visibility !== undefined) dataToUpdate.visibility = patch.visibility;
    if (patch.audience !== undefined) dataToUpdate.audience = patch.audience;
    if (patch.allowedGroups !== undefined) dataToUpdate.allowedGroups = patch.allowedGroups as any;
    if (patch.updaterId) {
      // Find user by ID or by email or fallback to admin
      let updaterUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: patch.updaterId },
            { email: patch.updaterId },
            { ssoId: patch.updaterId },
          ],
        },
        select: { id: true },
      });
      if (!updaterUser) {
        updaterUser = await prisma.user.findFirst({
          where: { role: "ADMIN" },
          select: { id: true },
        });
      }
      if (updaterUser) {
        dataToUpdate.updater = { connect: { id: updaterUser.id } };
      }
    }

    const updated = await prisma.article.update({
      where: { id },
      data: dataToUpdate,
      include: {
        quiz: true,
        author: { select: { fullName: true } },
      },
    });

    // Update Quiz questions and configurations if provided
    if (
      quizQuestions !== undefined ||
      quizDurationMinutes !== undefined ||
      quizMaxAttempts !== undefined ||
      quizIsExam !== undefined ||
      patch.passScorePercent !== undefined
    ) {
      const quizUpdateData: any = {};
      if (quizQuestions !== undefined) quizUpdateData.questions = quizQuestions as any;
      if (quizDurationMinutes !== undefined) quizUpdateData.durationMinutes = quizDurationMinutes ? Number(quizDurationMinutes) : null;
      if (quizMaxAttempts !== undefined) quizUpdateData.maxAttempts = quizMaxAttempts ? Number(quizMaxAttempts) : null;
      if (quizIsExam !== undefined) quizUpdateData.isExam = Boolean(quizIsExam);
      if (patch.passScorePercent !== undefined) quizUpdateData.passScorePercent = Number(patch.passScorePercent);

      await prisma.quiz.upsert({
        where: { articleId: id },
        update: quizUpdateData,
        create: {
          articleId: id,
          questions: (quizQuestions || []) as any,
          durationMinutes: quizDurationMinutes ? Number(quizDurationMinutes) : null,
          maxAttempts: quizMaxAttempts ? Number(quizMaxAttempts) : null,
          isExam: Boolean(quizIsExam),
          passScorePercent: patch.passScorePercent ?? 80,
        },
      });
    }

    const reloaded = await prisma.article.findUnique({
      where: { id },
      include: {
        quiz: true,
        author: { select: { fullName: true } },
      },
    });

    // Sync uploaded Cloudinary files into database as attached
    const activeUrls = extractCloudinaryUrlsFromArticle({
      coverImage: reloaded?.coverImage || updated.coverImage,
      content: reloaded?.content || updated.content,
      attachments: reloaded?.attachments || updated.attachments,
    });
    syncArticleAttachments(updated.id, activeUrls).catch(() => {});

    return NextResponse.json({
      success: true,
      article: {
        ...updated,
        authorName: updated.author?.fullName || "MPC Executive Board",
        isRequired: reloaded?.isRequired ?? updated.isRequired ?? true,
        allowedGroups: (reloaded?.allowedGroups as any) || (updated.allowedGroups as any) || [],
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        quizQuestions: (reloaded?.quiz?.questions as any) || quizQuestions || (updated.quiz?.questions as any) || [],
        quizDurationMinutes: reloaded?.quiz?.durationMinutes ?? 0,
        quizMaxAttempts: reloaded?.quiz?.maxAttempts ?? 0,
        quizIsExam: Boolean(reloaded?.quiz?.isExam),
      },
    });
  } catch (error: any) {
    console.error("Error updating article in Postgres:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing article ID" }, { status: 400 });
    }

    // Cascade delete article and its quiz & progress
    await prisma.article.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("Error deleting article in Postgres:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

