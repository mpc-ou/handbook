import { NextResponse } from "next/server";
import crypto from "crypto";
import { handleApiError, requireUser } from "@/lib/authz";

/**
 * Người dùng đã đăng nhập được ký upload lên Cloudinary (soạn nội dung hoặc nộp file bài tập).
 * File của học viên không được `register`, nên cron dọn dẹp không xóa chúng.
 */
export async function POST() {
  try {
    await requireUser();
  } catch (error) {
    return handleApiError(error);
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          "Incomplete Cloudinary configuration (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). Please configure your API credentials to upload images.",
      },
      { status: 400 }
    );
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = "mpc_handbook_assets";

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

  return NextResponse.json({
    timestamp,
    folder,
    signature,
    apiKey,
    cloudName,
  });
}
