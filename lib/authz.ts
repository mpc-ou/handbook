import { Prisma, type Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/constants";
import { apiError } from "@/lib/api-errors";

export interface AuthedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

/**
 * Lỗi có HTTP status, ném từ guard và được `handleApiError` đổi thành response.
 * `code` là khóa trong messages/<locale>/errors.json (dịch theo ngôn ngữ người gọi).
 */
export class HttpError extends Error {
  constructor(
    public status: 401 | 403 | 404,
    public code: string,
    public params?: Record<string, string | number>
  ) {
    super(code);
  }
}

/**
 * Lấy user hiện tại từ session (tra DB theo email, không tin dữ liệu client gửi).
 * Ném 401 nếu chưa đăng nhập.
 */
export async function requireUser(): Promise<AuthedUser> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) throw new HttpError(401, "unauthenticated");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true, role: true },
  });
  if (!user) throw new HttpError(401, "accountNotFound");

  // Super admin theo biến môi trường luôn là ADMIN
  if (isSuperAdminEmail(user.email)) return { ...user, role: "ADMIN" };
  return user;
}

/** Chỉ ADMIN. */
export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new HttpError(403, "adminOnly");
  return user;
}

/** ADMIN hoặc EDITOR (chưa kiểm tra khóa học cụ thể). */
export async function requireStaff(): Promise<AuthedUser> {
  const user = await requireUser();
  if (user.role === "MEMBER") throw new HttpError(403, "staffOnly");
  return user;
}

/**
 * ADMIN: mọi khóa học. EDITOR: chỉ khóa học được gán qua CourseEditor.
 * Truyền `courseId = null` khi tạo khóa học mới (chỉ ADMIN/EDITOR nói chung).
 */
export async function requireCourseEditor(courseId: string | null): Promise<AuthedUser> {
  const user = await requireStaff();
  if (user.role === "ADMIN" || courseId === null) return user;

  const assigned = await prisma.courseEditor.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { id: true },
  });
  if (!assigned) throw new HttpError(403, "courseNotAssigned");
  return user;
}

/** Quyền sửa theo bài học (tra courseId rồi gọi requireCourseEditor). */
export async function requireLessonEditor(lessonId: string): Promise<AuthedUser> {
  await requireStaff(); // xác thực trước khi tra DB để không lộ sự tồn tại của dữ liệu
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
  if (!lesson) throw new HttpError(404, "lessonNotFound");
  return requireCourseEditor(lesson.courseId);
}

/** Quyền sửa theo item (tra lesson → course). */
export async function requireItemEditor(itemId: string): Promise<AuthedUser> {
  await requireStaff();
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { lesson: { select: { courseId: true } } },
  });
  if (!item) throw new HttpError(404, "itemNotFound");
  return requireCourseEditor(item.lesson.courseId);
}

/**
 * Dùng trong `catch` của route handler:
 *   catch (e) { return handleApiError(e) }
 * HttpError → đúng status + thông điệp dịch; lỗi Prisma quen thuộc → 409/404; còn lại → 500 và log.
 */
export async function handleApiError(error: unknown) {
  if (error instanceof HttpError) {
    return apiError(error.code, error.status, error.params);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return apiError("slugExists", 409);
    if (error.code === "P2025") return apiError("dataNotFound", 404);
  }
  console.error("API error:", error);
  return apiError("serverError", 500);
}
