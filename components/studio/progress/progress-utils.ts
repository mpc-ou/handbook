import {
  CourseRecord,
  ItemRecord,
  LessonRecord,
  ProgressSummary,
  QuizAttemptRecord,
  UserProfile,
  UserProgressRecord,
} from "@/types";
import {
  getCourseItemsInOrder,
  getCourseProgress,
  getLessonProgress,
} from "@/lib/progression";

export type UserProgressMap = Record<string, UserProgressRecord>;

export interface LearnerStats {
  user: UserProfile;
  progressByItemId: UserProgressMap;
  courseProgressById: Record<string, ProgressSummary>;
  startedCoursesCount: number;
  completedCoursesCount: number;
  totalCoursesCount: number;
  overallCompletedItems: number;
  overallTotalItems: number;
  overallPercent: number;
  lastAccessedAt: string | null;
  lastAccessedMs: number;
}

export interface OverviewMetrics {
  totalLearners: number;
  avgCompletionPercent: number;
  activeLast7DaysCount: number;
  coursesWithCompletionsCount: number;
  totalCoursesCount: number;
}

export interface CourseSummaryMetrics {
  startedCount: number;
  completedCount: number;
  totalLearners: number;
  avgCompletionPercent: number;
  avgQuizScore: number | null;
  quizPassRate: number | null;
}

export interface LessonCellProgress {
  lessonId: string;
  completed: number;
  total: number;
  percent: number;
}

export interface FunnelItemRow {
  item: ItemRecord;
  lessonTitle: string;
  orderNumber: number;
  completedLearners: number;
  totalLearners: number;
  completionPercent: number;
  avgQuizScore: number | null;
}

export interface QuizAssessmentRow {
  item: ItemRecord;
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  attemptsCount: number;
  avgScore: number | null;
  passRate: number | null;
  pendingCount: number;
}

/**
 * Dựng chỉ mục `userId -> Record<itemId, UserProgressRecord>` từ `allProgress`.
 */
export function buildUserProgressIndex(
  allProgress: UserProgressRecord[],
  allowedItemIds?: Set<string>
): Map<string, UserProgressMap> {
  const index = new Map<string, UserProgressMap>();
  for (const record of allProgress) {
    if (allowedItemIds && !allowedItemIds.has(record.itemId)) continue;
    let userMap = index.get(record.userId);
    if (!userMap) {
      userMap = {};
      index.set(record.userId, userMap);
    }
    userMap[record.itemId] = record;
  }
  return index;
}

function parseValidTimestamp(iso: string | undefined | null): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Tính toán tiến độ tổng và theo từng khóa cho danh sách học viên.
 */
export function computeLearnerStats(
  learners: UserProfile[],
  visibleCourses: CourseRecord[],
  lessons: LessonRecord[],
  items: ItemRecord[],
  progressIndex: Map<string, UserProgressMap>
): LearnerStats[] {
  const courseItemIdsMap = new Map<string, string[]>();
  for (const course of visibleCourses) {
    const orderedItems = getCourseItemsInOrder(course.id, lessons, items);
    courseItemIdsMap.set(
      course.id,
      orderedItems.map((i) => i.id)
    );
  }

  return learners.map((user) => {
    const progressByItemId = progressIndex.get(user.uid) ?? {};
    const courseProgressById: Record<string, ProgressSummary> = {};
    let startedCoursesCount = 0;
    let completedCoursesCount = 0;
    let overallCompletedItems = 0;
    let overallTotalItems = 0;

    for (const course of visibleCourses) {
      const summary = getCourseProgress(
        course.id,
        lessons,
        items,
        progressByItemId
      );
      courseProgressById[course.id] = summary;
      overallCompletedItems += summary.completed;
      overallTotalItems += summary.total;

      const cItemIds = courseItemIdsMap.get(course.id) ?? [];
      const hasAnyProgress =
        summary.completed > 0 ||
        cItemIds.some((id) => Boolean(progressByItemId[id]));
      const isCompleted =
        summary.total > 0 && summary.completed >= summary.total;

      if (hasAnyProgress || isCompleted) {
        startedCoursesCount += 1;
      }
      if (isCompleted) {
        completedCoursesCount += 1;
      }
    }

    const overallPercent =
      overallTotalItems > 0
        ? Math.round((overallCompletedItems / overallTotalItems) * 100)
        : 0;

    let lastAccessedMs = 0;
    let lastAccessedAt: string | null = null;
    for (const rec of Object.values(progressByItemId)) {
      const accessMs = parseValidTimestamp(rec.lastAccessedAt);
      const completeMs = parseValidTimestamp(rec.completedAt);
      const bestMs = Math.max(accessMs, completeMs);
      if (bestMs > lastAccessedMs) {
        lastAccessedMs = bestMs;
        lastAccessedAt =
          accessMs >= completeMs ? rec.lastAccessedAt : rec.completedAt;
      }
    }

    return {
      user,
      progressByItemId,
      courseProgressById,
      startedCoursesCount,
      completedCoursesCount,
      totalCoursesCount: visibleCourses.length,
      overallCompletedItems,
      overallTotalItems,
      overallPercent,
      lastAccessedAt,
      lastAccessedMs,
    };
  });
}

