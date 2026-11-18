"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { useHandbook } from "@/context/HandbookContext";
import { AppShell } from "@/components/layout/AppShell";
import { Cover } from "@/components/ui/Cover";
import { ProgressBar } from "@/components/ui/animated-progress";
import {
  canUserViewCourse,
  checkItemAccess,
  getCourseItemsInOrder,
  getCourseProgress,
} from "@/lib/progression";
import {
  CategoryRecord,
  CourseRecord,
  ItemRecord,
  LessonRecord,
  UserProfile,
  UserProgressRecord,
} from "@/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Lock } from "lucide-react";

interface CourseCardProps {
  course: CourseRecord;
  index: number;
  categories: CategoryRecord[];
  lessons: LessonRecord[];
  items: ItemRecord[];
  progressMap: Record<string, UserProgressRecord>;
  user: UserProfile | null;
  isStaff: boolean;
}

function CourseCard({
  course,
  index,
  categories,
  lessons,
  items,
  progressMap,
  user,
  isStaff,
}: CourseCardProps) {
  const t = useTranslations("home.card");
  const tCommon = useTranslations("common");
  const reduceMotion = useReducedMotion();

  const courseLessons = useMemo(
    () =>
      lessons.filter(
        (l) => l.courseId === course.id && (l.isPublished || isStaff)
      ),
    [lessons, course.id, isStaff]
  );

  const courseLessonIds = useMemo(
    () => new Set(courseLessons.map((l) => l.id)),
    [courseLessons]
  );

  const courseItems = useMemo(
    () =>
      items.filter(
        (i) =>
          courseLessonIds.has(i.lessonId) &&
          (i.status === "PUBLISHED" || isStaff)
      ),
    [items, courseLessonIds, isStaff]
  );

  const courseCategories = useMemo(
    () =>
      categories
        .filter((c) => course.categoryIds.includes(c.id))
        .slice(0, 2),
    [categories, course.categoryIds]
  );

  const progress = useMemo(
    () => getCourseProgress(course.id, lessons, items, progressMap),
    [course.id, lessons, items, progressMap]
  );

  const viewAccess = useMemo(
    () => canUserViewCourse(user, course),
    [user, course]
  );

  const isDraft = course.status !== "PUBLISHED";
  const isLocked = !viewAccess.allowed;
  const hasStarted = Boolean(user) && progress.completed > 0;
  const modeLabel = course.sequential ? t("sequential") : t("free");

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              duration: 0.22,
              delay: Math.min(index * 0.04, 0.24),
              ease: "easeOut",
            }
      }
      whileHover={reduceMotion ? undefined : { y: -2 }}
      className="h-full"
    >
      <Link
        href={`/learn/${course.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-card transition-colors hover:border-primary/50"
      >
        {/* 16:9 Cover */}
        <div className="relative overflow-hidden border-b border-border/60">
          <Cover
            coverImage={course.coverImage}
            title={course.title}
            seedId={course.id}
            aspectRatio="16/9"
            showLabel={false}
          />

          {/* Non-default status / lock marker */}
          {(isDraft && isStaff) || isLocked ? (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
              {isDraft && isStaff && (
                <span className="rounded-md bg-background/90 backdrop-blur-xs border border-border px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {tCommon(`status.${course.status}`)}
                </span>
              )}
              {isLocked && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-md bg-background/90 backdrop-blur-xs border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <Lock className="size-3" />
                      <span>{t("internal")}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {viewAccess.reason === "LOGIN_REQUIRED"
                      ? t("internalTooltip")
                      : t("groupRestrictedTooltip", {
                          groups: course.allowedGroups.join(", ") || t("internal"),
                        })}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ) : null}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col justify-between gap-4 p-4">
          <div className="space-y-2">
            {courseCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {courseCategories.map((cat) => (
                  <span
                    key={cat.id}
                    className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            )}

            <h3 className="text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {course.title}
            </h3>

            {course.summary && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {course.summary}
              </p>
            )}
          </div>

          <div className="space-y-2.5 pt-1">
            <p className="text-xs text-muted-foreground">
              {t("chaptersCount", { count: courseItems.length })} · {modeLabel}
            </p>

            {hasStarted && (
              <div className="space-y-1">
                <ProgressBar
                  value={progress.percent}
                  label={t("progressLabel", { title: course.title })}
                  heightClassName="h-1"
                />
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomePage() {
  const t = useTranslations("home");
  const {
    user,
    dataLoading,
    dbError,
    categories,
    courses,
    lessons,
    items,
    progressMap,
  } = useHandbook();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  const isStaff = Boolean(
    user && (user.role === "ADMIN" || user.role === "EDITOR")
  );

  const visibleCourses = useMemo(
    () =>
      courses
        .filter((c) => {
          if (c.status !== "PUBLISHED" && !isStaff) return false;
          if (c.visibility === "UNPUBLIC" && !isStaff) return false;
          return true;
        })
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [courses, isStaff]
  );

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.orderIndex - b.orderIndex),
    [categories]
  );

  const filteredCourses = useMemo(() => {
    if (!selectedCategoryId) return visibleCourses;
    return visibleCourses.filter((course) =>
      course.categoryIds.includes(selectedCategoryId)
    );
  }, [visibleCourses, selectedCategoryId]);

  // Within a group: in-progress first, then not started, completed last
  const rankCourse = (course: CourseRecord) => {
    if (!user) return 1;
    const p = getCourseProgress(course.id, lessons, items, progressMap);
    if (p.percent >= 100) return 2;
    return p.completed > 0 ? 0 : 1;
  };

  // Group by primary category when browsing "All". A category becomes its own
  // section only when it holds 3+ courses; the rest are merged into "Other".
  const groups = useMemo(() => {
    if (selectedCategoryId) return null;
    const catOrder = new Map(sortedCategories.map((c) => [c.id, c]));
    const buckets = new Map<string, CourseRecord[]>();
    for (const course of filteredCourses) {
      const primary = sortedCategories.find((c) =>
        course.categoryIds.includes(c.id)
      );
      const key = primary ? primary.id : "__other";
      buckets.set(key, [...(buckets.get(key) ?? []), course]);
    }
    const sections: { id: string; name: string | null; courses: CourseRecord[] }[] = [];
    const other: CourseRecord[] = [];
    for (const [key, list] of buckets) {
      const cat = catOrder.get(key);
      if (cat && list.length >= 3) {
        sections.push({ id: key, name: cat.name, courses: list });
      } else {
        other.push(...list);
      }
    }
    if (sections.length === 0) return null;
    sections.sort(
      (a, b) =>
        (catOrder.get(a.id)?.orderIndex ?? 0) -
        (catOrder.get(b.id)?.orderIndex ?? 0)
    );
    if (other.length > 0) {
      other.sort((a, b) => a.orderIndex - b.orderIndex);
      sections.push({ id: "__other", name: null, courses: other });
    }
    return sections;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCourses, sortedCategories, selectedCategoryId]);

  // Find current incomplete item to continue learning
  const continueEntry = useMemo<{
    course: CourseRecord;
    lesson: LessonRecord;
    item: ItemRecord;
  } | null>(() => {
    if (!user) return null;
    const progressEntries = Object.values(progressMap);
    if (progressEntries.length === 0) return null;

    const incompleteProgress = progressEntries
      .filter((p) => !p.isCompleted)
      .sort(
        (a, b) =>
          new Date(b.lastAccessedAt || 0).getTime() -
          new Date(a.lastAccessedAt || 0).getTime()
      );

    for (const prog of incompleteProgress) {
      const item = items.find(
        (i) => i.id === prog.itemId && (i.status === "PUBLISHED" || isStaff)
      );
      if (!item) continue;
      const lesson = lessons.find(
        (l) => l.id === item.lessonId && (l.isPublished || isStaff)
      );
      if (!lesson) continue;
      const course = visibleCourses.find((c) => c.id === lesson.courseId);
      if (!course || !canUserViewCourse(user, course).allowed) continue;

      return { course, lesson, item };
    }

    const sortedAll = [...progressEntries].sort(
      (a, b) =>
        new Date(b.lastAccessedAt || b.completedAt || 0).getTime() -
        new Date(a.lastAccessedAt || a.completedAt || 0).getTime()
    );

    for (const prog of sortedAll) {
      const touchedItem = items.find((i) => i.id === prog.itemId);
      const touchedLesson =
        touchedItem && lessons.find((l) => l.id === touchedItem.lessonId);
      const course =
        touchedLesson &&
        visibleCourses.find((c) => c.id === touchedLesson.courseId);
      if (!course || !canUserViewCourse(user, course).allowed) continue;

      const orderedItems = getCourseItemsInOrder(course.id, lessons, items);
      const nextItem = orderedItems.find(
        (i) =>
          !progressMap[i.id]?.isCompleted &&
          checkItemAccess(i.id, courses, lessons, items, progressMap).allowed
      );
      if (nextItem) {
        const nextLesson = lessons.find((l) => l.id === nextItem.lessonId);
        if (nextLesson) {
          return { course, lesson: nextLesson, item: nextItem };
        }
      }
    }

    return null;
  }, [user, progressMap, items, lessons, visibleCourses, courses, isStaff]);

  return (
    <AppShell hideLeftSidebar>
      <div className="mx-auto max-w-6xl px-4 sm:px-8 py-8 space-y-6">
        {/* 1. Short Greeting */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {user
              ? t("greetingUser", { name: user.fullName })
              : t("greetingGuest")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user ? t("subtitle") : t("subtitleGuest")}
          </p>
        </div>

        {/* 2. Continue Learning Card (only when an incomplete item exists) */}
        {continueEntry && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-muted-foreground truncate">
                {t("continue.label")} · {continueEntry.course.title} ›{" "}
                {continueEntry.lesson.title}
              </p>
              <Link
                href={`/learn/${continueEntry.course.slug}/${continueEntry.lesson.slug}/${continueEntry.item.slug}`}
                className="block text-base font-semibold text-foreground hover:text-primary transition-colors truncate"
              >
                {continueEntry.item.title}
              </Link>
            </div>

            <Button asChild size="sm" className="shrink-0 gap-1.5 self-start sm:self-center">
              <Link
                href={`/learn/${continueEntry.course.slug}/${continueEntry.lesson.slug}/${continueEntry.item.slug}`}
              >
                <span>{t("continue.cta")}</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        )}

        {/* 3. Category Filter Row (single-line horizontal scroll) */}
        {!dbError && !dataLoading && sortedCategories.length > 0 && (
          <div
            role="tablist"
            aria-label={t("categories.ariaLabel")}
            className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategoryId === null}
              onClick={() => setSelectedCategoryId(null)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                selectedCategoryId === null
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {t("categories.all")}
            </button>
            {sortedCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() =>
                    setSelectedCategoryId(isSelected ? null : cat.id)
                  }
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                    isSelected
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}

        {/* 4. States & Course Grid */}
        {dbError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center space-y-1.5">
            <AlertTriangle className="size-5 text-destructive mx-auto" />
            <p className="text-sm font-medium text-foreground">
              {t("states.errorTitle")}
            </p>
            <p className="text-xs text-muted-foreground">{dbError}</p>
          </div>
        ) : dataLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-border/70 bg-card"
              >
                <div className="aspect-video w-full animate-pulse bg-muted" />
                <div className="p-4 space-y-2.5">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleCourses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {isStaff ? t("states.emptyAllStaff") : t("states.emptyAll")}
            </p>
            {isStaff ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/studio/curriculum">{t("states.openStudio")}</Link>
              </Button>
            ) : !user ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/login">{t("states.signIn")}</Link>
              </Button>
            ) : null}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("states.emptyFiltered")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategoryId(null)}
            >
              {t("states.resetFilter")}
            </Button>
          </div>
        ) : (
          groups ? (
            <div className="space-y-10">
              {groups.map((group) => {
                const ordered = [...group.courses].sort(
                  (a, b) => rankCourse(a) - rankCourse(b)
                );
                return (
                  <section key={group.id} className="space-y-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="text-base font-semibold text-foreground">
                        {group.name ?? t("groups.other")}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {t("groups.count", { count: ordered.length })}
                        </span>
                      </h2>
                      {group.name && (
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryId(group.id)}
                          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {t("groups.viewAll")}
                        </button>
                      )}
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {ordered.map((course, idx) => (
                        <CourseCard
                          key={course.id}
                          course={course}
                          index={idx}
                          categories={sortedCategories}
                          lessons={lessons}
                          items={items}
                          progressMap={progressMap}
                          user={user}
                          isStaff={isStaff}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course, idx) => (
              <CourseCard
                key={course.id}
                course={course}
                index={idx}
                categories={sortedCategories}
                lessons={lessons}
                items={items}
                progressMap={progressMap}
                user={user}
                isStaff={isStaff}
              />
            ))}
          </div>
          )
        )}
      </div>
    </AppShell>
  );
}
