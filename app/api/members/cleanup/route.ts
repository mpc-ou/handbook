import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-errors";
import { handleApiError, requireAdmin } from "@/lib/authz";
import { isSuperAdminEmail } from "@/lib/constants";

type CleanupAction = "progress" | "attempts" | "comments";
const ACTIONS: readonly CleanupAction[] = ["progress", "attempts", "comments"];

/**
 * ADMIN dọn dữ liệu học tập của một thành viên, toàn bộ hoặc theo một khóa học:
 *  - progress: tiến độ (UserProgress) — học viên phải học/đọc lại để hoàn thành
 *  - attempts: lượt làm trắc nghiệm/bài tập (QuizAttempt)
 *  - comments: bình luận
 * Trả về số bản ghi đã xóa cho từng loại.
 */
export async function POST(req: NextRequest) {
  try {
    const caller = await requireAdmin();
    const { userId, actions, courseId } = (await req.json().catch(() => ({}))) as {
      userId?: string;
      actions?: CleanupAction[];
      courseId?: string | null;
    };

    if (!userId) return apiError("missingUserId");
    const chosen = Array.from(new Set((actions ?? []).filter((a) => ACTIONS.includes(a))));
    if (chosen.length === 0) return apiError("cleanupNoAction");

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
    if (!target) return apiError("memberNotFound", 404);
    // Chỉ Super Admin mới được động tới dữ liệu của quản trị viên khác
    if (target.id !== caller.id && target.role === "ADMIN" && !isSuperAdminEmail(caller.email)) {
      return apiError("superAdminOnlyEditAdmin", 403);
    }

    if (courseId) {
      const exists = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
      if (!exists) return apiError("courseNotFound", 404);
    }
    const itemScope = courseId ? { lesson: { courseId } } : {};

    const deleted = { progress: 0, attempts: 0, comments: 0 };
    await prisma.$transaction(async (tx) => {
      if (chosen.includes("progress")) {
        deleted.progress = (await tx.userProgress.deleteMany({ where: { userId, item: itemScope } })).count;
      }
      if (chosen.includes("attempts")) {
        deleted.attempts = (await tx.quizAttempt.deleteMany({ where: { userId, quiz: { item: itemScope } } })).count;
      }
      if (chosen.includes("comments")) {
        deleted.comments = (await tx.comment.deleteMany({ where: { userId, item: itemScope } })).count;
      }
    });

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    return handleApiError(error);
  }
}
