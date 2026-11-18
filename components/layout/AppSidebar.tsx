"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useHandbook } from "@/context/HandbookContext";
import {
  checkItemAccess,
  getCourseProgress,
  getLessonProgress,
} from "@/lib/progression";
import { CourseRecord, ItemRecord, ItemType, LessonRecord } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/animated-progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  Lock,
} from "lucide-react";

const ITEM_TYPE_ICON: Record<
  ItemType,
  React.ComponentType<{ className?: string }>
> = {
  CONTENT: FileText,
  QUIZ: HelpCircle,
  ASSIGNMENT: ClipboardList,
};

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav.sidebar");
  const tCommon = useTranslations("common");
  const { courses, lessons, items, progressMap, user } = useHandbook();

  const isStaff = Boolean(
    user && (user.role === "ADMIN" || user.role === "EDITOR")
  );

  const learnSegments = useMemo(() => {
    if (!pathname.startsWith("/learn/")) return [];
    return pathname
      .replace(/^\/learn\/?/, "")
      .split("/")
      .filter(Boolean)
      .map((seg) => decodeURIComponent(seg));
  }, [pathname]);

  const [activeCourseSlug, activeLessonSlug, activeItemSlug] = learnSegments;

  const activeCourse = useMemo(
    () =>
      activeCourseSlug
        ? courses.find(
            (c) => c.slug === activeCourseSlug || c.id === activeCourseSlug
          )
        : undefined,
    [courses, activeCourseSlug]
  );

  const courseLessons = useMemo(
    () =>
      activeCourse
        ? lessons
            .filter(
              (l) =>
                l.courseId === activeCourse.id && (l.isPublished || isStaff)
            )
            .sort((a, b) => a.orderIndex - b.orderIndex)
        : [],
    [lessons, activeCourse, isStaff]
  );

  const visibleItems = useMemo(
    () =>
      items
        .filter((i) => i.status === "PUBLISHED" || isStaff)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [items, isStaff]
  );

  const activeLesson = useMemo(
    () =>
      activeLessonSlug
        ? courseLessons.find(
            (l) => l.slug === activeLessonSlug || l.id === activeLessonSlug
          )
        : undefined,
    [courseLessons, activeLessonSlug]
  );

  const activeItem = useMemo(
    () =>
      activeItemSlug && activeLesson
        ? visibleItems.find(
            (i) =>
              (i.slug === activeItemSlug || i.id === activeItemSlug) &&
              i.lessonId === activeLesson.id
          )
        : undefined,
    [visibleItems, activeItemSlug, activeLesson]
  );

  const [lessonOpenMap, setLessonOpenMap] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    if (activeLesson?.id) {
      setLessonOpenMap((prev) => ({ ...prev, [activeLesson.id]: true }));
    }
  }, [activeLesson?.id]);

  const courseProgress = useMemo(() => {
    if (!activeCourse) return { completed: 0, total: 0, percent: 0 };
    return getCourseProgress(activeCourse.id, lessons, items, progressMap);
  }, [activeCourse, lessons, items, progressMap]);

  if (!activeCourse) {
    return null;
  }

  const renderItemRow = (
    course: CourseRecord,
    lesson: LessonRecord,
    item: ItemRecord
  ) => {
    const access = checkItemAccess(
      item.id,
      courses,
      lessons,
      items,
      progressMap
    );
    const isCompleted = Boolean(progressMap[item.id]?.isCompleted);
    const isCurrent = activeItem?.id === item.id;
    const isLocked = !access.allowed && !isStaff;
    const TypeIcon = ITEM_TYPE_ICON[item.type] || FileText;
    const itemHref = `/learn/${course.slug}/${lesson.slug}/${item.slug}`;

    if (isLocked) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <div className="flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground/60 cursor-not-allowed select-none">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
              <span className="line-clamp-2 leading-snug">{item.title}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[220px]">
            {t("lockedTooltip", {
              title: access.blockingItem?.title || t("previousChapter"),
            })}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        key={item.id}
        href={itemHref}
        onClick={onNavigate}
        className={cn(
          "flex items-start justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
          isCurrent
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <div className="flex items-start gap-2 min-w-0">
          {isCompleted ? (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
          ) : (
            <TypeIcon
              className={cn(
                "mt-0.5 size-3.5 shrink-0",
                isCurrent ? "text-primary" : "text-muted-foreground"
              )}
            />
          )}
          <span className="line-clamp-2 leading-snug">{item.title}</span>
        </div>

        {item.status !== "PUBLISHED" && (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {tCommon("status.DRAFT")}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground select-none">
      {/* Course Header + Progress */}
      <div className="border-b border-sidebar-border px-4 py-3.5 space-y-2.5">
        <Link
          href={`/learn/${activeCourse.slug}`}
          onClick={onNavigate}
          className="block text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug"
        >
          {activeCourse.title}
        </Link>

        {courseProgress.total > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{t("courseProgress")}</span>
              <span className="tabular-nums font-medium text-foreground">
                {courseProgress.completed}/{courseProgress.total}
              </span>
            </div>
            <ProgressBar
              value={courseProgress.percent}
              label={t("courseProgress")}
            />
          </div>
        )}
      </div>

      {/* Lessons → Items Tree */}
      <ScrollArea className="flex-1 px-2.5 py-3">
        {courseLessons.length === 0 ? (
          <p className="px-2 py-4 text-xs text-muted-foreground text-center">
            {t("emptyLessons")}
          </p>
        ) : (
          <div className="space-y-1.5 pb-4">
            {courseLessons.map((lesson, idx) => {
              const isLessonActive = activeLesson?.id === lesson.id;
              const isLessonOpen =
                lessonOpenMap[lesson.id] ??
                (activeLesson ? isLessonActive : idx === 0);

              const lessonItems = visibleItems.filter(
                (i) => i.lessonId === lesson.id
              );
              const lessonProg = getLessonProgress(
                lesson.id,
                items,
                progressMap
              );
              const isLessonDone =
                Boolean(user) &&
                lessonProg.total > 0 &&
                lessonProg.percent === 100;

              return (
                <Collapsible
                  key={lesson.id}
                  open={isLessonOpen}
                  onOpenChange={(open) =>
                    setLessonOpenMap((prev) => ({
                      ...prev,
                      [lesson.id]: open,
                    }))
                  }
                  className="space-y-0.5"
                >
                  <div
                    className={cn(
                      "flex items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors",
                      isLessonActive && !activeItem
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground/90 hover:bg-sidebar-accent"
                    )}
                  >
                    <Link
                      href={`/learn/${activeCourse.slug}/${lesson.slug}`}
                      onClick={() => {
                        setLessonOpenMap((prev) => ({
                          ...prev,
                          [lesson.id]: true,
                        }));
                        onNavigate?.();
                      }}
                      className="flex items-start gap-2 min-w-0 flex-1"
                    >
                      {isLessonDone && (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                      )}
                      <span className="font-medium line-clamp-2 leading-snug">
                        {lesson.title}
                      </span>
                    </Link>

                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        aria-label={t("toggleLesson")}
                        className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                      >
                        <ChevronRight
                          className={cn(
                            "size-3.5 transition-transform duration-200",
                            isLessonOpen && "rotate-90"
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                  </div>

                  <CollapsibleContent className="space-y-0.5 pl-2.5 border-l border-sidebar-border ml-2.5 pt-0.5">
                    {lessonItems.length === 0 ? (
                      <p className="px-2 py-1 text-[11px] text-muted-foreground">
                        {t("emptyItems")}
                      </p>
                    ) : (
                      lessonItems.map((item) =>
                        renderItemRow(activeCourse, lesson, item)
                      )
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer: Single ghost link back to all courses */}
      <div className="border-t border-sidebar-border p-2.5">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 cursor-pointer"
        >
          <Link href="/" onClick={onNavigate}>
            <ArrowLeft className="size-3.5 shrink-0" />
            <span>{t("allCourses")}</span>
          </Link>
        </Button>
      </div>
    </aside>
  );
}
