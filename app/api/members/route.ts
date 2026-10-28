import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/constants";

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { uid, role, department, managedGroups, managedCategoryIds, callerId } = body;

    if (!uid) {
      return NextResponse.json({ success: false, error: "Missing user ID" }, { status: 400 });
    }

    // Resolve caller
    let caller = null;
    const resolvedCallerId = callerId || session?.user?.id;
    if (resolvedCallerId) {
      caller = await prisma.user.findUnique({ where: { id: resolvedCallerId } });
    }
    if (!caller && session?.user?.email) {
      caller = await prisma.user.findUnique({ where: { email: session.user.email } });
    }
    if (!caller) {
      caller = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    }

    if (!caller || (caller.role !== "ADMIN" && !isSuperAdminEmail(caller.email))) {
      return NextResponse.json(
        { success: false, error: "You do not have permission to manage members." },
        { status: 403 }
      );
    }

    const isSuperAdmin = isSuperAdminEmail(caller.email);

    // Target user
    const targetUser = await prisma.user.findUnique({ where: { id: uid } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    // If target user is Super Admin, no regular admin can modify
    if (isSuperAdminEmail(targetUser.email) && caller.id !== targetUser.id && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Cannot modify Super Admin account." },
        { status: 403 }
      );
    }

    // If caller is NOT Super Admin:
    if (!isSuperAdmin) {
      // Cannot modify other Admins
      if (targetUser.role === "ADMIN" && caller.id !== targetUser.id) {
        return NextResponse.json(
          { success: false, error: "Only Super Admin can modify Administrator accounts." },
          { status: 403 }
        );
      }
      // Cannot promote anyone to ADMIN
      if (role === "ADMIN" && targetUser.role !== "ADMIN") {
        return NextResponse.json(
          { success: false, error: "Only Super Admin can appoint new Administrators." },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: uid },
      data: {
        role: role || undefined,
        department: department !== undefined ? department : undefined,
        managedGroups: managedGroups !== undefined ? managedGroups : undefined,
      },
    });

    // Update managed categories if role is EDITOR
    if (managedCategoryIds !== undefined) {
      await prisma.categoryEditor.deleteMany({ where: { userId: uid } });
      if (Array.isArray(managedCategoryIds) && managedCategoryIds.length > 0) {
        await prisma.categoryEditor.createMany({
          data: managedCategoryIds.map((catId: string) => ({
            userId: uid,
            categoryId: catId,
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        uid: updated.id,
        ssoId: updated.ssoId,
        email: updated.email,
        fullName: updated.fullName,
        avatarUrl: updated.avatarUrl || undefined,
        department: updated.department || "",
        managedGroups: (updated.managedGroups as any) || [],
        role: updated.role,
        managedCategoryIds: managedCategoryIds || [],
      },
    });
  } catch (error: any) {
    console.error("Error updating member in Postgres:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
