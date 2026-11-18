import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-errors";
import { handleApiError, requireAdmin } from "@/lib/authz";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ success: true, departments });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Tạo/sửa/xóa phòng ban: chỉ ADMIN (sửa tên còn cập nhật phòng ban của mọi thành viên). */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { name, description, color } = await req.json();

    if (!name || !name.trim()) return apiError("deptNameRequired", 400);

    const trimmedName = name.trim();
    const existing = await prisma.department.findUnique({ where: { name: trimmedName } });
    if (existing) return apiError("deptExists", 400);

    const created = await prisma.department.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        color: color || "#f97316",
      },
    });
    return NextResponse.json({ success: true, department: created });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { id, name, description, color } = await req.json();

    if (!id) return apiError("deptMissingIdEdit", 400);
    if (!name || !name.trim()) return apiError("deptNameRequired", 400);

    const trimmedName = name.trim();
    const current = await prisma.department.findUnique({ where: { id } });
    if (!current) return apiError("deptNotFoundEdit", 404);

    if (current.name !== trimmedName) {
      const conflict = await prisma.department.findUnique({ where: { name: trimmedName } });
      if (conflict) return apiError("deptNameInUse", 400);
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        color: color || "#f97316",
      },
    });

    // Đổi tên phòng ban thì cập nhật tham chiếu ở thành viên
    if (current.name !== trimmedName) {
      await prisma.user.updateMany({
        where: { department: current.name },
        data: { department: trimmedName },
      });
    }

    return NextResponse.json({ success: true, department: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return apiError("deptMissingIdDelete", 400);

    const dept = await prisma.department.findUnique({ where: { id } });
    if (!dept) return apiError("deptNotFoundDelete", 404);

    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
