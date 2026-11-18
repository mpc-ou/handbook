import {
  ClientQuizQuestion,
  CourseRecord,
  ItemAccessResult,
  ItemRecord,
  LessonRecord,
  ProgressSummary,
  QuizQuestion,
  UserProfile,
  UserProgressRecord,
} from "@/types";

type ProgressMap = Record<string, UserProgressRecord>;

/**
 * Cờ "học theo thứ tự" hiệu lực của một Item:
 * item.requirePrevious ?? lesson.requirePrevious ?? course.sequential
 */
export function isSequential(
  course: Pick<CourseRecord, "sequential">,
  lesson: Pick<LessonRecord, "requirePrevious">,
  item: Pick<ItemRecord, "requirePrevious">
): boolean {
  return item.requirePrevious ?? lesson.requirePrevious ?? course.sequential;
}

/**
 * Danh sách Item đã xuất bản của một khóa theo thứ tự học phẳng:
 * (lesson.orderIndex, item.orderIndex). Bỏ Lesson chưa xuất bản.
 */
export function getCourseItemsInOrder(
  courseId: string,
  lessons: LessonRecord[],
  items: ItemRecord[]
): ItemRecord[] {
  const orderedLessons = lessons
    .filter((l) => l.courseId === courseId && l.isPublished)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return orderedLessons.flatMap((l) =>
    items
      .filter((i) => i.lessonId === l.id && i.status === "PUBLISHED")
      .sort((a, b) => a.orderIndex - b.orderIndex)
  );
}

/**
 * Kiểm tra thành viên có được mở Item hay không theo cấu hình thứ tự học.
 * Chặn bởi Item bắt buộc (`isRequired`) đã xuất bản ngay trước đó trong khóa
 * nếu nó chưa hoàn thành.
 */
export function checkItemAccess(
  itemId: string,
  courses: CourseRecord[],
  lessons: LessonRecord[],
  items: ItemRecord[],
  userProgressMap: ProgressMap
): ItemAccessResult {
  const item = items.find((i) => i.id === itemId);
  const lesson = item && lessons.find((l) => l.id === item.lessonId);
  const course = lesson && courses.find((c) => c.id === lesson.courseId);
  if (!item || !lesson || !course) {
    return { allowed: false, reason: "NOT_FOUND", blockingItem: null };
  }

  if (!isSequential(course, lesson, item)) {
    return { allowed: true, reason: null, blockingItem: null };
  }

  const ordered = getCourseItemsInOrder(course.id, lessons, items);
  const index = ordered.findIndex((i) => i.id === item.id);
  const previous = ordered
    .slice(0, index < 0 ? 0 : index)
    .reverse()
    .find((i) => i.isRequired);

  if (previous && !userProgressMap[previous.id]?.isCompleted) {
    return {
      allowed: false,
      reason: "PREVIOUS_INCOMPLETE",
      blockingItem: {
        id: previous.id,
        title: previous.title,
        slug: previous.slug,
        lessonId: previous.lessonId,
      },
    };
  }

  return { allowed: true, reason: null, blockingItem: null };
}

function summarize(items: ItemRecord[], progress: ProgressMap): ProgressSummary {
  const required = items.filter((i) => i.isRequired);
  const completed = required.filter((i) => progress[i.id]?.isCompleted).length;
  const total = required.length;
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

/** Tiến độ một bài học (suy ra từ Item, không lưu DB). */
export function getLessonProgress(
  lessonId: string,
  items: ItemRecord[],
  progress: ProgressMap
): ProgressSummary {
  return summarize(
    items.filter((i) => i.lessonId === lessonId && i.status === "PUBLISHED"),
    progress
  );
}

/** Tiến độ một khóa học (suy ra từ Item, không lưu DB). */
export function getCourseProgress(
  courseId: string,
  lessons: LessonRecord[],
  items: ItemRecord[],
  progress: ProgressMap
): ProgressSummary {
  return summarize(getCourseItemsInOrder(courseId, lessons, items), progress);
}

/**
 * Loại `correctOptionIds` và `explanation` khỏi QuizQuestion[] trước khi render
 * phía client để đáp án không lộ trong DOM/state.
 */
export function stripQuizAnswersForClient(
  questions: QuizQuestion[]
): ClientQuizQuestion[] {
  return (questions || []).map((q) => ({
    id: q.id,
    questionText: q.questionText,
    type: q.type,
    options: (q.options || []).map((opt) => ({
      id: opt.id,
      text: opt.text,
    })),
    scaleMax: q.scaleMax,
    scaleMinLabel: q.scaleMinLabel,
    scaleMaxLabel: q.scaleMaxLabel,
    fileAcceptedTypes: q.fileAcceptedTypes,
    attachmentType: q.attachmentType,
    attachmentUrl: q.attachmentUrl,
    attachmentCaption: q.attachmentCaption,
    sampleCode: q.sampleCode,
  }));
}

/**
 * Quyền quản lý khóa học phía client (chỉ để ẩn/hiện UI; server vẫn kiểm tra
 * bằng `requireCourseEditor` trong `lib/authz.ts`).
 * ADMIN: mọi khóa. EDITOR: khóa được gán. MEMBER: không.
 */
export function canUserManageCourse(
  user: UserProfile | null,
  courseId: string
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "EDITOR") return (user.managedCourseIds || []).includes(courseId);
  return false;
}

/**
 * Quyền xem khóa học:
 * - audience FREE: khách xem được không cần đăng nhập.
 * - audience INTERNAL: cần đăng nhập, rồi kiểm `allowedGroups`.
 */
export function canUserViewCourse(
  user: Pick<UserProfile, "role" | "department" | "managedGroups"> | null,
  course: Pick<CourseRecord, "audience" | "allowedGroups">
): {
  allowed: boolean;
  reason?: "LOGIN_REQUIRED" | "GROUP_RESTRICTED";
  allowedGroups?: string[];
} {
  const groups = course.allowedGroups || [];

  if (course.audience === "FREE") return { allowed: true };

  if (!user) {
    return { allowed: false, reason: "LOGIN_REQUIRED", allowedGroups: groups };
  }

  if (user.role === "ADMIN") return { allowed: true };
  if (groups.length === 0) return { allowed: true };

  const userDept = user.department?.trim();
  if (userDept && groups.includes(userDept)) return { allowed: true };

  if ((user.managedGroups || []).some((g) => groups.includes(g))) {
    return { allowed: true };
  }

  return { allowed: false, reason: "GROUP_RESTRICTED", allowedGroups: groups };
}
