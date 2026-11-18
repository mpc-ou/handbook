import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/seed-data";
import { extractCloudinaryUrlsFromCover, syncAttachments } from "@/lib/cloudinary-server";
import { handleApiError, requireAdmin, requireCourseEditor } from "@/lib/authz";
import { apiError } from "@/lib/api-errors";
import { courseInclude, serializeCourse } from "@/lib/serializers";

const bad = apiError;

export async function POST(req: NextRequest) {
  try {
    const user = await requireCourseEditor(null);
    const body = await req.json();
    const { title, slug, summary, coverImage, status, sequential, visibility, audience, allowedGroups, categoryIds } = body;
    if (!title || typeof title !== "string") return bad("missingCourseTitle");

    const max = await prisma.course.aggregate({ _max: { orderIndex: true } });
    const course = await prisma.course.create({
      data: {
        title,
        slug: slug || slugify(title),
        summary: summary || "",
        coverImage: coverImage || null,
        // EDITOR chỉ được tạo bản nháp / chờ duyệt, xuất bản do ADMIN
        status: user.role === "ADMIN" ? (status ?? "DRAFT") : status === "PENDING_REVIEW" ? "PENDING_REVIEW" : "DRAFT",
        orderIndex: (max._max.orderIndex ?? -1) + 1,
        sequential: sequential !== false,
        visibility: visibility ?? "PUBLIC",
        audience: audience ?? "INTERNAL",
        allowedGroups: (allowedGroups ?? []) as Prisma.InputJsonValue,
        authorId: user.id,
        updaterId: user.id,
        categories: {
          create: ((categoryIds ?? []) as string[]).map((categoryId) => ({ categoryId })),
        },
        // EDITOR tạo khóa thì tự được gán quản lý khóa đó
        ...(user.role === "EDITOR" && { editors: { create: { userId: user.id } } }),
      },
      include: courseInclude,
    });

    await syncAttachments({ courseId: course.id }, extractCloudinaryUrlsFromCover(course.coverImage));
    return NextResponse.json({ success: true, course: serializeCourse(course) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, categoryIds, ...patch } = body;
    if (!id) return bad("missingCourseId");
    const user = await requireCourseEditor(id);

    const existing = await prisma.course.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return bad("courseNotFound", 404);
    if (existing.status === "PUBLISHED" && user.role !== "ADMIN") {
      return bad("courseLockedPublished", 403);
    }
    if (patch.status === "PUBLISHED" && user.role !== "ADMIN") {
      return bad("coursePublishAdminOnly", 403);
    }

    const data: Prisma.CourseUpdateInput = { updater: { connect: { id: user.id } } };
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.slug !== undefined) data.slug = patch.slug;
    if (patch.summary !== undefined) data.summary = patch.summary;
    if (patch.coverImage !== undefined) data.coverImage = patch.coverImage || null;
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.orderIndex !== undefined) data.orderIndex = Number(patch.orderIndex);
    if (patch.sequential !== undefined) data.sequential = Boolean(patch.sequential);
    if (patch.visibility !== undefined) data.visibility = patch.visibility;
    if (patch.audience !== undefined) data.audience = patch.audience;
    if (patch.allowedGroups !== undefined) data.allowedGroups = patch.allowedGroups as Prisma.InputJsonValue;
    if (Array.isArray(categoryIds)) {
      data.categories = {
        deleteMany: {},
        create: (categoryIds as string[]).map((categoryId) => ({ categoryId })),
      };
    }

    const course = await prisma.course.update({ where: { id }, data, include: courseInclude });
    await syncAttachments({ courseId: course.id }, extractCloudinaryUrlsFromCover(course.coverImage));
    return NextResponse.json({ success: true, course: serializeCourse(course) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Xóa khóa học kéo theo toàn bộ bài học/chương. Cần `confirm=true` nếu khóa còn nội dung. */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return bad("missingCourseId");

    const [lessonCount, itemCount] = await Promise.all([
      prisma.lesson.count({ where: { courseId: id } }),
      prisma.item.count({ where: { lesson: { courseId: id } } }),
    ]);
    if ((lessonCount > 0 || itemCount > 0) && searchParams.get("confirm") !== "true") {
      return apiError("confirmDeleteCourse", 409, { lessons: lessonCount, items: itemCount }, { requireConfirmation: true, lessonCount, itemCount });
    }

    await prisma.course.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id, lessonCount, itemCount });
  } catch (error) {
    return handleApiError(error);
  }
}
