import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/seed-data";
import { extractCloudinaryUrlsFromCover, syncAttachments } from "@/lib/cloudinary-server";
import { handleApiError, requireCourseEditor, requireLessonEditor } from "@/lib/authz";
import { apiError } from "@/lib/api-errors";
import { serializeLesson } from "@/lib/serializers";

const bad = apiError;

export async function POST(req: NextRequest) {
  try {
    const { courseId, title, slug, summary, coverImage, isPublished, requirePrevious } = await req.json();
    if (!courseId) return bad("missingCourseId");
    if (!title || typeof title !== "string") return bad("missingLessonTitle");
    const user = await requireCourseEditor(courseId);

    const max = await prisma.lesson.aggregate({ where: { courseId }, _max: { orderIndex: true } });
    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        title,
        slug: slug || slugify(title),
        summary: summary || "",
        coverImage: coverImage || null,
        orderIndex: (max._max.orderIndex ?? -1) + 1,
        // Xuất bản do ADMIN
        isPublished: user.role === "ADMIN" && Boolean(isPublished),
        requirePrevious: typeof requirePrevious === "boolean" ? requirePrevious : null,
      },
    });

    await syncAttachments({ lessonId: lesson.id }, extractCloudinaryUrlsFromCover(lesson.coverImage));
    return NextResponse.json({ success: true, lesson: serializeLesson(lesson) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, ...patch } = await req.json();
    if (!id) return bad("missingLessonId");
    const user = await requireLessonEditor(id);

    if (patch.isPublished === true && user.role !== "ADMIN") {
      return bad("lessonPublishAdminOnly", 403);
    }

    const data: Prisma.LessonUpdateInput = {};
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.slug !== undefined) data.slug = patch.slug;
    if (patch.summary !== undefined) data.summary = patch.summary;
    if (patch.coverImage !== undefined) data.coverImage = patch.coverImage || null;
    if (patch.orderIndex !== undefined) data.orderIndex = Number(patch.orderIndex);
    if (patch.isPublished !== undefined) data.isPublished = Boolean(patch.isPublished);
    // null = kế thừa Course.sequential
    if (patch.requirePrevious !== undefined) {
      data.requirePrevious = typeof patch.requirePrevious === "boolean" ? patch.requirePrevious : null;
    }

    const lesson = await prisma.lesson.update({ where: { id }, data });
    await syncAttachments({ lessonId: lesson.id }, extractCloudinaryUrlsFromCover(lesson.coverImage));
    return NextResponse.json({ success: true, lesson: serializeLesson(lesson) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Xóa bài học kéo theo các chương. Cần `confirm=true` nếu còn chương. */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return bad("missingLessonId");
    await requireLessonEditor(id);

    const itemCount = await prisma.item.count({ where: { lessonId: id } });
    if (itemCount > 0 && searchParams.get("confirm") !== "true") {
      return apiError("confirmDeleteLesson", 409, { items: itemCount }, { requireConfirmation: true, itemCount });
    }

    await prisma.lesson.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id, itemCount });
  } catch (error) {
    return handleApiError(error);
  }
}
