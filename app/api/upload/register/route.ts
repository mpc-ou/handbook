import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractPublicIdFromUrl } from "@/lib/cloudinary-server";
import { handleApiError, requireStaff } from "@/lib/authz";
import { apiError } from "@/lib/api-errors";

/**
 * Ghi nhận file vừa upload để cron dọn dẹp theo dõi (isAttached=false cho tới khi
 * được lưu vào Course/Lesson/Item). Chỉ ADMIN/EDITOR; `publicId` phải khớp URL và
 * nằm trong thư mục được quản lý, và không ghi đè file đã đăng ký trước đó.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireStaff();
    const { publicId, url, bytes, format } = await req.json();

    if (!publicId || !url) {
      return apiError("missingUploadFields");
    }
    if (extractPublicIdFromUrl(url) !== publicId) {
      return apiError("publicIdMismatch");
    }

    const file = await prisma.uploadedFile.upsert({
      where: { publicId },
      update: {},
      create: {
        publicId,
        url,
        bytes: bytes || null,
        format: format || null,
        uploaderId: user.id,
        isAttached: false,
      },
    });

    return NextResponse.json({ success: true, file });
  } catch (error) {
    return handleApiError(error);
  }
}
