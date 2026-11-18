import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isEmailLoginEnabled } from "@/lib/constants";
import { apiError } from "@/lib/api-errors";

export async function POST(req: NextRequest) {
  try {
    // If EMAIL_LOGIN is disabled, password operations are also disabled
    if (!isEmailLoginEnabled()) {
      return apiError("passwordFeatureDisabled", 403);
    }

    const session = await auth();
    if (!session?.user?.email) {
      return apiError("unauthenticated", 401);
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return apiError("passwordTooShort", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return apiError("accountNotFound", 404);
    }

    // If user already has a password (noPassword is false or passwordHash exists),
    // require current password verification
    if (!user.noPassword && user.passwordHash) {
      if (!currentPassword) {
        return apiError("currentPasswordRequired", 400);
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return apiError("currentPasswordIncorrect", 400);
      }
    }

    // Hash new password and clear noPassword flag
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        noPassword: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: user.noPassword
        ? "Password created successfully. You can now log in using email and password."
        : "Password updated successfully.",
    });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update password." },
      { status: 500 }
    );
  }
}
