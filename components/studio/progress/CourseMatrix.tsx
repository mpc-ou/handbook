"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CountUp } from "@/components/ui/animated-progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ItemRecord, LessonRecord } from "@/types";
import {
  type CourseSummaryMetrics,
  getLessonCellProgress,
  type LearnerStats,
} from "./progress-utils";

interface CourseMatrixProps {
  courseId: string;
  summary: CourseSummaryMetrics;
  learners: LearnerStats[];
  lessons: LessonRecord[];
  items: ItemRecord[];
  onSelectLearner: (learner: LearnerStats) => void;
}

function getHeatmapCellClass(percent: number): string {
  if (percent <= 0) {
    return "bg-muted/80 text-muted-foreground border border-border/50";
  }
  if (percent < 34) {
    return "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200";
  }
  if (percent < 67) {
    return "bg-emerald-500/45 text-emerald-950 dark:text-emerald-100";
  }
  if (percent < 100) {
    return "bg-emerald-500/75 text-white";
  }
  return "bg-emerald-600 dark:bg-emerald-500 text-white";
}

export function CourseMatrix({
  courseId,
  summary,
  learners,
  lessons,
  items,
  onSelectLearner,
}: CourseMatrixProps) {
  const t = useTranslations("progress");
  const format = useFormatter();
  const reduceMotion = useReducedMotion();
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    hasAnimatedRef.current = true;
  }, []);

  const shouldAnimateInitial = !reduceMotion && !hasAnimatedRef.current;

  const publishedLessons = useMemo(
    () =>
      lessons
        .filter((l) => l.courseId === courseId && l.isPublished)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [lessons, courseId]
  );

  const lessonChapterCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const lesson of publishedLessons) {
      const published = items.filter(
        (i) => i.lessonId === lesson.id && i.status === "PUBLISHED"
      );
      const required = published.filter((i) => i.isRequired);
      map.set(
        lesson.id,
        required.length > 0 ? required.length : published.length
      );
    }
    return map;
  }, [publishedLessons, items]);

  const sortedLearners = useMemo(() => {
    const copy = [...learners];
    copy.sort((a, b) => {
      const progA = a.courseProgressById[courseId]?.percent ?? 0;
      const progB = b.courseProgressById[courseId]?.percent ?? 0;
      if (progB !== progA) return progB - progA;
      const compA = a.courseProgressById[courseId]?.completed ?? 0;
      const compB = b.courseProgressById[courseId]?.completed ?? 0;
      if (compB !== compA) return compB - compA;
      return a.user.fullName.localeCompare(b.user.fullName);
    });
    return copy;
  }, [learners, courseId]);

  const legendSteps = [
    { label: "0%", className: "bg-muted/80 border border-border/50" },
    { label: "25%", className: "bg-emerald-500/20" },
    { label: "50%", className: "bg-emerald-500/45" },
    { label: "75%", className: "bg-emerald-500/75" },
    { label: "100%", className: "bg-emerald-600 dark:bg-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      {/* (a) Thẻ tóm tắt khóa học */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("courseView.startedCompleted")}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {format.number(summary.startedCount)} /{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                {format.number(summary.completedCount)}
              </span>
            </p>
            <span className="text-xs text-muted-foreground">
              {t("courseView.startedCompletedSub", {
                total: format.number(summary.totalLearners),
              })}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("courseView.avgProgress")}
          </p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            <CountUp value={summary.avgCompletionPercent} suffix="%" />
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("courseView.avgQuizScore")}
          </p>
          {summary.avgQuizScore !== null ? (
            <p className="text-2xl font-bold tracking-tight text-foreground">
              <CountUp value={summary.avgQuizScore} suffix="%" />
            </p>
          ) : (
            <p className="text-sm text-muted-foreground pt-1.5">
              {t("courseView.noQuizData")}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("courseView.quizPassRate")}
          </p>
          {summary.quizPassRate !== null ? (
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              <CountUp value={summary.quizPassRate} suffix="%" />
            </p>
          ) : (
            <p className="text-sm text-muted-foreground pt-1.5">
              {t("courseView.noQuizData")}
            </p>
          )}
        </div>
      </div>

      {/* (b) Ma trận học viên × bài học */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">
              {t("courseView.matrixTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("courseView.matrixSubtitle")}
            </p>
          </div>

          {/* Chú thích thang màu */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <span>{t("courseView.legendLabel")}</span>
            <div className="flex items-center gap-1.5">
              {legendSteps.map((step) => (
                <div key={step.label} className="flex items-center gap-1">
                  <span
                    className={cn("size-3.5 rounded-xs inline-block", step.className)}
                    aria-hidden
                  />
                  <span className="text-[11px] tabular-nums">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {publishedLessons.length === 0 ? (
          <div className="p-10 text-center space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              {t("courseView.noLessonsTitle")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("courseView.noLessonsDescription")}
            </p>
          </div>
        ) : sortedLearners.length === 0 ? (
          <div className="p-10 text-center space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              {t("table.emptyTitle")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("table.emptyDescription")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                  <th className="sticky left-0 z-10 bg-muted/90 backdrop-blur-xs py-2.5 px-4 text-left font-medium min-w-[210px] border-r border-border">
                    <div className="flex items-center justify-between gap-2">
                      <span>{t("table.learner")}</span>
                      <span>{t("courseView.courseTotal")}</span>
                    </div>
                  </th>
                  {publishedLessons.map((lesson, idx) => {
                    const chCount = lessonChapterCounts.get(lesson.id) ?? 0;
                    return (
                      <th
                        key={lesson.id}
                        className="py-2.5 px-2 text-center font-medium min-w-[56px] max-w-[96px]"
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate cursor-default">
                              {idx + 1}. {lesson.title}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("courseView.lessonColumnTooltip", {
                              index: idx + 1,
                              title: lesson.title,
                              count: chCount,
                            })}
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedLearners.map((learner, rowIdx) => {
                  const courseProg = learner.courseProgressById[courseId] ?? {
                    completed: 0,
                    total: 0,
                    percent: 0,
                  };
                  return (
                    <tr
                      key={learner.user.uid}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td
                        onClick={() => onSelectLearner(learner)}
                        className="sticky left-0 z-10 bg-card hover:bg-muted/40 py-2 px-4 border-r border-border cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="size-6 shrink-0">
                              {learner.user.avatarUrl && (
                                <AvatarImage
                                  src={learner.user.avatarUrl}
                                  alt={learner.user.fullName}
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <AvatarFallback className="text-[10px] bg-muted text-foreground font-medium">
                                {learner.user.fullName
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground truncate max-w-[130px]">
                              {learner.user.fullName}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "font-mono tabular-nums shrink-0",
                              courseProg.percent >= 100
                                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                : "text-muted-foreground"
                            )}
                          >
                            {format.number(courseProg.percent)}%
                          </span>
                        </div>
                      </td>

                      {publishedLessons.map((lesson, colIdx) => {
                        const cell = getLessonCellProgress(
                          lesson.id,
                          items,
                          learner.progressByItemId
                        );
                        const staggerDelay = Math.min(
                          (rowIdx * publishedLessons.length + colIdx) * 0.003,
                          0.22
                        );

                        return (
                          <td
                            key={lesson.id}
                            className="py-1.5 px-1.5 text-center align-middle"
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div
                                  initial={
                                    shouldAnimateInitial
                                      ? { opacity: 0, scale: 0.85 }
                                      : false
                                  }
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={
                                    shouldAnimateInitial
                                      ? {
                                          duration: 0.18,
                                          delay: staggerDelay,
                                          ease: "easeOut",
                                        }
                                      : { duration: 0 }
                                  }
                                  className={cn(
                                    "mx-auto size-7 rounded-md flex items-center justify-center text-[10px] font-mono tabular-nums select-none cursor-default",
                                    getHeatmapCellClass(cell.percent)
                                  )}
                                >
                                  {cell.total > 0
                                    ? `${cell.completed}/${cell.total}`
                                    : "—"}
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t("courseView.cellTooltip", {
                                  learner: learner.user.fullName,
                                  lesson: lesson.title,
                                  completed: format.number(cell.completed),
                                  total: format.number(cell.total),
                                  percent: format.number(cell.percent),
                                })}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
