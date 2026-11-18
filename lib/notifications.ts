import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NotificationData } from "@/types";

/** Ưu tiên khi một người đủ điều kiện nhận nhiều loại cho cùng một bình luận: chỉ nhận loại cao nhất. */
const COMMENT_PRIORITY: Partial<Record<NotificationType, number>> = { MENTION: 3, REPLY: 2, COMMENT: 1 };

const MENTION_TOKEN = /<@([\w-]+)>/g;

export function extractMentionIds(content: string): string[] {
  return Array.from(new Set(Array.from(content.matchAll(MENTION_TOKEN), (m) => m[1])));
}

function makeExcerpt(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

/** Ngữ cảnh item → đường dẫn + tiêu đề, dùng chung cho mọi loại thông báo. */
async function itemContext(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      title: true,
      slug: true,
      authorId: true,
      lesson: {
        select: {
          slug: true,
          course: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  });
  if (!item) return null;
  const { course } = item.lesson;
  return {
    itemId: item.id,
    itemTitle: item.title,
    authorId: item.authorId,
    courseId: course.id,
    courseTitle: course.title,
    href: `/learn/${course.slug}/${item.lesson.slug}/${item.slug}`,
    courseSlug: course.slug,
  };
}

/** Admin + người được giao quản lý khóa học đó. */
async function staffIdsForCourse(courseId: string): Promise<string[]> {
  const [admins, editors] = await Promise.all([
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
    prisma.courseEditor.findMany({ where: { courseId }, select: { userId: true } }),
  ]);
  return Array.from(new Set([...admins.map((a) => a.id), ...editors.map((e) => e.userId)]));
}

async function adminIds(): Promise<string[]> {
  return (await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } })).map((u) => u.id);
}

async function createMany(rows: Array<{ userId: string; type: NotificationType; data: NotificationData }>) {
  if (rows.length === 0) return;
  await prisma.notification.createMany({
    data: rows.map((r) => ({ userId: r.userId, type: r.type, data: r.data as unknown as Prisma.InputJsonValue })),
  });
}

/**
 * Thông báo cho một bình luận mới:
 *  - MENTION: người bị nhắc tên (`<@userId>` trong nội dung)
 *  - REPLY: tác giả bình luận được trả lời
 *  - COMMENT: tác giả chương, người được giao khóa học, và MỌI admin
 * Mỗi người chỉ nhận một thông báo (loại ưu tiên cao nhất); người bình luận không tự nhận.
 */
export async function notifyNewComment(params: {
  actor: { id: string; fullName: string; avatarUrl?: string | null };
  itemId: string;
  commentId: string;
  content: string;
  parentAuthorId?: string | null;
}) {
  const ctx = await itemContext(params.itemId);
  if (!ctx) return;

  const mentionIds = extractMentionIds(params.content);
  const mentioned = mentionIds.length
    ? await prisma.user.findMany({ where: { id: { in: mentionIds } }, select: { id: true, fullName: true } })
    : [];
  const names = new Map(mentioned.map((u) => [u.id, u.fullName]));
  const excerpt = makeExcerpt(
    params.content.replace(MENTION_TOKEN, (_m, id: string) => `@${names.get(id) ?? ""}`.trim())
  );

  const best = new Map<string, NotificationType>();
  const offer = (userId: string | null | undefined, type: NotificationType) => {
    if (!userId || userId === params.actor.id) return;
    const current = best.get(userId);
    if (!current || (COMMENT_PRIORITY[type] ?? 0) > (COMMENT_PRIORITY[current] ?? 0)) best.set(userId, type);
  };

  mentioned.forEach((u) => offer(u.id, "MENTION"));
  offer(params.parentAuthorId, "REPLY");
  offer(ctx.authorId, "COMMENT");
  (await staffIdsForCourse(ctx.courseId)).forEach((id) => offer(id, "COMMENT"));

  const data: NotificationData = {
    actorId: params.actor.id,
    actorName: params.actor.fullName,
    actorAvatarUrl: params.actor.avatarUrl ?? null,
    courseId: ctx.courseId,
    courseTitle: ctx.courseTitle,
    itemTitle: ctx.itemTitle,
    excerpt,
    href: `${ctx.href}#comment-${params.commentId}`,
  };
  await createMany(Array.from(best, ([userId, type]) => ({ userId, type, data })));
}

