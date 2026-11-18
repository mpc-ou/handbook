import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/seed-data";
import { handleApiError, requireAdmin } from "@/lib/authz";
import { apiError } from "@/lib/api-errors";
import { serializeCategory } from "@/lib/serializers";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({
      success: true,
      categories: categories.map(serializeCategory),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { name, slug, description, icon } = await req.json();
    if (!name || typeof name !== "string") {
      return apiError("missingCategoryName");
    }

    const max = await prisma.category.aggregate({ _max: { orderIndex: true } });
    const category = await prisma.category.create({
      data: {
        name,
        slug: slug || slugify(name),
        description: description || "",
        icon: icon || "Folder",
        orderIndex: (max._max.orderIndex ?? -1) + 1,
      },
    });
    return NextResponse.json({ success: true, category: serializeCategory(category) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { id, name, slug, description, icon, orderIndex } = await req.json();
    if (!id) {
      return apiError("missingCategoryId");
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(orderIndex !== undefined && { orderIndex: Number(orderIndex) }),
      },
    });
    return NextResponse.json({ success: true, category: serializeCategory(category) });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Xóa danh mục chỉ gỡ liên kết với khóa học (CourseCategory cascade), không xóa khóa học. */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return apiError("missingCategoryId");
    }
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return handleApiError(error);
  }
}