/**
 * Tính 4 chỉ số tổng quan cho hàng thẻ đầu trang.
 */
export function computeOverviewMetrics(
  learnerStats: LearnerStats[],
  visibleCourses: CourseRecord[],
  nowMs: number = Date.now()
): OverviewMetrics {
  const totalLearners = learnerStats.length;
  const avgCompletionPercent =
    totalLearners > 0
      ? Math.round(
          learnerStats.reduce((sum, l) => sum + l.overallPercent, 0) /
            totalLearners
        )
      : 0;

  const sevenDaysAgo = nowMs - 7 * 24 * 60 * 60 * 1000;
  const activeLast7DaysCount = learnerStats.filter(
    (l) => l.lastAccessedMs > 0 && l.lastAccessedMs >= sevenDaysAgo
  ).length;

  const coursesWithCompletionsCount = visibleCourses.filter((course) =>
    learnerStats.some((l) => {
      const prog = l.courseProgressById[course.id];
      return Boolean(prog && prog.total > 0 && prog.completed >= prog.total);
    })
  ).length;

  return {
    totalLearners,
    avgCompletionPercent,
    activeLast7DaysCount,
    coursesWithCompletionsCount,
    totalCoursesCount: visibleCourses.length,
  };
}

/**
 * Tiến độ của một học viên trong một bài học (dùng cho ô ma trận).
 */
export function getLessonCellProgress(
  lessonId: string,
  items: ItemRecord[],
  progressByItemId: UserProgressMap
): LessonCellProgress {
  const summary = getLessonProgress(lessonId, items, progressByItemId);
  if (summary.total > 0) {
    return {
      lessonId,
      completed: summary.completed,
      total: summary.total,
      percent: summary.percent,
    };
  }
  const published = items.filter(
    (i) => i.lessonId === lessonId && i.status === "PUBLISHED"
  );
  if (published.length === 0) {
    return { lessonId, completed: 0, total: 0, percent: 0 };
  }
  const completed = published.filter(
    (i) => progressByItemId[i.id]?.isCompleted
  ).length;
  return {
    lessonId,
    completed,
    total: published.length,
    percent: Math.round((completed / published.length) * 100),
  };
}

/**
 * Thẻ tóm tắt của một khóa học trong tab "Theo khóa học".
 */
export function computeCourseSummaryMetrics(
  courseId: string,
  learnerStats: LearnerStats[],
  lessons: LessonRecord[],
  items: ItemRecord[],
  quizAttempts: QuizAttemptRecord[],
  learnerUidSet: Set<string>
): CourseSummaryMetrics {
  const totalLearners = learnerStats.length;
  const courseItems = getCourseItemsInOrder(courseId, lessons, items);
  const courseItemIdSet = new Set(courseItems.map((i) => i.id));

  let startedCount = 0;
  let completedCount = 0;
  let sumPercent = 0;

  for (const learner of learnerStats) {
    const prog = learner.courseProgressById[courseId] ?? {
      completed: 0,
      total: 0,
      percent: 0,
    };
    sumPercent += prog.percent;

    const isCompleted = prog.total > 0 && prog.completed >= prog.total;
    const hasStarted =
      isCompleted ||
      prog.completed > 0 ||
      courseItems.some((item) => Boolean(learner.progressByItemId[item.id]));

    if (hasStarted) startedCount += 1;
    if (isCompleted) completedCount += 1;
  }

  const avgCompletionPercent =
    totalLearners > 0 ? Math.round(sumPercent / totalLearners) : 0;

  const evaluatedAttempts = quizAttempts.filter(
    (a) =>
      courseItemIdSet.has(a.itemId) &&
      learnerUidSet.has(a.userId) &&
      a.status !== "PENDING_REVIEW"
  );

  const avgQuizScore =
    evaluatedAttempts.length > 0
      ? Math.round(
          evaluatedAttempts.reduce((sum, a) => sum + a.scorePercent, 0) /
            evaluatedAttempts.length
        )
      : null;

  const quizPassRate =
    evaluatedAttempts.length > 0
      ? Math.round(
          (evaluatedAttempts.filter((a) => a.isPassed).length /
            evaluatedAttempts.length) *
            100
        )
      : null;

  return {
    startedCount,
    completedCount,
    totalLearners,
    avgCompletionPercent,
    avgQuizScore,
    quizPassRate,
  };
}

