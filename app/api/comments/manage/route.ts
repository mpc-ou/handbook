import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireStaff } from "@/lib/authz";

/**
 * Danh sách bình luận cho kiểm duyệt (ADMIN: mọi khóa; EDITOR: các khóa được giao).
 * Lọc: courseId, userId, q (nội dung/tên người bình luận), chia trang limit/offset.
 * Xóa dùng `DELETE /api/comments?id=` (cùng quy tắc quyền).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireStaff();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const userId = searchParams.get("userId");
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 30));
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const itemWhere: Prisma.ItemWhereInput = {
      lesson: {
        ...(courseId && { courseId }),
        ...(user.role === "EDITOR" && { course: { editors: { some: { userId: user.id } } } }),
      },
    };
    const where: Prisma.CommentWhereInput = {
      item: itemWhere,
      ...(userId && { userId }),
      ...(q && {
        OR: [
          { content: { contains: q, mode: "insensitive" } },
          { user: { fullName: { contains: q, mode: "insensitive" } } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          content: true,
          parentId: true,
          createdAt: true,
          userId: true,
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true, role: true } },
          item: {
            select: {
              id: true,
              title: true,
              slug: true,
              lesson: { select: { slug: true, title: true, course: { select: { id: true, slug: true, title: true } } } },
            },
          },
          _count: { select: { replies: true } },
        },
      }),
      prisma.comment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      limit,
      offset,
      comments: rows.map((c) => ({
        id: c.id,
        content: c.content,
        isReply: c.parentId !== null,
        replyCount: c._count.replies,
        createdAt: c.createdAt.toISOString(),
        author: c.user,
        item: { id: c.item.id, title: c.item.title },
        lesson: { title: c.item.lesson.title },
        course: { id: c.item.lesson.course.id, title: c.item.lesson.course.title },
        href: `/learn/${c.item.lesson.course.slug}/${c.item.lesson.slug}/${c.item.slug}#comment-${c.id}`,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
