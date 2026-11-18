import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/constants";
import { handleApiError, requireAdmin } from "@/lib/authz";
import { apiError } from "@/lib/api-errors";

const fail = apiError;

/** Quản lý thành viên: chỉ ADMIN. Người gọi lấy từ session, không nhận `callerId` từ client. */
export async function PUT(req: NextRequest) {
  try {
    const caller = await requireAdmin();
    const { uid, role, department, managedGroups, managedCourseIds } = await req.json();
    if (!uid) return fail("missingUserId", 422);

    const targetUser = await prisma.user.findUnique({ where: { id: uid } });
    if (!targetUser) return fail("memberNotFound", 404);

    const callerIsSuper = isSuperAdminEmail(caller.email);

    if (isSuperAdminEmail(targetUser.email) && caller.id !== targetUser.id && !callerIsSuper) {
      return fail("superAdminLocked", 403);
    }
    if (!callerIsSuper) {
      if (targetUser.role === "ADMIN" && caller.id !== targetUser.id) {
        return fail("superAdminOnlyEditAdmin", 403);
      }
      if (role === "ADMIN" && targetUser.role !== "ADMIN") {
        return fail("superAdminOnlyAppoint", 403);
      }
    }

    const updated = await prisma.user.update({
      where: { id: uid },
      data: {
        role: role || undefined,
        department: department !== undefined ? department : undefined,
        managedGroups: managedGroups !== undefined ? (managedGroups as Prisma.InputJsonValue) : undefined,
      },
    });

    // Gán khóa học cho EDITOR
    if (managedCourseIds !== undefined) {
      await prisma.courseEditor.deleteMany({ where: { userId: uid } });
      if (Array.isArray(managedCourseIds) && managedCourseIds.length > 0) {
        await prisma.courseEditor.createMany({
          data: (managedCourseIds as string[]).map((courseId) => ({ userId: uid, courseId })),
        });
      }
    }

    const assigned = await prisma.courseEditor.findMany({
      where: { userId: uid },
      select: { courseId: true },
    });

    return NextResponse.json({
      success: true,
      user: {
        uid: updated.id,
        ssoId: updated.ssoId,
        email: updated.email,
        fullName: updated.fullName,
        avatarUrl: updated.avatarUrl || undefined,
        department: updated.department || "",
        managedGroups: (updated.managedGroups as string[]) || [],
        role: updated.role,
        managedCourseIds: assigned.map((a) => a.courseId),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * ADMIN xóa thành viên. Tiến độ, lượt làm bài, bình luận, thích, thông báo của họ bị xóa theo (cascade).
 * Khóa học/chương họ là tác giả được chuyển cho người xóa để không mất nội dung.
 * Không được xóa chính mình, Super Admin; chỉ Super Admin mới xóa được quản trị viên khác.
 */
export async function DELETE(req: NextRequest) {
  try {
    const caller = await requireAdmin();
    const uid = new URL(req.url).searchParams.get("id");
    if (!uid) return fail("missingUserId", 422);
    if (uid === caller.id) return fail("cannotDeleteSelf", 403);

    const target = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, email: true, role: true } });
    if (!target) return fail("memberNotFound", 404);
    if (isSuperAdminEmail(target.email)) return fail("superAdminLocked", 403);
    if (target.role === "ADMIN" && !isSuperAdminEmail(caller.email)) return fail("superAdminOnlyEditAdmin", 403);

    const result = await prisma.$transaction(async (tx) => {
      const courses = await tx.course.updateMany({ where: { authorId: uid }, data: { authorId: caller.id } });
      const items = await tx.item.updateMany({ where: { authorId: uid }, data: { authorId: caller.id } });
      await tx.user.delete({ where: { id: uid } });
      return { transferredCourses: courses.count, transferredItems: items.count };
    });

    return NextResponse.json({ success: true, deletedId: uid, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
