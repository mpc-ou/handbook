export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Mỗi namespace là một file messages/<locale>/<namespace>.json.
 * Thêm namespace mới: thêm vào đây và tạo file ở CẢ HAI ngôn ngữ.
 */
export const NAMESPACES = [
  "common", // nút/nhãn dùng chung, trạng thái, ngày giờ, lỗi chung
  "nav", // header, sidebar, breadcrumb, chuyển ngôn ngữ/giao diện
  "home", // trang chủ
  "course", // trang khóa học + bài học
  "reader", // đọc chương, thanh công cụ đọc, phím tắt
  "quiz", // trắc nghiệm + bài tập
  "studio", // dashboard, trình dựng giáo trình, cài đặt, AdminLayout, ConfirmDialog/PageHeader
  "studioItems", // danh sách + trình soạn chương/bài tập, trang quizzes, trang members
  "editor", // components/editor/* (BlockNoteEditor, QuizBuilder, AttachmentManager, CoverImagePicker, ImageCropDialog)
  "progress", // tiến độ học viên (admin) + thành tích + chuỗi ngày
  "profile", // hồ sơ cá nhân
  "search", // tìm kiếm toàn cục
  "companion", // linh vật
  "auth", // đăng nhập, quyền truy cập
  "certificate", // chứng nhận hoàn thành
  "errors", // thông báo lỗi từ API
  "seo", // metadata, Open Graph, ảnh xem trước liên kết
] as const;
export type Namespace = (typeof NAMESPACES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
