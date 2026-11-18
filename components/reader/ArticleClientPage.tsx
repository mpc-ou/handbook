"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import confetti from "canvas-confetti";
import { useHandbook } from "@/context/HandbookContext";
import { AppShell } from "@/components/layout/AppShell";
import { TableOfContents } from "@/components/layout/TableOfContents";
import { ArticleRenderer } from "@/components/reader/ArticleRenderer";
import { ScrollTracker } from "@/components/reader/ScrollTracker";
import { QuizRunner } from "@/components/reader/QuizRunner";
import { ReadingProgressBar } from "@/components/reader/ReadingProgressBar";
import {
  DEFAULT_READER_PREFS,
  FOCUS_MODE_STORAGE_KEY,
  READER_PREFS_STORAGE_KEY,
  ReadingSettings,
  type ReaderPrefs,
} from "@/components/reader/ReadingSettings";
import { ShortcutsDialog } from "@/components/reader/ShortcutsDialog";
import { ItemNav } from "@/components/reader/ItemNav";
import { CommentSection } from "@/components/comments/CommentSection";
import { ArticleSkeleton } from "@/components/reader/ArticleSkeleton";
import {
  canUserManageCourse,
  canUserViewCourse,
  checkItemAccess,
  getCourseItemsInOrder,
  getCourseProgress,
  stripQuizAnswersForClient,
} from "@/lib/progression";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ItemRecord } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Heart,
  Keyboard,
  Lock,
  Maximize2,
  Minimize2,
  RefreshCw,
  Share2,
  ShieldAlert,
} from "lucide-react";

export interface ItemReaderProps {
  courseSlug: string;
  lessonSlug: string;
  itemSlug: string;
  initialItem?: ItemRecord | null;
}

