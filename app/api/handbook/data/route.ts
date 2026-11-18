import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/constants";
import { apiError } from "@/lib/api-errors";
import { canUserViewCourse, stripQuizAnswersForClient } from "@/lib/progression";
import {
  courseInclude,
  itemInclude,
  serializeCategory,
  serializeCourse,
  serializeItem,
  serializeLesson,
} from "@/lib/serializers";
import type { QuizQuestion } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_DEPTS = [
  { name: "Executive Board", description: "General leadership and overall club operations", color: "#8b5cf6" },
  { name: "Tech & Academic Board", description: "R&D, technology innovation and technical curriculum", color: "#3b82f6" },
  { name: "Media & Events Board", description: "External relations, graphic design and event playbooks", color: "#ec4899" },
  { name: "HR & External Affairs", description: "Member engagement, internal culture and sponsor relations", color: "#f59e0b" },
];

/**
 * Tải toàn bộ dữ liệu cho client, lọc theo người xem:
 * - Khách / thành viên: chỉ nội dung đã xuất bản thuộc khóa học họ được xem,
 *   đáp án quiz bị loại bỏ, chỉ thấy tiến độ + lượt làm bài của chính mình.
 * - ADMIN / EDITOR: thấy tất cả (kể cả nháp), toàn bộ thành viên và tiến độ.
 */
export async function GET() {
  try {
    const session = await auth();
    const email = session?.user?.email;
    const me = email
      ? await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, role: true, department: true, managedGroups: true },
        })
      : null;
    const role = me && isSuperAdminEmail(me.email) ? "ADMIN" : me?.role;
    const isStaff = role === "ADMIN" || role === "EDITOR";

    let departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
    if (departments.length === 0) {
      for (const d of DEFAULT_DEPTS) {
        await prisma.department.create({ data: d }).catch(() => {});
      }
      departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
    }

    const [categories, courses, lessons, items, users, progress, attempts] = await Promise.all([
      prisma.category.findMany({ orderBy: [{ orderIndex: "asc" }, { name: "asc" }] }),
      prisma.course.findMany({
        where: isStaff ? undefined : { status: "PUBLISHED" },
        include: courseInclude,
        orderBy: { orderIndex: "asc" },
      }),
      prisma.lesson.findMany({
        where: isStaff ? undefined : { isPublished: true, course: { status: "PUBLISHED" } },
        orderBy: [{ courseId: "asc" }, { orderIndex: "asc" }],
      }),
      prisma.item.findMany({
        where: isStaff ? undefined : { status: "PUBLISHED", lesson: { isPublished: true, course: { status: "PUBLISHED" } } },
        include: itemInclude,
        orderBy: [{ lessonId: "asc" }, { orderIndex: "asc" }],
      }),
      prisma.user.findMany({
        include: { managedCourses: true },
        orderBy: { fullName: "asc" },
      }),
      prisma.userProgress.findMany({ where: isStaff ? undefined : { userId: me?.id ?? "" } }),
      prisma.quizAttempt.findMany({
        where: isStaff ? undefined : { userId: me?.id ?? "" },
        include: {
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true, department: true } },
          quiz: { select: { id: true, title: true, item: { select: { id: true, title: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Khóa học mà người xem không đủ quyền (INTERNAL / nhóm bị giới hạn) thì ẩn cả cây nội dung
    const viewer = me
      ? { role: role ?? me.role, department: me.department ?? "", managedGroups: (me.managedGroups as string[]) ?? [] }
      : null;
    const visibleCourses = courses.filter(
      (c) => isStaff || canUserViewCourse(viewer, { audience: c.audience, allowedGroups: (c.allowedGroups as string[]) ?? [] }).allowed
    );
    const visibleCourseIds = new Set(visibleCourses.map((c) => c.id));
    const visibleLessons = lessons.filter((l) => visibleCourseIds.has(l.courseId));
    const visibleLessonIds = new Set(visibleLessons.map((l) => l.id));
    const visibleItems = items.filter((i) => visibleLessonIds.has(i.lessonId));

    const clientItems = visibleItems.map((i) => {
      const record = serializeItem(i);
      if (isStaff) return record;
      // Không để lộ đáp án/giải thích trong state phía client; việc chấm điểm luôn ở server
      return {
        ...record,
        quizQuestions: stripQuizAnswersForClient(record.quizQuestions).map(
          (q): QuizQuestion => ({ ...q, correctOptionIds: [] })
        ),
      };
    });

    return NextResponse.json(
      {
        success: true,
        categories: categories.map(serializeCategory),
        courses: visibleCourses.map(serializeCourse),
        lessons: visibleLessons.map(serializeLesson),
        items: clientItems,
        // Nhân sự khác chỉ lộ tên/avatar/phòng ban (đủ để hiển thị @mention); email, ssoId, nhóm quản lý chỉ staff hoặc chính chủ thấy
        allUsers: users.map((u) => {
          const full = isStaff || u.id === me?.id;
          return {
            uid: u.id,
            ssoId: full ? u.ssoId : "",
            email: full ? u.email : "",
            fullName: u.fullName,
            avatarUrl: u.avatarUrl || undefined,
            department: u.department || "",
            managedGroups: full ? ((u.managedGroups as string[]) || []) : [],
            role: u.role,
            noPassword: full ? Boolean(u.noPassword) : false,
            managedCourseIds: full ? u.managedCourses.map((m) => m.courseId) : [],
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString(),
          };
        }),
        allProgress: progress.map((p) => ({
          id: p.id,
          userId: p.userId,
          itemId: p.itemId,
          hasScrolledBottom: p.hasScrolledBottom,
          highestQuizScore: p.highestQuizScore ?? 0,
          isCompleted: p.isCompleted,
          completedAt: p.completedAt ? p.completedAt.toISOString() : null,
          lastAccessedAt: p.lastAccessedAt.toISOString(),
        })),
        quizAttempts: attempts.map((a) => ({
          id: a.id,
          userId: a.userId,
          userFullName: a.user?.fullName || "Member",
          userEmail: a.user?.email || "",
          userAvatarUrl: a.user?.avatarUrl || undefined,
          userDepartment: a.user?.department || "",
          quizId: a.quizId,
          itemId: a.quiz?.item?.id || a.quizId,
          itemTitle: a.quiz?.item?.title || a.quiz?.title || "Bài kiểm tra",
          scorePercent: a.scorePercent,
          // Bài làm (đáp án) chỉ ADMIN/EDITOR hoặc chính chủ mới thấy
          answers: a.answers as Record<string, string[]>,
          isPassed: a.isPassed,
          timeSpentSec: a.timeSpentSec ?? undefined,
          status: a.status,
          feedback: a.feedback || undefined,
          createdAt: a.createdAt.toISOString(),
        })),
        departments: departments.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          color: d.color,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        })),
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("Failed to load PostgreSQL handbook data:", error);
    return apiError("serverError", 500);
  }
}
