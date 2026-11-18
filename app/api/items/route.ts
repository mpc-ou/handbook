import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify, extractPlainTextFromBlocks, estimateReadingTime } from "@/lib/seed-data";
import { extractCloudinaryUrlsFromItem, syncAttachments } from "@/lib/cloudinary-server";
import { handleApiError, requireItemEditor, requireLessonEditor, requireStaff } from "@/lib/authz";
import { findInvalidQuestionTypes, hasQuiz } from "@/lib/quiz-rules";
import { apiError } from "@/lib/api-errors";
import { itemInclude, serializeItem } from "@/lib/serializers";
import type { EditorBlock, QuizQuestion } from "@/types";
import type { ItemType } from "@prisma/client";

const bad = apiError;

const ITEM_TYPES = ["CONTENT", "QUIZ", "ASSIGNMENT"] as const;

/** Danh sách chương/bài tập cho Studio (có tìm kiếm + phân trang). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireStaff();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const lessonId = searchParams.get("lessonId");
    const courseId = searchParams.get("courseId");
    const status = searchParams.get("status");
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const where: Prisma.ItemWhereInput = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ];
    }
    if (lessonId) where.lessonId = lessonId;
    if (courseId) where.lesson = { courseId };
    if (status && status !== "ALL") where.status = status as Prisma.ItemWhereInput["status"];
    // EDITOR chỉ thấy item thuộc khóa được giao
    if (user.role === "EDITOR") {
      where.lesson = { ...(where.lesson as object), course: { editors: { some: { userId: user.id } } } };
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        orderBy: [{ lesson: { orderIndex: "asc" } }, { orderIndex: "asc" }],
        take: limit,
        skip: offset,
        include: itemInclude,
      }),
      prisma.item.count({ where }),
    ]);

    return NextResponse.json({ success: true, items: items.map(serializeItem), total, limit, offset });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonId, title } = body;
    if (!lessonId) return bad("missingLessonId");
    if (!title || typeof title !== "string") return bad("missingItemTitle");
    // Loại do người tạo chọn rõ ràng và không đổi được về sau
    if (!body.type) return bad("missingItemType");
    const type = body.type as (typeof ITEM_TYPES)[number];
    if (!ITEM_TYPES.includes(type)) return bad("invalidItemType");
    const user = await requireLessonEditor(lessonId);

    const content = (body.content ?? []) as EditorBlock[];
    const plainText = extractPlainTextFromBlocks(content);
    const max = await prisma.item.aggregate({ where: { lessonId }, _max: { orderIndex: true } });
    // Chương (CONTENT) không có bài kiểm tra; QUIZ/ASSIGNMENT luôn có
    const needsQuiz = hasQuiz(type);
    const quizQuestions = needsQuiz ? (body.quizQuestions ?? []) : [];
    const invalidTypes = findInvalidQuestionTypes(type, quizQuestions);
    if (invalidTypes.length > 0) {
      return bad("invalidQuestionTypes", 422, { type, types: invalidTypes.join(", ") });
    }

    const item = await prisma.item.create({
      data: {
        lessonId,
        type,
        title,
        slug: body.slug || slugify(title),
        summary: body.summary || "",
        orderIndex: (max._max.orderIndex ?? -1) + 1,
        // EDITOR không tự xuất bản
        status:
          user.role === "ADMIN"
            ? (body.status ?? "DRAFT")
            : body.status === "PENDING_REVIEW"
              ? "PENDING_REVIEW"
              : "DRAFT",
        isRequired: body.isRequired !== false,
        requirePrevious: typeof body.requirePrevious === "boolean" ? body.requirePrevious : null,
        requireScrollToBottom: body.requireScrollToBottom !== false,
        passScorePercent: needsQuiz ? (body.passScorePercent ?? null) : null,
        content: content as unknown as Prisma.InputJsonValue,
        plainText,
        readingTime: estimateReadingTime(plainText, content.length),
        attachments: (body.attachments ?? []) as Prisma.InputJsonValue,
        authorId: user.id,
        updaterId: user.id,
        quiz: needsQuiz
          ? {
              create: {
                questions: quizQuestions as Prisma.InputJsonValue,
                durationMinutes: body.quizDurationMinutes ? Number(body.quizDurationMinutes) : null,
                maxAttempts: body.quizMaxAttempts ? Number(body.quizMaxAttempts) : null,
                isExam: Boolean(body.quizIsExam),
                passScorePercent: body.passScorePercent ?? 80,
              },
            }
          : undefined,
      },
      include: itemInclude,
    });

    await syncAttachments({ itemId: item.id }, extractCloudinaryUrlsFromItem(item));
    return NextResponse.json({ success: true, item: serializeItem(item) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, quizQuestions, quizDurationMinutes, quizMaxAttempts, quizIsExam, ...patch } = await req.json();
    if (!id) return bad("missingItemId");
    const user = await requireItemEditor(id);

    const existing = await prisma.item.findUnique({ where: { id }, select: { status: true, type: true } });
    if (!existing) return bad("itemNotFound", 404);
    if (existing.status === "PUBLISHED" && user.role !== "ADMIN") {
      return bad("itemLockedPublished", 403);
    }
    if (patch.status === "PUBLISHED" && user.role !== "ADMIN") {
      return bad("publishAdminOnly", 403);
    }
    // Loại item (chương/trắc nghiệm/bài tập) cố định sau khi tạo; chỉ sửa được nội dung
    if (patch.type !== undefined && patch.type !== existing.type) return bad("itemTypeLocked", 409);

    // Chương (CONTENT) không gắn quiz; QUIZ/ASSIGNMENT luôn có quiz với loại câu hỏi đúng dạng
    const finalType = (patch.type ?? existing.type) as ItemType;
    const existingQuiz = await prisma.quiz.findUnique({
      where: { itemId: id },
      select: { id: true, questions: true, _count: { select: { attempts: true } } },
    });
    if (hasQuiz(finalType) !== hasQuiz(existing.type) && existingQuiz && existingQuiz._count.attempts > 0) {
      return bad("cannotSwitchItemKind", 409);
    }
    const effectiveQuestions = hasQuiz(finalType)
      ? ((quizQuestions ?? existingQuiz?.questions ?? []) as unknown as QuizQuestion[])
      : [];
    const invalidTypes = findInvalidQuestionTypes(finalType, effectiveQuestions);
    if (invalidTypes.length > 0) {
      return bad("invalidQuestionTypes", 422, { type: finalType, types: invalidTypes.join(", ") });
    }

    const data: Prisma.ItemUpdateInput = { updater: { connect: { id: user.id } } };
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.slug !== undefined) data.slug = patch.slug;
    if (patch.summary !== undefined) data.summary = patch.summary;
    if (patch.orderIndex !== undefined) data.orderIndex = Number(patch.orderIndex);
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.isRequired !== undefined) data.isRequired = Boolean(patch.isRequired);
    if (patch.requirePrevious !== undefined) {
      data.requirePrevious = typeof patch.requirePrevious === "boolean" ? patch.requirePrevious : null;
    }
    if (patch.requireScrollToBottom !== undefined) data.requireScrollToBottom = Boolean(patch.requireScrollToBottom);
    if (!hasQuiz(finalType)) data.passScorePercent = null;
    else if (patch.passScorePercent !== undefined) data.passScorePercent = patch.passScorePercent;
    if (patch.attachments !== undefined) data.attachments = patch.attachments as Prisma.InputJsonValue;
    if (patch.content !== undefined) {
      const blocks = patch.content as EditorBlock[];
      data.content = blocks as unknown as Prisma.InputJsonValue;
      data.plainText = extractPlainTextFromBlocks(blocks);
      data.readingTime = estimateReadingTime(data.plainText, blocks.length);
    }
    // Chuyển item sang bài học khác (cùng quyền sửa ở đích)
    if (patch.lessonId !== undefined) {
      await requireLessonEditor(patch.lessonId);
      data.lesson = { connect: { id: patch.lessonId } };
    }

    await prisma.item.update({ where: { id }, data });

    if (!hasQuiz(finalType)) {
      // Đổi về chương: bỏ quiz (đã chặn ở trên nếu còn lượt làm bài)
      if (existingQuiz) await prisma.quiz.delete({ where: { id: existingQuiz.id } });
    } else {
      // QUIZ/ASSIGNMENT luôn có Quiz đính kèm
      const quizData: Prisma.QuizUncheckedUpdateInput = {};
      if (quizQuestions !== undefined) quizData.questions = quizQuestions as Prisma.InputJsonValue;
      if (quizDurationMinutes !== undefined) quizData.durationMinutes = quizDurationMinutes ? Number(quizDurationMinutes) : null;
      if (quizMaxAttempts !== undefined) quizData.maxAttempts = quizMaxAttempts ? Number(quizMaxAttempts) : null;
      if (quizIsExam !== undefined) quizData.isExam = Boolean(quizIsExam);
      if (patch.passScorePercent !== undefined) quizData.passScorePercent = Number(patch.passScorePercent);

      await prisma.quiz.upsert({
        where: { itemId: id },
        update: quizData,
        create: {
          itemId: id,
          questions: (quizQuestions ?? []) as Prisma.InputJsonValue,
          durationMinutes: quizDurationMinutes ? Number(quizDurationMinutes) : null,
          maxAttempts: quizMaxAttempts ? Number(quizMaxAttempts) : null,
          isExam: Boolean(quizIsExam),
          passScorePercent: patch.passScorePercent ?? 80,
        },
      });
    }

    const item = await prisma.item.findUniqueOrThrow({ where: { id }, include: itemInclude });
    await syncAttachments({ itemId: id }, extractCloudinaryUrlsFromItem(item));
    return NextResponse.json({ success: true, item: serializeItem(item) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return bad("missingItemId");
    await requireItemEditor(id);

    await prisma.item.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return handleApiError(error);
  }
}
