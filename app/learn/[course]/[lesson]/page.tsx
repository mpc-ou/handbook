"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useHandbook } from "@/context/HandbookContext";
import { AppShell } from "@/components/layout/AppShell";
import { Cover } from "@/components/ui/Cover";
import { ProgressBar } from "@/components/ui/animated-progress";
import {
  canUserManageCourse,
  canUserViewCourse,
  checkItemAccess,
  getLessonProgress,
} from "@/lib/progression";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileUp,
  Lock,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

interface LessonPageProps {
  params: Promise<{
    course: string;
    lesson: string;
  }>;
}

export default function LessonDetailPage({ params }: LessonPageProps) {
  const { course: courseSlug, lesson: lessonSlug } = React.use(params);
  const t = useTranslations("course");
  const tCommon = useTranslations("common");

  const {
    user,
    courses,
    lessons,
    items,
    progressMap,
    dataLoading,
    authLoading,
    dbError,
    signInWithMpcOidc,
  } = useHandbook();

  if (dataLoading || authLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
          <Skeleton className="aspect-[3/1] w-full rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-2/3 rounded-lg" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  const course = courses.find((c) => c.slug === courseSlug);
  const lesson = course
    ? lessons.find((l) => l.courseId === course.id && l.slug === lessonSlug)
    : undefined;

  if (dbError && (!course || !lesson)) {
    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
          <ShieldAlert className="size-8 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">
            {t("gates.dbErrorTitle")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("gates.dbErrorDesc", { error: dbError })}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              size="sm"
              onClick={() => window.location.reload()}
              className="gap-1.5 cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
              <span>{tCommon("actions.retry")}</span>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/">{t("gates.backToHome")}</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!course) {
    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">
            {t("gates.courseNotFoundTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("gates.courseNotFoundDesc")}
          </p>
          <Button asChild size="sm">
            <Link href="/">
              <ArrowLeft className="size-4 mr-1.5" />
              <span>{t("gates.backToHome")}</span>
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  // Group / Login Privacy Gate on parent Course
  const viewAccess = canUserViewCourse(user, course);
  if (!viewAccess.allowed) {
    const callbackPath = `/learn/${courseSlug}/${lessonSlug}`;
    const isLogin = viewAccess.reason === "LOGIN_REQUIRED";

    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
          {isLogin ? (
            <Lock className="size-8 text-primary mx-auto" />
          ) : (
            <ShieldAlert className="size-8 text-destructive mx-auto" />
          )}
          <h1 className="text-xl font-bold text-foreground">
            {isLogin
              ? t("gates.loginRequiredTitle")
              : t("gates.groupRestrictedTitle")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isLogin
              ? t("gates.loginRequiredDesc", { title: course.title })
              : t("gates.groupRestrictedDesc", { title: course.title })}
          </p>
          {!isLogin &&
            viewAccess.allowedGroups &&
            viewAccess.allowedGroups.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {viewAccess.allowedGroups.map((g) => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {g}
                  </Badge>
                ))}
              </div>
            )}
          <div className="flex items-center justify-center gap-3 pt-2">
            {isLogin ? (
              <Button
                size="sm"
                onClick={() => signInWithMpcOidc(callbackPath)}
                className="cursor-pointer"
              >
                {t("gates.loginButton")}
              </Button>
            ) : null}
            <Button
              asChild
              variant={isLogin ? "ghost" : "default"}
              size="sm"
              className="cursor-pointer"
            >
              <Link href="/">{t("gates.backToHome")}</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!lesson) {
    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">
            {t("gates.lessonNotFoundTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("gates.lessonNotFoundDesc")}
          </p>
          <Button asChild size="sm">
            <Link href={`/learn/${course.slug}`}>
              <ArrowLeft className="size-4 mr-1.5" />
              <span>{t("lesson.backToCourse")}</span>
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const isStaff = Boolean(
    user && (user.role === "ADMIN" || user.role === "EDITOR")
  );
  const canManage = canUserManageCourse(user, course.id);

  // Unpublished Course / Lesson gate
  if ((course.status !== "PUBLISHED" || !lesson.isPublished) && !isStaff) {
    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
          <Lock className="size-8 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold text-foreground">
            {t("gates.unpublishedLessonTitle")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("gates.unpublishedLessonDesc", { title: lesson.title })}
          </p>
          <Button asChild size="sm">
            <Link href={`/learn/${course.slug}`}>
              <ArrowLeft className="size-4 mr-1.5" />
              <span>{t("lesson.backToCourse")}</span>
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const lessonItems = items
    .filter(
      (i) =>
        i.lessonId === lesson.id &&
        (i.status === "PUBLISHED" ||
          isStaff ||
          Boolean(user && i.authorId === user.uid))
    )
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const lessonProgress = getLessonProgress(lesson.id, items, progressMap);
  const isLessonCompleted =
    lessonProgress.total > 0 &&
    lessonProgress.completed === lessonProgress.total;

  const nextIncompleteItem =
    lessonItems.find((i) => !progressMap[i.id]?.isCompleted) ||
    lessonItems[0] ||
    null;
  const hasStartedLesson = lessonItems.some((i) =>
    Boolean(
      progressMap[i.id]?.isCompleted ||
        progressMap[i.id]?.hasScrolledBottom ||
        (progressMap[i.id]?.highestQuizScore ?? 0) > 0
    )
  );

  // Prev / Next lesson in the same course
  const siblingLessons = lessons
    .filter((l) => l.courseId === course.id && (l.isPublished || isStaff))
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const lessonIdx = siblingLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = lessonIdx > 0 ? siblingLessons[lessonIdx - 1] : null;
  const nextLesson =
    lessonIdx >= 0 && lessonIdx < siblingLessons.length - 1
      ? siblingLessons[lessonIdx + 1]
      : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        {/* Lesson Cover */}
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <Cover
            coverImage={lesson.coverImage}
            title={lesson.title}
            seedId={lesson.id}
            aspectRatio="3/1"
          />
        </div>

        {/* Lesson Title, Summary & Primary Action */}
        <header className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {!lesson.isPublished && (
                  <Badge variant="warning" className="text-xs">
                    {tCommon("status.DRAFT")}
                  </Badge>
                )}
              </div>

              {canManage && (
                <Button
                  asChild
                  variant="ghost"
                  size="xs"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Link href="/studio/curriculum">{t("manageInStudio")}</Link>
                </Button>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance">
              {lesson.title}
            </h1>

            {lesson.summary && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
                {lesson.summary}
              </p>
            )}
          </div>

          {lessonItems.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">
                    {t("chaptersRatio", {
                      completed: lessonProgress.completed,
                      total: lessonProgress.total,
                    })}
                  </span>
                  <span className="font-mono text-muted-foreground tabular-nums">
                    {lessonProgress.percent}%
                  </span>
                </div>
                <ProgressBar
                  value={lessonProgress.percent}
                  heightClassName="h-1.5"
                />
              </div>

              {nextIncompleteItem && (
                <Button asChild className="gap-2 font-semibold shrink-0">
                  <Link
                    href={`/learn/${course.slug}/${lesson.slug}/${nextIncompleteItem.slug}`}
                  >
                    <span>
                      {isLessonCompleted
                        ? t("lesson.reviewLesson")
                        : hasStartedLesson
                        ? t("lesson.continueLesson")
                        : t("lesson.startLesson")}
                    </span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </header>

        {/* Items List */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            {t("lesson.itemsHeading")}
          </h2>

          {lessonItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              {t("lesson.emptyItems")}
            </p>
          ) : (
            <div className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card overflow-hidden">
              {lessonItems.map((item) => {
                const access = checkItemAccess(
                  item.id,
                  courses,
                  lessons,
                  items,
                  progressMap
                );
                const prog = progressMap[item.id];
                const isDone = Boolean(prog?.isCompleted);
                const isLocked =
                  !access.allowed && access.reason === "PREVIOUS_INCOMPLETE";

                const TypeIcon =
                  item.type === "QUIZ"
                    ? ClipboardCheck
                    : item.type === "ASSIGNMENT"
                    ? FileUp
                    : BookOpen;

                return (
                  <Link
                    key={item.id}
                    href={`/learn/${course.slug}/${lesson.slug}/${item.slug}`}
                    className={cn(
                      "group flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/30",
                      isLocked && "opacity-75"
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          isDone
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : isLocked
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary"
                        )}
                      >
                        {isDone ? (
                          <CheckCircle2 className="size-4" />
                        ) : isLocked ? (
                          <Lock className="size-4" />
                        ) : (
                          <TypeIcon className="size-4" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          {item.status !== "PUBLISHED" && (
                            <Badge variant="warning" className="text-[10px]">
                              {tCommon(`status.${item.status}`)}
                            </Badge>
                          )}
                          {!item.isRequired && (
                            <span className="text-[11px] text-muted-foreground">
                              ({t("lesson.optional")})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{tCommon(`itemType.${item.type}`)}</span>
                          {item.type === "CONTENT" && (
                            <>
                              <span>·</span>
                              <span>
                                {t("lesson.readingTime", {
                                  minutes: item.readingTime,
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status / Action Indicator */}
                    <div className="shrink-0">
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" />
                          <span className="hidden sm:inline">
                            {t("lesson.completed")}
                          </span>
                        </span>
                      ) : isLocked ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Lock className="size-3.5" />
                              <span className="hidden sm:inline">
                                {t("lesson.locked")}
                              </span>
                            </span>
                          </TooltipTrigger>
                          {access.blockingItem && (
                            <TooltipContent>
                              {t("lesson.lockedBy", {
                                title: access.blockingItem.title,
                              })}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ) : (
                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Prev / Next Lesson Footer Navigation */}
        {(prevLesson || nextLesson) && (
          <nav className="grid gap-3 sm:grid-cols-2 pt-4 border-t border-border/60">
            {prevLesson ? (
              <Link
                href={`/learn/${course.slug}/${prevLesson.slug}`}
                className="group flex flex-col gap-1 rounded-xl border border-border/70 bg-card/50 p-4 transition-colors hover:border-primary/50"
              >
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowLeft className="size-3.5" />
                  <span>{t("lesson.prevLesson")}</span>
                </span>
                <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {prevLesson.title}
                </span>
              </Link>
            ) : (
              <div />
            )}

            {nextLesson ? (
              <Link
                href={`/learn/${course.slug}/${nextLesson.slug}`}
                className="group flex flex-col items-end text-right gap-1 rounded-xl border border-border/70 bg-card/50 p-4 transition-colors hover:border-primary/50"
              >
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{t("lesson.nextLesson")}</span>
                  <ArrowRight className="size-3.5" />
                </span>
                <span className="text-sm font-medium text-foreground truncate max-w-full group-hover:text-primary transition-colors">
                  {nextLesson.title}
                </span>
              </Link>
            ) : null}
          </nav>
        )}
      </div>
    </AppShell>
  );
}