export function ItemReader({
  courseSlug,
  lessonSlug,
  itemSlug,
  initialItem = null,
}: ItemReaderProps) {
  const t = useTranslations("reader");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const {
    user,
    courses,
    lessons,
    items,
    progressMap,
    quizAttempts,
    dataLoading,
    authLoading,
    dbError,
    signInWithMpcOidc,
    markItemScrolled,
    submitItemQuiz,
    toggleLikeItem,
    showToast,
    recordItemView,
    setIsSearchOpen,
  } = useHandbook();

  const [scrollProgressPct, setScrollProgressPct] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  // Focus mode & reader preferences (hydrated in useEffect to prevent SSR mismatch)
  const [focusMode, setFocusMode] = useState(false);
  const [readerPrefs, setReaderPrefs] =
    useState<ReaderPrefs>(DEFAULT_READER_PREFS);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    try {
      const savedFocus = window.localStorage.getItem(FOCUS_MODE_STORAGE_KEY);
      if (savedFocus === "true") {
        setFocusMode(true);
      }
      const savedPrefs = window.localStorage.getItem(READER_PREFS_STORAGE_KEY);
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs) as Partial<ReaderPrefs>;
        setReaderPrefs({
          fontSize:
            parsed.fontSize === "sm" ||
            parsed.fontSize === "md" ||
            parsed.fontSize === "lg"
              ? parsed.fontSize
              : "md",
          columnWidth:
            parsed.columnWidth === "sm" ||
            parsed.columnWidth === "md" ||
            parsed.columnWidth === "lg"
              ? parsed.columnWidth
              : "md",
        });
      }
    } catch {}
  }, []);

  const handleToggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(FOCUS_MODE_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleChangePrefs = useCallback((next: ReaderPrefs) => {
    setReaderPrefs(next);
    try {
      window.localStorage.setItem(
        READER_PREFS_STORAGE_KEY,
        JSON.stringify(next)
      );
    } catch {}
  }, []);

  const course = courses.find((c) => c.slug === courseSlug);
  const lesson = course
    ? lessons.find((l) => l.courseId === course.id && l.slug === lessonSlug)
    : undefined;
  const item =
    (lesson
      ? items.find((i) => i.lessonId === lesson.id && i.slug === itemSlug)
      : undefined) ||
    initialItem ||
    undefined;

  const [currentViews, setCurrentViews] = useState(item?.viewsCount ?? 0);

  useEffect(() => {
    if (typeof item?.viewsCount === "number") {
      setCurrentViews(item.viewsCount);
    }
  }, [item?.viewsCount]);

  // Record item view once per session
  useEffect(() => {
    if (!item?.id) return;
    const sessionKey = `mpc_viewed_${item.id}`;
    if (
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(sessionKey)
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(sessionKey, Date.now().toString());
        }
        const updatedViews = await recordItemView(item.id);
        if (typeof updatedViews === "number") {
          setCurrentViews(updatedViews);
        }
      } catch (err) {
        console.error("View increment error:", err);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [item?.id, recordItemView]);

  // Track scroll progress for CONTENT items
  useEffect(() => {
    const onScroll = () => {
      const docEl = document.documentElement;
      const scrollTop = docEl.scrollTop || document.body.scrollTop;
      const scrollHeight = docEl.scrollHeight - docEl.clientHeight;
      if (scrollHeight <= 0) {
        setScrollProgressPct(100);
      } else {
        setScrollProgressPct(
          Math.min(
            100,
            Math.max(0, Math.round((scrollTop / scrollHeight) * 100))
          )
        );
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [courseSlug, lessonSlug, itemSlug]);

  const handleToggleLike = async () => {
    if (!item || likeLoading) return;
    setLikeLoading(true);
    try {
      await toggleLikeItem(item.id);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("actions.actionFailed"),
        "error"
      );
    } finally {
      setLikeLoading(false);
    }
  };

  const handleScrollVerified = useCallback(async () => {
    if (!item) return;
    await markItemScrolled(item.id);
  }, [item, markItemScrolled]);

  const myProgress = item ? progressMap[item.id] : undefined;

  // Automatically mark CONTENT item as read when requireScrollToBottom is false
  useEffect(() => {
    if (
      user &&
      item &&
      item.type === "CONTENT" &&
      !item.requireScrollToBottom &&
      !myProgress?.hasScrolledBottom &&
      !myProgress?.isCompleted
    ) {
      markItemScrolled(item.id).catch(() => {});
    }
  }, [
    user,
    item,
    myProgress?.hasScrolledBottom,
    myProgress?.isCompleted,
    markItemScrolled,
  ]);

  const orderedCourseItems = useMemo(
    () => (course ? getCourseItemsInOrder(course.id, lessons, items) : []),
    [course, lessons, items]
  );

  const publishedLessonItems = useMemo(
    () =>
      lesson
        ? items
            .filter((i) => i.lessonId === lesson.id && i.status === "PUBLISHED")
            .sort((a, b) => a.orderIndex - b.orderIndex)
        : [],
    [lesson, items]
  );

  const courseProgress = useMemo(
    () =>
      course
        ? getCourseProgress(course.id, lessons, items, progressMap)
        : { completed: 0, total: 0, percent: 0 },
    [course, lessons, items, progressMap]
  );

  const isCourseCompleted =
    courseProgress.total > 0 && courseProgress.percent === 100;

  const currentIdx = item
    ? orderedCourseItems.findIndex((i) => i.id === item.id)
    : -1;
  const prevItem = currentIdx > 0 ? orderedCourseItems[currentIdx - 1] : null;
  const nextItem =
    currentIdx >= 0 && currentIdx < orderedCourseItems.length - 1
      ? orderedCourseItems[currentIdx + 1]
      : null;

  const getItemHref = useCallback(
    (target: ItemRecord) => {
      if (!course) return "/";
      const targetLesson = lessons.find((l) => l.id === target.lessonId);
      if (!targetLesson) return `/learn/${course.slug}`;
      return `/learn/${course.slug}/${targetLesson.slug}/${target.slug}`;
    },
    [course, lessons]
  );

  const isLastItemOfLesson = Boolean(
    item &&
      publishedLessonItems.length > 0 &&
      publishedLessonItems[publishedLessonItems.length - 1]?.id === item.id
  );
  const isLastItemOfCourse = Boolean(
    item &&
      orderedCourseItems.length > 0 &&
      orderedCourseItems[orderedCourseItems.length - 1]?.id === item.id
  );

  const isItemCompleted = Boolean(myProgress?.isCompleted);

  // Track first-time completion in this session for CONTENT celebration confetti
  const wasCompletedOnMountRef = useRef<boolean>(true);
  const lastTrackedItemIdRef = useRef<string | null>(null);
  const confettiFiredRef = useRef<boolean>(false);

  if (item && lastTrackedItemIdRef.current !== item.id) {
    lastTrackedItemIdRef.current = item.id;
    wasCompletedOnMountRef.current = Boolean(
      progressMap[item.id]?.isCompleted
    );
    confettiFiredRef.current = false;
  }

  useEffect(() => {
    if (
      item?.type === "CONTENT" &&
      isItemCompleted &&
      !wasCompletedOnMountRef.current &&
      !confettiFiredRef.current &&
      (isLastItemOfLesson || isLastItemOfCourse) &&
      !reduceMotion
    ) {
      confettiFiredRef.current = true;
      try {
        confetti({
          particleCount: 55,
          spread: 65,
          origin: { y: 0.7 },
        });
      } catch {}
    }
  }, [
    item?.type,
    isItemCompleted,
    isLastItemOfLesson,
    isLastItemOfCourse,
    reduceMotion,
  ]);

  // Keyboard shortcuts for CONTENT reading page
  useEffect(() => {
    if (!item || item.type !== "CONTENT") return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        handleToggleFocusMode();
        return;
      }

      if (e.key === "ArrowLeft" && prevItem) {
        e.preventDefault();
        router.push(getItemHref(prevItem));
        return;
      }

      if (e.key === "ArrowRight" && nextItem) {
        e.preventDefault();
        router.push(getItemHref(nextItem));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    item,
    prevItem,
    nextItem,
    getItemHref,
    handleToggleFocusMode,
    router,
    setIsSearchOpen,
  ]);

  if (dataLoading || authLoading) {
    return (
      <AppShell>
        <ArticleSkeleton />
      </AppShell>
    );
  }

  if (dbError && (!course || !lesson || !item)) {
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
              <Link href="/">{t("nav.backToHome")}</Link>
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
              <span>{t("nav.backToHome")}</span>
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  // Course Privacy / Group Gate
  const groupAccess = canUserViewCourse(user, course);
  if (!groupAccess.allowed) {
    const callbackPath = `/learn/${courseSlug}/${lessonSlug}/${itemSlug}`;
    const isLogin = groupAccess.reason === "LOGIN_REQUIRED";

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
            groupAccess.allowedGroups &&
            groupAccess.allowedGroups.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {groupAccess.allowedGroups.map((g) => (
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
              <Link href="/">{t("nav.backToHome")}</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!lesson || !item) {
    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">
            {t("gates.itemNotFoundTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("gates.itemNotFoundDesc")}
          </p>
          <Button asChild size="sm">
            <Link href={`/learn/${course.slug}`}>
              <ArrowLeft className="size-4 mr-1.5" />
              <span>{t("nav.backToCourse")}</span>
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  // Draft / Pending Review Gate
  const isStaffOrAuthor = Boolean(
    user &&
      (user.role === "ADMIN" ||
        user.role === "EDITOR" ||
        user.uid === item.authorId ||
        user.uid === course.authorId)
  );
  const canManage = canUserManageCourse(user, course.id) || isStaffOrAuthor;
  const isUnpublished =
    course.status !== "PUBLISHED" ||
    !lesson.isPublished ||
    item.status !== "PUBLISHED";

  if (isUnpublished && !isStaffOrAuthor) {
    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
          <Lock className="size-8 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold text-foreground">
            {t("gates.unpublishedTitle")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("gates.unpublishedDesc", { title: item.title })}
          </p>
          <Button asChild size="sm">
            <Link href={`/learn/${course.slug}`}>
              <ArrowLeft className="size-4 mr-1.5" />
              <span>{t("nav.backToCourse")}</span>
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  // Locked Sequential Gate View
  const access = checkItemAccess(
    item.id,
    courses,
    lessons,
    items,
    progressMap
  );
  if (!access.allowed && access.reason === "PREVIOUS_INCOMPLETE") {
    const blockingLesson = access.blockingItem
      ? lessons.find((l) => l.id === access.blockingItem?.lessonId)
      : undefined;
    const blockingHref =
      access.blockingItem && blockingLesson
        ? `/learn/${course.slug}/${blockingLesson.slug}/${access.blockingItem.slug}`
        : `/learn/${course.slug}/${lesson.slug}`;

    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
          <Lock className="size-8 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">
            {t("gates.lockedTitle")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("gates.lockedDesc", { title: item.title })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {access.blockingItem && (
              <Button asChild className="gap-1.5 cursor-pointer">
                <Link href={blockingHref}>
                  <span>
                    {t("gates.goToBlockingItem", {
                      title: access.blockingItem.title,
                    })}
                  </span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link href={`/learn/${course.slug}/${lesson.slug}`}>
                {t("nav.backToLesson")}
              </Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const isAssessmentItem = item.type === "QUIZ" || item.type === "ASSIGNMENT";

  // Assessment Page (QUIZ / ASSIGNMENT) — Standalone 3-stage inline page
  if (isAssessmentItem) {
    const clientSafeQuestions = stripQuizAnswersForClient(
      item.quizQuestions || []
    );
    const effectivePassScore =
      item.passScorePercent > 0 ? item.passScorePercent : 80;
    const itemAttempts = quizAttempts.filter(
      (a) => a.itemId === item.id && (!user || a.userId === user.uid)
    );
    const hasPendingReview = itemAttempts.some(
      (a) => a.status === "PENDING_REVIEW"
    );
    const nextItemHref = nextItem ? getItemHref(nextItem) : null;
    const certificateHref =
      isCourseCompleted || isLastItemOfCourse
        ? `/learn/${course.slug}/certificate`
        : null;

    return (
      <AppShell>
        {isUnpublished && (
          <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
              <span>
                <strong className="text-foreground mr-1.5">
                  [{t("gates.previewBadge")}]
                </strong>
                {t("gates.previewNotice", {
                  status: tCommon(`status.${item.status}`),
                })}
              </span>
              {canManage && (
                <Link
                  href={`/studio/items/${item.id}`}
                  className="text-primary hover:underline shrink-0"
                >
                  {t("actions.editInStudio")}
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-10">
          <QuizRunner
            key={item.id}
            itemId={item.id}
            title={item.title}
            summary={item.summary}
            type={item.type}
            content={item.content || []}
            attachments={item.attachments || []}
            passScorePercent={effectivePassScore}
            durationMinutes={item.quizDurationMinutes}
            maxAttempts={item.quizMaxAttempts}
            questions={clientSafeQuestions}
            attemptsUsed={itemAttempts.length}
            highestQuizScore={myProgress?.highestQuizScore ?? 0}
            hasPendingReview={hasPendingReview}
            isGuest={!user}
            nextItemHref={nextItemHref}
            certificateHref={certificateHref}
            onSignIn={() =>
              signInWithMpcOidc(
                `/learn/${course.slug}/${lesson.slug}/${item.slug}`
              )
            }
            onSubmitQuiz={(answers) => submitItemQuiz(item.id, answers)}
          />

          <ItemNav
            prevItem={prevItem}
            nextItem={nextItem}
            getItemHref={getItemHref}
          />

          <CommentSection itemId={item.id} />
        </div>
      </AppShell>
    );
  }

  // CONTENT Reading Page
  const effectiveRequireScroll = Boolean(item.requireScrollToBottom);
  const isLiked = Boolean(
    item.isLiked || (user && item.likedUserIds?.includes(user.uid))
  );
  const likesCount = item.likesCount ?? 0;

  const updatedDateObj = new Date(item.updatedAt);
  const formattedUpdatedDate = Number.isNaN(updatedDateObj.getTime())
    ? ""
    : format.dateTime(updatedDateObj, { dateStyle: "medium" });

  const columnWidthClass =
    readerPrefs.columnWidth === "sm"
      ? "max-w-2xl"
      : readerPrefs.columnWidth === "lg"
      ? "max-w-4xl"
      : "max-w-3xl";

  return (
    <AppShell hideLeftSidebar={focusMode}>
      {/* Fixed thin scroll progress bar at top */}
      <ReadingProgressBar value={scrollProgressPct} />

      {/* Preview banner for unpublished item */}
      {isUnpublished && !focusMode && (
        <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <span>
              <strong className="text-foreground mr-1.5">
                [{t("gates.previewBadge")}]
              </strong>
              {t("gates.previewNotice", {
                status: tCommon(`status.${item.status}`),
              })}
            </span>
            {canManage && (
              <Link
                href={`/studio/items/${item.id}`}
                className="text-primary hover:underline shrink-0"
              >
                {t("actions.editInStudio")}
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-6xl justify-center gap-12 px-4 sm:px-6 py-8">
        <article className={cn("w-full min-w-0", columnWidthClass)}>
          {/* Chapter Header: Title + single compact meta line */}
          <header className="mb-8 border-b border-border/60 pb-6 space-y-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground text-balance">
              {item.title}
            </h1>

            {item.summary && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {item.summary}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span>{t("readingTime", { minutes: item.readingTime })}</span>
                {formattedUpdatedDate && (
                  <>
                    <span>·</span>
                    <span>
                      {t("updatedAt", { date: formattedUpdatedDate })}
                    </span>
                  </>
                )}
                {currentViews > 0 && (
                  <>
                    <span>·</span>
                    <span>{t("views", { count: currentViews })}</span>
                  </>
                )}
              </div>

              {/* Reader controls: Display Settings, Focus Mode, Shortcuts, Studio Link */}
              <div className="flex items-center gap-1">
                <ReadingSettings
                  prefs={readerPrefs}
                  onChange={handleChangePrefs}
                />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={focusMode ? "secondary" : "ghost"}
                      size="xs"
                      onClick={handleToggleFocusMode}
                      aria-label={
                        focusMode
                          ? t("focusMode.disable")
                          : t("focusMode.enable")
                      }
                      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {focusMode ? (
                        <Minimize2 className="size-3.5 text-primary" />
                      ) : (
                        <Maximize2 className="size-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {t("focusMode.label")}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {focusMode ? t("focusMode.disable") : t("focusMode.enable")}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setShortcutsOpen(true)}
                      aria-label={t("shortcuts.triggerTooltip")}
                      className="h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Keyboard className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("shortcuts.triggerTooltip")}
                  </TooltipContent>
                </Tooltip>

                {canManage && !focusMode && (
                  <Button
                    asChild
                    variant="ghost"
                    size="xs"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Link href={`/studio/items/${item.id}`}>
                      {t("actions.editInStudio")}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Main Chapter Content */}
          <ArticleRenderer
            blocks={item.content || []}
            attachments={item.attachments || []}
            fontSize={readerPrefs.fontSize}
          />

          {/* Scroll Tracker Sentinel */}
          <ScrollTracker
            key={`${item.id}_${Boolean(myProgress?.hasScrolledBottom)}`}
            itemId={item.id}
            requireScroll={effectiveRequireScroll}
            initialScrolled={Boolean(myProgress?.hasScrolledBottom)}
            onScrollVerified={handleScrollVerified}
          />

          {/* End of Chapter Footer */}
          <footer className="mt-10 pt-6 border-t border-border/60 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Completion indicator + Primary Next CTA */}
              {isItemCompleted ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduceMotion ? { duration: 0 } : { duration: 0.25 }
                  }
                  className="flex flex-wrap items-center gap-3"
                >
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>{t("completion.completed")}</span>
                  </span>

                  {isCourseCompleted || isLastItemOfCourse ? (
                    <Button asChild size="sm" className="gap-1.5 font-semibold">
                      <Link href={`/learn/${course.slug}/certificate`}>
                        <Award className="size-4" />
                        <span>{t("completion.viewCertificate")}</span>
                      </Link>
                    </Button>
                  ) : nextItem ? (
                    <Button asChild size="sm" className="gap-1.5 font-semibold">
                      <Link href={getItemHref(nextItem)}>
                        <span>{t("completion.nextChapter")}</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  ) : null}
                </motion.div>
              ) : (
                <div />
              )}

              {/* Subtle Like & Share actions */}
              {!focusMode && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={likeLoading}
                    onClick={handleToggleLike}
                    aria-label={
                      isLiked
                        ? t("actions.unlikeAria")
                        : t("actions.likeAria")
                    }
                    className={cn(
                      "h-8 gap-1.5 px-2.5 text-xs cursor-pointer",
                      isLiked
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Heart
                      className={cn(
                        "size-3.5",
                        isLiked ? "fill-current" : ""
                      )}
                    />
                    <span>
                      {isLiked ? t("actions.liked") : t("actions.like")}
                    </span>
                    {likesCount > 0 && (
                      <span className="font-mono tabular-nums">
                        ({likesCount})
                      </span>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(window.location.href);
                        showToast(t("actions.linkCopied"), "success");
                      }
                    }}
                    className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Share2 className="size-3.5" />
                    <span>{t("actions.share")}</span>
                  </Button>
                </div>
              )}
            </div>

            {isItemCompleted &&
              (isCourseCompleted || isLastItemOfCourse || isLastItemOfLesson) && (
                <p className="text-xs text-muted-foreground">
                  {isCourseCompleted || isLastItemOfCourse
                    ? t("completion.courseCompletedHint")
                    : t("completion.lessonCompletedHint")}
                </p>
              )}

            <ItemNav
              prevItem={prevItem}
              nextItem={nextItem}
              getItemHref={getItemHref}
            />
          </footer>

          {/* Comments (hidden in Focus Mode) */}
          {!focusMode && <CommentSection itemId={item.id} />}
        </article>

        {/* Right Sticky TOC (hidden in Focus Mode) */}
        {!focusMode && <TableOfContents item={item} progress={myProgress} />}
      </div>

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </AppShell>
  );
}

export const ArticleClientPage = ItemReader;
