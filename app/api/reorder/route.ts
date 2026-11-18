import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-errors";
import {
  handleApiError,
  requireAdmin,
  requireCourseEditor,
  requireLessonEditor,
} from "@/lib/authz";

type Kind = "course" | "lesson" | "item";

/**
 * Sắp xếp lại thứ tự bằng danh sách id theo thứ tự mới (index = orderIndex).
 *  - course: toàn hệ thống (ADMIN)
 *  - lesson: `parentId` = courseId
 *  - item:   `parentId` = lessonId
 * Mọi id phải thuộc đúng parent, tránh dùng route này để chuyển nội dung chéo khóa.
 */
export async function PUT(req: NextRequest) {
  try {
    const { kind, parentId, ids } = (await req.json()) as {
      kind: Kind;
      parentId?: string;
      ids: string[];
    };
    if (!["course", "lesson", "item"].includes(kind) || !Array.isArray(ids) || ids.length === 0) {
      return apiError("reorderInvalid");
    }
    if (kind !== "course" && !parentId) {
      return apiError("reorderMissingParent");
    }

    if (kind === "course") await requireAdmin();
    if (kind === "lesson") await requireCourseEditor(parentId!);
    if (kind === "item") await requireLessonEditor(parentId!);

    const owned =
      kind === "course"
        ? await prisma.course.findMany({ where: { id: { in: ids } }, select: { id: true } })
        : kind === "lesson"
          ? await prisma.lesson.findMany({ where: { id: { in: ids }, courseId: parentId }, select: { id: true } })
          : await prisma.item.findMany({ where: { id: { in: ids }, lessonId: parentId }, select: { id: true } });
    if (owned.length !== new Set(ids).size) {
      return apiError("reorderForeignItems");
    }

    const updates = ids.map((id, orderIndex) =>
      kind === "course"
        ? prisma.course.update({ where: { id }, data: { orderIndex } })
        : kind === "lesson"
          ? prisma.lesson.update({ where: { id }, data: { orderIndex } })
          : prisma.item.update({ where: { id }, data: { orderIndex } })
    );
    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
