import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { CommentRecord, Role } from "@/types";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "trieukon1011@gmail.com";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get("articleId");

    if (!articleId) {
      return NextResponse.json({ success: false, error: "Missing articleId" }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
      where: { articleId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            department: true,
            role: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group comments into Level 1 (roots) and Level 2 (replies)
    const roots: CommentRecord[] = [];
    const replyMap = new Map<string, CommentRecord[]>();

    for (const c of comments) {
      const record: CommentRecord = {
        id: c.id,
        content: c.content,
        articleId: c.articleId,
        userId: c.userId,
        userFullName: c.user?.fullName || "Member",
        userAvatarUrl: c.user?.avatarUrl || undefined,
        userDepartment: c.user?.department || undefined,
        userRole: (c.user?.role as Role) || "MEMBER",
        parentId: c.parentId,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        replies: [],
      };

      if (!c.parentId) {
        roots.push(record);
      } else {
        const list = replyMap.get(c.parentId) || [];
        list.push(record);
        replyMap.set(c.parentId, list);
      }
    }

    // Attach replies to roots
    for (const root of roots) {
      root.replies = replyMap.get(root.id) || [];
    }

    return NextResponse.json({
      success: true,
      comments: roots,
      totalCount: comments.length,
    });
  } catch (error: any) {
    console.error("GET /api/comments error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json().catch(() => ({}));
    const { articleId, content, parentId } = body;
    const userId = body.userId || session?.user?.id;

    if (!articleId || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter your comment content." },
        { status: 400 }
      );
    }

    // Resolve user
    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user && session?.user?.email) {
      user = await prisma.user.findUnique({ where: { email: session.user.email } });
    }
    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Please sign in to post a comment." },
        { status: 401 }
      );
    }

    // STRICT LEVEL 2 HIERARCHY ENFORCEMENT:
    // If parentId is specified, check if that comment itself has a parentId.
    // If yes, this means the user is replying to a Level 2 comment.
    // Attach this new comment to the Level 1 root comment!
    let targetParentId: string | null = null;
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (parentComment) {
        targetParentId = parentComment.parentId ? parentComment.parentId : parentComment.id;
      }
    }

    const created = await prisma.comment.create({
      data: {
        articleId,
        userId: user.id,
        content: content.trim(),
        parentId: targetParentId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            department: true,
            role: true,
          },
        },
      },
    });

    const record: CommentRecord = {
      id: created.id,
      content: created.content,
      articleId: created.articleId,
      userId: created.userId,
      userFullName: created.user.fullName,
      userAvatarUrl: created.user.avatarUrl || undefined,
      userDepartment: created.user.department || undefined,
      userRole: created.user.role as Role,
      parentId: created.parentId,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      replies: [],
    };

    return NextResponse.json({ success: true, comment: record });
  } catch (error: any) {
    console.error("POST /api/comments error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("id");
    const callerId = searchParams.get("userId") || session?.user?.id;

    if (!commentId) {
      return NextResponse.json({ success: false, error: "Missing comment ID" }, { status: 400 });
    }

    const targetComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!targetComment) {
      return NextResponse.json({ success: false, error: "Comment does not exist" }, { status: 404 });
    }

    // Resolve caller
    let caller = null;
    if (callerId) {
      caller = await prisma.user.findUnique({ where: { id: callerId } });
    }
    if (!caller && session?.user?.email) {
      caller = await prisma.user.findUnique({ where: { email: session.user.email } });
    }

    const isAuthor = caller && caller.id === targetComment.userId;
    const isAdmin = caller && caller.role === "ADMIN";
    const isSuperAdmin = caller && caller.email === SUPER_ADMIN_EMAIL;

    if (!isAuthor && !isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "You do not have permission to delete this comment." },
        { status: 403 }
      );
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/comments error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

