import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/authz";

/** Bộ đếm lượt xem công khai — không cần đăng nhập. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: itemId } = await params;
    const item = await prisma.item.update({
      where: { id: itemId },
      data: { viewsCount: { increment: 1 } },
      select: { viewsCount: true },
    });
    return NextResponse.json({ success: true, viewsCount: item.viewsCount });
  } catch (error) {
    return handleApiError(error);
  }
}