/**
 * Dữ liệu phễu hoàn thành từng chương của khóa học theo thứ tự học phẳng.
 */
export function computeCourseFunnel(
  courseId: string,
  learnerStats: LearnerStats[],
  lessons: LessonRecord[],
  items: ItemRecord[],
  quizAttempts: QuizAttemptRecord[],
  learnerUidSet: Set<string>
): FunnelItemRow[] {
  const orderedItems = getCourseItemsInOrder(courseId, lessons, items);
  const lessonTitleMap = new Map(lessons.map((l) => [l.id, l.title]));
  const totalLearners = learnerStats.length;

  return orderedItems.map((item, idx) => {
    const completedLearners = learnerStats.filter(
      (l) => l.progressByItemId[item.id]?.isCompleted
    ).length;
    const completionPercent =
      totalLearners > 0
        ? Math.round((completedLearners / totalLearners) * 100)
        : 0;

    let avgQuizScore: number | null = null;
    if (item.type === "QUIZ" || item.type === "ASSIGNMENT") {
      const itemAttempts = quizAttempts.filter(
        (a) =>
          a.itemId === item.id &&
          learnerUidSet.has(a.userId) &&
          a.status !== "PENDING_REVIEW"
      );
      if (itemAttempts.length > 0) {
        avgQuizScore = Math.round(
          itemAttempts.reduce((sum, a) => sum + a.scorePercent, 0) /
            itemAttempts.length
        );
      } else {
        const scoredLearners = learnerStats
          .map((l) => l.progressByItemId[item.id]?.highestQuizScore ?? 0)
          .filter((score) => score > 0);
        if (scoredLearners.length > 0) {
          avgQuizScore = Math.round(
            scoredLearners.reduce((sum, s) => sum + s, 0) /
              scoredLearners.length
          );
        }
      }
    }

    return {
      item,
      lessonTitle: lessonTitleMap.get(item.lessonId) ?? "",
      orderNumber: idx + 1,
      completedLearners,
      totalLearners,
      completionPercent,
      avgQuizScore,
    };
  });
}

/**
 * Bảng thống kê các chương loại QUIZ / ASSIGNMENT trong phạm vi khóa học.
 */
export function computeQuizAssessmentRows(
  visibleCourses: CourseRecord[],
  lessons: LessonRecord[],
  items: ItemRecord[],
  quizAttempts: QuizAttemptRecord[],
  learnerUidSet: Set<string>
): QuizAssessmentRow[] {
  const rows: QuizAssessmentRow[] = [];

  for (const course of visibleCourses) {
    const courseLessons = lessons
      .filter((l) => l.courseId === course.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    for (const lesson of courseLessons) {
      const lessonQuizItems = items
        .filter(
          (i) =>
            i.lessonId === lesson.id &&
            (i.type === "QUIZ" || i.type === "ASSIGNMENT")
        )
        .sort((a, b) => a.orderIndex - b.orderIndex);

      for (const item of lessonQuizItems) {
        const itemAttempts = quizAttempts.filter(
          (a) => a.itemId === item.id && learnerUidSet.has(a.userId)
        );
        const attemptsCount = itemAttempts.length;
        const pendingCount = itemAttempts.filter(
          (a) => a.status === "PENDING_REVIEW"
        ).length;
        const evaluated = itemAttempts.filter(
          (a) => a.status !== "PENDING_REVIEW"
        );

        const avgScore =
          evaluated.length > 0
            ? Math.round(
                evaluated.reduce((sum, a) => sum + a.scorePercent, 0) /
                  evaluated.length
              )
            : null;

        const passRate =
          evaluated.length > 0
            ? Math.round(
                (evaluated.filter((a) => a.isPassed).length /
                  evaluated.length) *
                  100
              )
            : null;

        rows.push({
          item,
          courseId: course.id,
          courseTitle: course.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          attemptsCount,
          avgScore,
          passRate,
          pendingCount,
        });
      }
    }
  }

  return rows;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Tạo và tải file CSV có BOM `\uFEFF` để Excel hiển thị đúng tiếng Việt.
 */
export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
