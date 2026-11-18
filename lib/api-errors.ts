import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

/**
 * Trả về lỗi API đã dịch theo ngôn ngữ của người gọi (cookie NEXT_LOCALE).
 * `code` là khóa trong messages/<locale>/errors.json; `params` là biến ICU của thông điệp.
 * Phần `extra` được gộp vào payload (ví dụ requireConfirmation + số lượng).
 */
export async function apiError(
  code: string,
  status = 422,
  params?: Record<string, string | number>,
  extra?: Record<string, unknown>
) {
  const t = await getTranslations("errors");
  return NextResponse.json({ success: false, error: t(code, params), code, ...extra }, { status });
}
