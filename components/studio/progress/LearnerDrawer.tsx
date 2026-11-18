"use client";

import React, { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProgressRing } from "@/components/ui/animated-progress";
import { cn } from "@/lib/utils";
import type {
  CourseRecord,
  ItemRecord,
  LessonRecord,
  QuizAttemptRecord,
} from "@/types";
import type { LearnerStats } from "./progress-utils";

interface LearnerDrawerProps {
  learner: LearnerStats | null;
  onClose: () => void;
  courses: CourseRecord[];
  lessons: LessonRecord[];
  items: ItemRecord[];
  quizAttempts: QuizAttemptRecord[];
}

export function LearnerDrawer({
  learner,
  onClose,
  courses,
  lessons,
  items,
  quizAttempts,
}: LearnerDrawerProps) {
  const t = useTranslations("progress");
  const format = useFormatter();

  const lessonMap = useMemo(
    () => new Map(lessons.map((l) => [l.id, l])),
    [lessons]
  );
  const courseMap = useMemo(
    () => new Map(courses.map((c) => [c.id, c])),
    [courses]
  );
  const itemMap = useMemo(
    () => new Map(items.map((i) => [i.id, i])),
    [items]
  );

  const completedItemsList = useMemo(() => {
    if (!learner) return [];
    const results: {
      item: ItemRecord;
      lessonTitle: string;
      courseTitle: string;
      completedAt: string | null;
    }[] = [];

    for (const item of items) {
      if (item.status !== "PUBLISHED") continue;
      const prog = learner.progressByItemId[item.id];
      if (!prog?.isCompleted) continue;
      const lesson = lessonMap.get(item.lessonId);
      const course = lesson ? courseMap.get(lesson.courseId) : undefined;
      if (!lesson || !course) continue;

      results.push({
        item,
        lessonTitle: lesson.title,
        courseTitle: course.title,
        completedAt: prog.completedAt || prog.lastAccessedAt || null,
      });
    }

    return results.sort((a, b) => {
      const msA = a.completedAt ? Date.parse(a.completedAt) : 0;
      const msB = b.completedAt ? Date.parse(b.completedAt) : 0;
      return (Number.isFinite(msB) ? msB : 0) - (Number.isFinite(msA) ? msA : 0);
    });
  }, [learner, items, lessonMap, courseMap]);

  const learnerAttempts = useMemo(() => {
    if (!learner) return [];
    return quizAttempts
      .filter((a) => a.userId === learner.user.uid && itemMap.has(a.itemId))
      .sort((a, b) => {
        const msA = Date.parse(a.createdAt);
        const msB = Date.parse(b.createdAt);
        return (Number.isFinite(msB) ? msB : 0) - (Number.isFinite(msA) ? msA : 0);
      });
  }, [learner, quizAttempts, itemMap]);

  const now = new Date();

  return (
    <Sheet
      open={Boolean(learner)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto p-0"
      >
        {learner && (
          <div className="flex flex-col h-full">
            <SheetHeader className="p-5 border-b border-border space-y-2">
              <div className="flex items-center gap-3 pr-6">
                <Avatar className="size-10 shrink-0">
                  {learner.user.avatarUrl && (
                    <AvatarImage
                      src={learner.user.avatarUrl}
                      alt={learner.user.fullName}
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <AvatarFallback className="text-sm bg-muted text-foreground font-semibold">
                    {learner.user.fullName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="text-base truncate">
                    {learner.user.fullName}
                  </SheetTitle>
                  <SheetDescription className="text-xs truncate">
                    {learner.user.email} ·{" "}
                    {learner.user.department || t("filters.unassignedDept")}
                  </SheetDescription>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <span>{t("drawer.lastActiveLabel")}</span>
                {learner.lastAccessedAt && learner.lastAccessedMs > 0 ? (
                  <span className="text-foreground font-medium">
                    {format.relativeTime(new Date(learner.lastAccessedAt), now)}{" "}
                    (
                    {format.dateTime(new Date(learner.lastAccessedAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    )
                  </span>
                ) : (
                  <span>{t("table.noActivity")}</span>
                )}
              </div>
            </SheetHeader>

            <div className="p-5 space-y-6 flex-1">
              {/* 1. Tiến độ từng khóa học (ProgressRing) */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("drawer.coursesSection", {
                    count: format.number(courses.length),
                  })}
                </h3>
                <div className="divide-y divide-border rounded-xl border border-border">
                  {courses.map((course) => {
                    const prog = learner.courseProgressById[course.id] ?? {
                      completed: 0,
                      total: 0,
                      percent: 0,
                    };
                    return (
                      <div
                        key={course.id}
                        className="flex items-center justify-between gap-3 p-3.5"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-medium text-foreground truncate">
                            {course.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("drawer.chaptersCompletedCount", {
                              completed: format.number(prog.completed),
                              total: format.number(prog.total),
                            })}
                          </p>
                        </div>
                        <ProgressRing
                          value={prog.percent}
                          size={44}
                          strokeWidth={4}
                          className="shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 2. Danh sách chương đã hoàn thành */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("drawer.completedItemsSection", {
                    count: format.number(completedItemsList.length),
                  })}
                </h3>
                {completedItemsList.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    {t("drawer.noCompletedItems")}
                  </p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border max-h-64 overflow-y-auto">
                    {completedItemsList.map((entry) => {
                      const validDate =
                        entry.completedAt &&
                        !Number.isNaN(Date.parse(entry.completedAt));
                      return (
                        <div
                          key={entry.item.id}
                          className="flex items-start justify-between gap-3 p-3 text-xs"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {entry.item.title}
                              </p>
                              <p className="text-muted-foreground truncate">
                                {entry.courseTitle} › {entry.lessonTitle}
                              </p>
                            </div>
                          </div>
                          {validDate && entry.completedAt && (
                            <span className="text-muted-foreground shrink-0 whitespace-nowrap">
                              {format.dateTime(new Date(entry.completedAt), {
                                dateStyle: "short",
                              })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* 3. Điểm các bài kiểm tra */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("drawer.quizHistorySection", {
                    count: format.number(learnerAttempts.length),
                  })}
                </h3>
                {learnerAttempts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    {t("drawer.noQuizAttempts")}
                  </p>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border max-h-64 overflow-y-auto">
                    {learnerAttempts.map((att) => {
                      const item = itemMap.get(att.itemId);
                      const isPending = att.status === "PENDING_REVIEW";
                      const validDate = !Number.isNaN(
                        Date.parse(att.createdAt)
                      );
                      return (
                        <div
                          key={att.id}
                          className="flex items-center justify-between gap-3 p-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {item?.title || att.itemTitle || att.itemId}
                            </p>
                            {validDate && (
                              <p className="text-muted-foreground">
                                {format.dateTime(new Date(att.createdAt), {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {isPending ? (
                              <span className="text-muted-foreground font-medium">
                                {t("drawer.pendingReview")}
                              </span>
                            ) : (
                              <span
                                className={cn(
                                  "font-mono font-semibold tabular-nums",
                                  att.isPassed
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-destructive"
                                )}
                              >
                                {format.number(att.scorePercent)}% ·{" "}
                                {att.isPassed
                                  ? t("drawer.passed")
                                  : t("drawer.failed")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
