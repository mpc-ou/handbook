import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-errors";
import { handleApiError, requireUser } from "@/lib/authz";
import type { NotificationData, NotificationRecord } from "@/types";

const MAX_LIMIT = 50;

/** Thông báo của chính người dùng (chia trang theo `before` = ISO createdAt của mục cuối cùng). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit")) || 20));
    const unreadOnly = searchParams.get("unread") === "true";
    const before = searchParams.get("before");
    const beforeDate = before ? new Date(before) : null;

    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: user.id,
          ...(unreadOnly && { readAt: null }),
          ...(beforeDate && !Number.isNaN(beforeDate.getTime()) && { createdAt: { lt: beforeDate } }),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);

    const page = rows.slice(0, limit);
    const notifications: NotificationRecord[] = page.map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data as unknown as NotificationData,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, notifications, unreadCount, hasMore: rows.length > limit });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Đánh dấu đã đọc: `{ ids: string[] }` hoặc `{ all: true }`. Chỉ tác động lên thông báo của chính mình. */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const { ids, all } = (await req.json().catch(() => ({}))) as { ids?: string[]; all?: boolean };
    if (!all && (!Array.isArray(ids) || ids.length === 0)) return apiError("notificationsNothingToMark");

    const result = await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null, ...(all ? {} : { id: { in: ids } }) },
      data: { readAt: new Date() },
    });
    const unreadCount = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
    return NextResponse.json({ success: true, updated: result.count, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Xóa một thông báo (`?id=`) hoặc tất cả thông báo đã đọc (`?read=true`) của chính mình. */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id && searchParams.get("read") !== "true") return apiError("notificationsNothingToMark");

    const result = await prisma.notification.deleteMany({
      where: { userId: user.id, ...(id ? { id } : { readAt: { not: null } }) },
    });
    const unreadCount = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
    return NextResponse.json({ success: true, deleted: result.count, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}
