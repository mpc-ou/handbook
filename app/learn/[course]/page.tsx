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
  getCourseItemsInOrder,
  getCourseProgress,
  getLessonProgress,
} from "@/lib/progression";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Lock,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

interface CoursePageProps {
  params: Promise<{
    course: string;
  }>;
}

export default function CourseDetailPage({ params }: CoursePageProps) {
  const { course: courseSlug } = React.use(params);
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
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
          <Skeleton className="aspect-[3/1] w-full rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-2/3 rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  const course = courses.find((c) => c.slug === courseSlug);

  if (!course) {
    if (dbError) {
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

  const isStaff = Boolean(
    user && (user.role === "ADMIN" || user.role === "EDITOR")
  );
  const canManage = canUserManageCourse(user, course.id);

  // Course unpublished gate: only ADMIN/EDITOR can view unpublished courses
  if (course.status !== "PUBLISHED" && !isStaff) {
    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
          <Lock className="size-8 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold text-foreground">
            {t("gates.unpublishedCourseTitle")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("gates.unpublishedCourseDesc", { title: course.title })}
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

  // Group / Login Privacy Gate
  const viewAccess = canUserViewCourse(user, course);
  if (!viewAccess.allowed) {
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
                onClick={() => signInWithMpcOidc(`/learn/${course.slug}`)}
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

  const courseLessons = lessons
    .filter((l) => l.courseId === course.id && (l.isPublished || isStaff))
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const courseProgress = getCourseProgress(
    course.id,
    lessons,
    items,
    progressMap
  );
  const orderedCourseItems = getCourseItemsInOrder(course.id, lessons, items);

  const targetItem =
    orderedCourseItems.find((i) => !progressMap[i.id]?.isCompleted) ||
    orderedCourseItems[0] ||
    null;
  const targetLesson = targetItem
    ? lessons.find((l) => l.id === targetItem.lessonId)
    : null;
  const startOrContinueHref =
    targetItem && targetLesson
      ? `/learn/${course.slug}/${targetLesson.slug}/${targetItem.slug}`
      : courseLessons[0]
      ? `/learn/${course.slug}/${courseLessons[0].slug}`
      : null;

  const hasAnyProgress = orderedCourseItems.some((i) =>
    Boolean(
      progressMap[i.id]?.isCompleted ||
        progressMap[i.id]?.hasScrolledBottom ||
        (progressMap[i.id]?.highestQuizScore ?? 0) > 0
    )
  );
  const isAllCompleted =
    courseProgress.total > 0 && courseProgress.percent === 100;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
        {/* Course Cover (3:1) */}
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <Cover
            coverImage={course.coverImage}
            title={course.title}
            seedId={course.id}
            aspectRatio="3/1"
          />
        </div>

        {/* Title, Summary & Overall Progress */}
        <header className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {course.status !== "PUBLISHED" && (
                  <Badge variant="warning" className="text-xs">
                    {tCommon(`status.${course.status}`)}
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
              {course.title}
            </h1>

            {course.summary && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
                {course.summary}
              </p>
            )}
          </div>

          {/* Progress Bar + Single Primary CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/60 p-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-foreground">
                  {t("courseProgress")}
                </span>
                <span className="font-mono text-muted-foreground tabular-nums">
                  {t("progressCount", {
                    completed: courseProgress.completed,
                    total: courseProgress.total,
                  })}{" "}
                  ({courseProgress.percent}%)
                </span>
              </div>
              <ProgressBar
                value={courseProgress.percent}
                label={t("courseProgress")}
                heightClassName="h-1.5"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isAllCompleted && user && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-600"
                >
                  <Link href={`/learn/${course.slug}/certificate`}>
                    <Award className="size-4" />
                    <span>{t("viewCertificate")}</span>
                  </Link>
                </Button>
              )}

              {startOrContinueHref && (
                <Button asChild className="gap-2 font-semibold">
                  <Link href={startOrContinueHref}>
                    <span>
                      {isAllCompleted
                        ? t("reviewCourse")
                        : hasAnyProgress
                        ? t("continueCourse")
                        : t("startCourse")}
                    </span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Lessons List */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            {t("lessonsHeading")}
          </h2>

          {courseLessons.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              {t("emptyLessons")}
            </p>
          ) : (
            <div className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card overflow-hidden">
              {courseLessons.map((lesson) => {
                const lessonProg = getLessonProgress(
                  lesson.id,
                  items,
                  progressMap
                );
                const isLessonDone =
                  lessonProg.total > 0 &&
                  lessonProg.completed === lessonProg.total;

                return (
                  <Link
                    key={lesson.id}
                    href={`/learn/${course.slug}/${lesson.slug}`}
                    className="group flex items-center gap-4 p-3.5 sm:p-4 transition-colors hover:bg-muted/30"
                  >
                    {/* Small Lesson Cover */}
                    <div className="w-20 sm:w-28 aspect-video shrink-0 overflow-hidden rounded-lg border border-border/50">
                      <Cover
                        coverImage={lesson.coverImage}
                        title={lesson.title}
                        seedId={lesson.id}
                        aspectRatio="16/9"
                        showLabel={false}
                        className="h-full"
                      />
                    </div>

                    {/* Lesson Title + Progress */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {lesson.title}
                          </h3>
                          {!lesson.isPublished && (
                            <Badge
                              variant="warning"
                              className="text-[10px] shrink-0"
                            >
                              {tCommon("status.DRAFT")}
                            </Badge>
                          )}
                        </div>

                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-mono text-xs tabular-nums shrink-0",
                            isLessonDone
                              ? "text-emerald-600 dark:text-emerald-400 font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          {isLessonDone && (
                            <CheckCircle2 className="size-3.5 shrink-0" />
                          )}
                          <span>
                            {t("chaptersRatio", {
                              completed: lessonProg.completed,
                              total: lessonProg.total,
                            })}
                          </span>
                        </span>
                      </div>

                      <ProgressBar
                        value={lessonProg.percent}
                        heightClassName="h-1"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
