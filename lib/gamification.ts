import type {
  CourseRecord,
  ItemRecord,
  LessonRecord,
  QuizAttemptRecord,
  UserProgressRecord,
} from "@/types";
import { getCourseProgress } from "@/lib/progression";

/** Ngày dạng YYYY-MM-DD theo giờ máy người dùng. */
export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

export interface StreakSummary {
  /** Số ngày học liên tục tính đến hôm nay (hoặc hôm qua nếu hôm nay chưa học). */
  current: number;
  longest: number;
  activeToday: boolean;
  /** Các ngày có hoàn thành nội dung, YYYY-MM-DD. */
  activeDays: string[];
}

/**
 * Chuỗi ngày học, tính từ ngày hoàn thành chương/bài tập (`completedAt`).
 * Chuỗi còn giữ nếu hôm qua có học nhưng hôm nay chưa (để không "mất chuỗi" trước khi hết ngày).
 */
export function computeStreak(
  progress: ReadonlyArray<Pick<UserProgressRecord, "completedAt" | "isCompleted">>,
  now: Date = new Date()
): StreakSummary {
  const days = new Set<string>();
  for (const p of progress) {
    if (!p.isCompleted || !p.completedAt) continue;
    const d = new Date(p.completedAt);
    if (!Number.isNaN(d.getTime())) days.add(toDayKey(d));
  }

  const today = toDayKey(now);
  const activeToday = days.has(today);

  let current = 0;
  let cursor = activeToday ? now : addDays(now, -1);
  while (days.has(toDayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const sorted = Array.from(days).sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    run = prev && toDayKey(addDays(prev, 1)) === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = date;
  }

  return { current, longest, activeToday, activeDays: sorted };
}

export type AchievementId =
  | "first_chapter"
  | "chapters_5"
  | "chapters_20"
  | "first_quiz_passed"
  | "perfect_score"
  | "first_course_complete"
  | "streak_3"
  | "streak_7"
  | "streak_30";

export interface Achievement {
  id: AchievementId;
  unlocked: boolean;
  /** Tiến độ tới mốc (để hiện thanh), ví dụ 3/5 chương. */
  value: number;
  target: number;
}

export interface AchievementContext {
  progress: ReadonlyArray<UserProgressRecord>;
  courses: ReadonlyArray<CourseRecord>;
  lessons: ReadonlyArray<LessonRecord>;
  items: ReadonlyArray<ItemRecord>;
  attempts: ReadonlyArray<Pick<QuizAttemptRecord, "isPassed" | "scorePercent" | "status">>;
}

/**
 * Tính toàn bộ thành tích từ dữ liệu có sẵn (không lưu DB).
 * Chỉ tên/id; hiển thị nhãn và mô tả do i18n (namespace "progress.achievements.<id>").
 */
export function computeAchievements(ctx: AchievementContext): Achievement[] {
  const completed = ctx.progress.filter((p) => p.isCompleted);
  const progressMap = Object.fromEntries(ctx.progress.map((p) => [p.itemId, p]));
  const streak = computeStreak(ctx.progress);

  const passed = ctx.attempts.filter((a) => a.isPassed).length;
  const perfect = ctx.attempts.filter((a) => a.scorePercent >= 100 && a.status !== "PENDING_REVIEW").length;
  const completedCourses = ctx.courses.filter((c) => {
    const p = getCourseProgress(c.id, ctx.lessons as LessonRecord[], ctx.items as ItemRecord[], progressMap);
    return p.total > 0 && p.completed >= p.total;
  }).length;

  const make = (id: AchievementId, value: number, target: number): Achievement => ({
    id,
    value: Math.min(value, target),
    target,
    unlocked: value >= target,
  });

  return [
    make("first_chapter", completed.length, 1),
    make("chapters_5", completed.length, 5),
    make("chapters_20", completed.length, 20),
    make("first_quiz_passed", passed, 1),
    make("perfect_score", perfect, 1),
    make("first_course_complete", completedCourses, 1),
    make("streak_3", streak.longest, 3),
    make("streak_7", streak.longest, 7),
    make("streak_30", streak.longest, 30),
  ];
}