/**
 * Gọi khi một item vừa được hoàn thành lần đầu. Nếu đó là item cuối cùng của khóa:
 * học viên nhận CERTIFICATE_READY, mọi admin nhận COURSE_COMPLETED. Chỉ báo một lần mỗi (học viên, khóa).
 */
export async function notifyIfCourseCompleted(userId: string, itemId: string) {
  const ctx = await itemContext(itemId);
  if (!ctx) return;

  const required = await prisma.item.findMany({
    where: { status: "PUBLISHED", isRequired: true, lesson: { courseId: ctx.courseId, isPublished: true } },
    select: { id: true },
  });
  if (required.length === 0) return;
  const done = await prisma.userProgress.count({
    where: { userId, isCompleted: true, itemId: { in: required.map((r) => r.id) } },
  });
  if (done < required.length) return;

  const already = await prisma.notification.findFirst({
    where: { userId, type: "CERTIFICATE_READY", data: { path: ["courseId"], equals: ctx.courseId } },
    select: { id: true },
  });
  if (already) return;

  const learner = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, avatarUrl: true },
  });
  if (!learner) return;

  const base = {
    actorId: learner.id,
    actorName: learner.fullName,
    actorAvatarUrl: learner.avatarUrl,
    courseId: ctx.courseId,
    courseTitle: ctx.courseTitle,
  };
  const admins = (await adminIds()).filter((id) => id !== userId);
  await createMany([
    { userId, type: "CERTIFICATE_READY", data: { ...base, href: `/learn/${ctx.courseSlug}/certificate` } },
    ...admins.map((id) => ({
      userId: id,
      type: "COURSE_COMPLETED" as const,
      data: { ...base, href: "/studio/progress" },
    })),
  ]);
}

/** Bài tập nộp xong đang chờ chấm → báo staff của khóa học. */
export async function notifyAssignmentSubmitted(learnerId: string, itemId: string) {
  const [ctx, learner] = await Promise.all([
    itemContext(itemId),
    prisma.user.findUnique({ where: { id: learnerId }, select: { id: true, fullName: true, avatarUrl: true } }),
  ]);
  if (!ctx || !learner) return;
  const staff = (await staffIdsForCourse(ctx.courseId)).filter((id) => id !== learnerId);
  const data: NotificationData = {
    actorId: learner.id,
    actorName: learner.fullName,
    actorAvatarUrl: learner.avatarUrl,
    courseId: ctx.courseId,
    courseTitle: ctx.courseTitle,
    itemTitle: ctx.itemTitle,
    href: "/studio/quizzes",
  };
  await createMany(staff.map((userId) => ({ userId, type: "ASSIGNMENT_SUBMITTED" as const, data })));
}

/** Bài tập đã được chấm → báo học viên. */
export async function notifyAssignmentGraded(params: {
  learnerId: string;
  itemId: string;
  grader: { id: string; fullName: string };
  score: number;
}) {
  if (params.learnerId === params.grader.id) return;
  const ctx = await itemContext(params.itemId);
  if (!ctx) return;
  await createMany([
    {
      userId: params.learnerId,
      type: "ASSIGNMENT_GRADED",
      data: {
        actorId: params.grader.id,
        actorName: params.grader.fullName,
        courseId: ctx.courseId,
        courseTitle: ctx.courseTitle,
        itemTitle: ctx.itemTitle,
        score: params.score,
        href: ctx.href,
      },
    },
  ]);
}

/** Thông báo là việc phụ: không bao giờ làm hỏng request chính. */
export function fireAndForget(task: Promise<unknown>) {
  task.catch((error) => console.error("notification failed:", error));
}
