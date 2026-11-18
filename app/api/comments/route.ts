import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, handleApiError, requireUser } from "@/lib/authz";
import { apiError } from "@/lib/api-errors";
import type { CommentRecord, Role } from "@/types";

const userSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  department: true,
  role: true,
} as const;

const bad = apiError;

function toRecord(c: {
  id: string;
  content: string;
  itemId: string;
  userId: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { fullName: string; avatarUrl: string | null; department: string | null; role: Role };
}): CommentRecord {
  return {
    id: c.id,
    content: c.content,
    itemId: c.itemId,
    userId: c.userId,
    userFullName: c.user.fullName || "Member",
    userAvatarUrl: c.user.avatarUrl || undefined,
    userDepartment: c.user.department || undefined,
    userRole: c.user.role,
    parentId: c.parentId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    replies: [],
  };
}

export async function GET(req: NextRequest) {
  try {
    const itemId = new URL(req.url).searchParams.get("itemId");
    if (!itemId) return bad("missingItemRef", 400);

    const comments = await prisma.comment.findMany({
      where: { itemId },
      include: { user: { select: userSelect } },
      orderBy: { createdAt: "asc" },
    });

    // Nhóm thành bậc 1 (gốc) và bậc 2 (trả lời)
    const roots: CommentRecord[] = [];
    const replyMap = new Map<string, CommentRecord[]>();
    for (const c of comments) {
      const record = toRecord(c);
      if (!c.parentId) {
        roots.push(record);
      } else {
        replyMap.set(c.parentId, [...(replyMap.get(c.parentId) ?? []), record]);
      }
    }
    for (const root of roots) root.replies = replyMap.get(root.id) ?? [];

    return NextResponse.json({ success: true, comments: roots, totalCount: comments.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { itemId, content, parentId } = await req.json().catch(() => ({}));

    if (!itemId || typeof content !== "string" || !content.trim()) {
      return bad("commentEmpty", 400);
    }
    const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) throw new HttpError(404, "itemNotFound");

    // Chỉ cho 2 bậc: trả lời một bình luận bậc 2 thì gắn vào bình luận gốc
    let targetParentId: string | null = null;
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.itemId !== itemId) return bad("parentInvalid");
      targetParentId = parent.parentId ?? parent.id;
    }

    const created = await prisma.comment.create({
      data: { itemId, userId: user.id, content: content.trim(), parentId: targetParentId },
      include: { user: { select: userSelect } },
    });

    return NextResponse.json({ success: true, comment: toRecord(created) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Tác giả bình luận hoặc ADMIN mới được xóa. */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const commentId = new URL(req.url).searchParams.get("id");
    if (!commentId) return bad("missingCommentId", 400);

    const target = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!target) throw new HttpError(404, "commentNotFound");
    if (target.userId !== user.id && user.role !== "ADMIN") {
      throw new HttpError(403, "commentForbidden");
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
