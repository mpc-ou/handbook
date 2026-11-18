import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireUser } from "@/lib/authz";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: itemId } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.itemLike.findUnique({
        where: { userId_itemId: { userId: user.id, itemId } },
      });

      if (existing) {
        await tx.itemLike.delete({ where: { id: existing.id } });
      } else {
        await tx.itemLike.create({ data: { userId: user.id, itemId } });
      }

      // Đếm lại từ bảng like để likesCount không bao giờ lệch hay âm
      const likesCount = await tx.itemLike.count({ where: { itemId } });
      await tx.item.update({ where: { id: itemId }, data: { likesCount } });
      return { isLiked: !existing, likesCount };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
