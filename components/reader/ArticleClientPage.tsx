"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useHandbook } from "@/context/HandbookContext";
import { AppShell } from "@/components/layout/AppShell";
import { TableOfContents } from "@/components/layout/TableOfContents";
import { ArticleRenderer } from "@/components/reader/ArticleRenderer";
import { ArticleCover } from "@/components/ui/ArticleCover";
import { ScrollTracker } from "@/components/reader/ScrollTracker";
import { QuizRunner } from "@/components/reader/QuizRunner";
import { CommentSection } from "@/components/comments/CommentSection";
import { ArticleSkeleton } from "@/components/reader/ArticleSkeleton";
import {
  canUserManageCategory,
  canUserViewArticle,
  checkArticleAccess,
  stripQuizAnswersForClient,
} from "@/lib/progression";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import type { ArticleRecord } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Globe,
  Heart,
  Home,
  Link2,
  Lock,
  RefreshCw,
  Share2,
  ShieldAlert,
  Trophy,
  User,
  Users,
} from "lucide-react";

interface ArticleClientPageProps {
  initialArticle: ArticleRecord | null;
  slug: string;
}

export function ArticleClientPage({
  initialArticle,
  slug,
}: ArticleClientPageProps) {
  const {
    user,
    categories,
    articles,
    progressMap,
    dataLoading,
    authLoading,
    dbError,
    signInWithMpcOidc,
    markArticleScrolled,
    submitArticleQuiz,
    toggleLikeArticle,
    showToast,
    recordArticleView,
  } = useHandbook();

  const [scrollProgressPct, setScrollProgressPct] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  const article =
    articles.find((a) => a.slug === slug || a.id === slug) || initialArticle;

  const [currentViews, setCurrentViews] = useState(article?.viewsCount ?? 0);

  useEffect(() => {
    if (typeof article?.viewsCount === "number") {
      setCurrentViews(article.viewsCount);
    }
  }, [article?.viewsCount]);

  useEffect(() => {
    if (!article?.id) return;
    const sessionKey = `mpc_viewed_${article.id}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(sessionKey)) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(sessionKey, Date.now().toString());
        }
        const updatedViews = await recordArticleView(article.id);
        if (typeof updatedViews === "number") {
          setCurrentViews(updatedViews);
        }
      } catch (err) {
        console.error("View increment error:", err);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [article?.id, recordArticleView]);

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
  }, [slug]);

  const handleToggleLike = async () => {
    if (!article || likeLoading) return;
    setLikeLoading(true);
    await toggleLikeArticle(article.id);
    setLikeLoading(false);
  };

  const handleScrollVerified = useCallback(async () => {
    if (!article) return;
    await markArticleScrolled(article.id);
  }, [article, markArticleScrolled]);

  const currentCat = article ? categories.find((c) => c.id === article.categoryId) : undefined;

  const currentRootCategory = React.useMemo(() => {
    if (!currentCat) return undefined;
    let cat: typeof currentCat | undefined = currentCat;
    while (cat && cat.parentId) {
      const parent = categories.find((c) => c.id === cat?.parentId);
      if (!parent) break;
      cat = parent;
    }
    return cat && cat.depth === 1 ? cat : currentCat;
  }, [currentCat, categories]);

  const categoryIds = React.useMemo(() => {
    if (!article) return [];
    if (!currentRootCategory) return [article.categoryId];
    const subIds = categories
      .filter((c) => c.depth === 2 && c.parentId === currentRootCategory.id)
      .map((c) => c.id);
    return [currentRootCategory.id, ...subIds];
  }, [currentRootCategory, categories, article?.categoryId]);

  const categoryArticles = React.useMemo(() => {
    if (categoryIds.length === 0) return [];
    return articles
      .filter((a) => a.isPublished && categoryIds.includes(a.categoryId))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [articles, categoryIds]);

  const isCategoryCompleted = React.useMemo(() => {
    if (categoryArticles.length === 0) return false;
    return categoryArticles.every((a) => Boolean(progressMap[a.id]?.isCompleted));
  }, [categoryArticles, progressMap]);

  // First published article of the subsequent category
  const nextCategoryArticle = React.useMemo(() => {
    const rootCategories = categories
      .filter((c) => c.depth === 1 && c.isPublished)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    const currentRootIdx = rootCategories.findIndex(
      (c) => c.id === currentRootCategory?.id
    );

    if (currentRootIdx >= 0) {
      for (let i = currentRootIdx + 1; i < rootCategories.length; i++) {
        const nextRoot = rootCategories[i];
        const nextSubIds = new Set(
          categories
            .filter((c) => c.depth === 2 && c.parentId === nextRoot.id)
            .map((c) => c.id)
        );
        const nextArticles = articles
          .filter(
            (a) =>
              a.isPublished &&
              (a.categoryId === nextRoot.id || nextSubIds.has(a.categoryId))
          )
          .sort((a, b) => a.orderIndex - b.orderIndex);

        if (nextArticles.length > 0) {
          return nextArticles[0];
        }
      }
    }

    // Fallback: any other uncompleted published article across the handbook
    return articles.find((a) => a.isPublished && !progressMap[a.id]?.isCompleted) || null;
  }, [categories, currentRootCategory, articles, progressMap]);

  // Trigger celebration confetti when the entire category is completed
  const hasFiredConfetti = useRef(false);
  useEffect(() => {
    if (isCategoryCompleted && !hasFiredConfetti.current) {
      hasFiredConfetti.current = true;
      try {
        confetti({
          particleCount: 85,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch {}
    }
  }, [isCategoryCompleted]);

  // While checking authentication or loading handbook data, show Skeleton
  // to avoid flashing forbidden/locked content before access evaluation
  if (dataLoading || authLoading) {
    return (
      <AppShell>
        <ArticleSkeleton />
      </AppShell>
    );
  }

  if (!article) {
    if (dbError) {
      return (
        <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
          <div className="mx-auto max-w-2xl px-6 py-16">
            <Card className="border-destructive/30 bg-destructive/5 p-8 text-center items-center space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
                <ShieldAlert className="size-6" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Lỗi kết nối cơ sở dữ liệu
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hệ thống không thể tải dữ liệu từ PostgreSQL ({dbError}). Vui lòng kiểm tra lại đường truyền mạng hoặc liên hệ quản trị viên.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Button
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="gap-1.5 font-semibold cursor-pointer"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Thử lại</span>
                </Button>
                <Button asChild variant="outline" size="sm" className="cursor-pointer">
                  <Link href="/">
                    <ArrowLeft className="size-4 mr-1" />
                    <span>Quay về trang chủ</span>
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </AppShell>
      );
    }

    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-2xl px-6 py-16">
          <Card className="p-8 text-center items-center space-y-3">
            <h1 className="text-2xl font-bold text-foreground">
              Article Not Found
            </h1>
            <p className="text-sm text-muted-foreground">
              The path{" "}
              <code className="font-mono text-primary">/docs/{slug}</code>{" "}
              does not exist or has been removed.
            </p>
            <Button asChild size="sm">
              <Link href="/">
                <ArrowLeft className="size-4" />
                <span>Return to Handbook Home</span>
              </Link>
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  const access = checkArticleAccess(article.id, articles, progressMap);
  const myProgress = progressMap[article.id];
  const isScrolledBottom =
    !article.requireScrollToBottom || Boolean(myProgress?.hasScrolledBottom);
  const isArticleCompleted = Boolean(myProgress?.isCompleted);
  const isLiked = Boolean(user && article.likedUserIds?.includes(user.uid));
  const likesCount = article.likesCount ?? 0;

  // Ordered articles in the same category for Prev / Next sequential navigation
  const siblingArticles = articles
    .filter((a) => a.categoryId === article.categoryId && a.isPublished)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const currentIdx = siblingArticles.findIndex((a) => a.id === article.id);
  const prevArticle = currentIdx > 0 ? siblingArticles[currentIdx - 1] : null;
  const nextArticle =
    currentIdx >= 0 && currentIdx < siblingArticles.length - 1
      ? siblingArticles[currentIdx + 1]
      : null;

  const clientSafeQuestions = stripQuizAnswersForClient(
    article.quizQuestions || []
  );

  // Draft / Pending Review Gate:
  // Non-published articles can ONLY be viewed by ADMIN, EDITOR, or the original author.
  // Regular users (MEMBER) or guests cannot view them via /docs/[...slug].
  const isStaffOrAuthor = Boolean(
    user &&
      (user.role === "ADMIN" ||
        user.role === "EDITOR" ||
        user.uid === article.authorId)
  );

  if (!article.isPublished || article.status !== "PUBLISHED") {
    if (!isStaffOrAuthor) {
      return (
        <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
          <div className="mx-auto max-w-2xl px-6 py-16">
            <Card className="border-border bg-card p-8 text-center items-center gap-4">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Lock className="size-6" />
              </div>
              <Badge variant="warning">
                {article.status === "PENDING_REVIEW"
                  ? "Đang chờ duyệt (Pending Review)"
                  : "Bản nháp (Draft)"}
              </Badge>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Bài viết chưa được xuất bản
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                Bài viết <strong>&ldquo;{article.title}&rdquo;</strong> hiện đang ở trạng thái{" "}
                <span className="font-semibold text-foreground lowercase">
                  {article.status === "PENDING_REVIEW" ? "chờ kiểm duyệt" : "bản nháp"}
                </span>{" "}
                và chưa được công khai cho người đọc.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button asChild size="sm" className="cursor-pointer">
                  <Link href="/">
                    <ArrowLeft className="size-4 mr-1.5" />
                    <span>Quay về trang chủ</span>
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </AppShell>
      );
    }
  }

  // Group Privacy Gate
  const groupAccess = canUserViewArticle(user, article);
  if (!groupAccess.allowed) {
    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-2xl px-6 py-16">
          <Card className="border-destructive/30 bg-destructive/5 p-8 text-center items-center gap-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              {groupAccess.reason === "LOGIN_REQUIRED" ? (
                <Lock className="size-6" />
              ) : (
                <ShieldAlert className="size-6" />
              )}
            </div>
            <Badge variant={groupAccess.reason === "LOGIN_REQUIRED" ? "default" : "destructive"}>
              {groupAccess.reason === "LOGIN_REQUIRED"
                ? "Sign-in Required (Internal Access)"
                : "Department Restricted"}
            </Badge>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {groupAccess.reason === "LOGIN_REQUIRED"
                ? "Internal Document Access"
                : "Restricted to Internal Group"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              Article <strong>&ldquo;{article.title}&rdquo;</strong>{" "}
              {groupAccess.allowedGroups && groupAccess.allowedGroups.length > 0
                ? "is restricted to the following departments:"
                : "is reserved for registered MPC members."}
            </p>
            {groupAccess.allowedGroups && groupAccess.allowedGroups.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {groupAccess.allowedGroups.map((g) => (
                  <Badge key={g} variant="outline" className="border-primary/40 text-primary font-medium">
                    {g}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {groupAccess.reason === "LOGIN_REQUIRED"
                ? "Please sign in with your MPC account to read this document."
                : "Your account does not have access to these departments. Please contact Club Leaders if you need access."}
            </p>
            <div className="flex items-center gap-3 pt-2">
              {groupAccess.reason === "LOGIN_REQUIRED" && (
                <Button asChild size="sm" className="font-semibold cursor-pointer">
                  <Link href={`/login?callbackUrl=/docs/${article.slug}`}>
                    Sign in with MPC Account
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm" className="cursor-pointer">
                <Link href="/">
                  <ArrowLeft className="size-4 mr-1.5" />
                  <span>Return to Home</span>
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Locked Sequential Gate View
  if (!access.allowed && access.reason === "PREVIOUS_INCOMPLETE") {
    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-2xl px-6 py-16">
          <Card className="border-amber-500/30 bg-amber-500/5 p-8 text-center items-center gap-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Lock className="size-6" />
            </div>
            <Badge variant="warning">Sequential Curriculum Gate</Badge>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              This lesson is locked in the sequential roadmap
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              To unlock <strong>&ldquo;{article.title}&rdquo;</strong>, you must complete the previous lesson and its assessment:
            </p>
            {access.blockingArticle && (
              <Button asChild size="lg" className="mt-2 cursor-pointer">
                <Link href={`/docs/${access.blockingArticle.slug}`}>
                  <span>Go to lesson: {access.blockingArticle.title}</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
            )}
          </Card>
        </div>
      </AppShell>
    );
  }

  const createdDateStr = formatDate(article.createdAt);
  const updatedDateStr = formatDate(article.updatedAt);
  const isRecentlyUpdated = article.createdAt !== article.updatedAt;

  return (
    <AppShell>
      {/* Draft / Pending Preview Notice Banner for Staff & Author */}
      {(!article.isPublished || article.status !== "PUBLISHED") && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-xs sm:text-sm text-amber-800 dark:text-amber-300">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-medium">
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/20 text-amber-900 dark:text-amber-200 uppercase text-[10px] tracking-wide">
                Chế độ xem trước
              </Badge>
              <span>
                Bài viết này đang ở trạng thái{" "}
                <strong>{article.status === "PENDING_REVIEW" ? "Pending Review" : "Draft"}</strong>{" "}
                và chỉ Admin, Editor hoặc tác giả mới có thể thấy.
              </span>
            </div>
            {isStaffOrAuthor && (
              <Button asChild size="xs" variant="outline" className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20">
                <Link href={`/studio/articles/${article.id}`}>Chỉnh sửa trong Studio</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Mobile / Tablet Top Sticky Reading Progress Bar */}
      <div className="sticky top-14 z-20 xl:hidden">
        <Progress value={scrollProgressPct} className="h-1 rounded-none" />
      </div>

      {/* Main Content + Right TOC */}
      <div className="mx-auto flex max-w-7xl justify-between gap-10 px-4 sm:px-8 py-6">
        {/* Center Article Column (Expanded width for comfortable reading) */}
        <article className="w-full max-w-4xl lg:max-w-5xl flex-1 min-w-0">
          {/* Article 3:1 Cover Banner */}
          <div className="mb-6 overflow-hidden rounded-xl border border-border shadow-xs">
            <ArticleCover
              src={
                article.coverImage?.startsWith("preset:")
                  ? undefined
                  : article.coverImage
              }
              seedId={
                article.coverImage?.startsWith("preset:")
                  ? article.coverImage.replace("preset:", "")
                  : article.id
              }
              title={article.title}
              aspectRatio="3/1"
            />
          </div>

          {/* Article H1 & Metadata */}
          <header className="mb-8 border-b border-border pb-6 space-y-3.5">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground text-balance">
              {article.title}
            </h1>

            {article.summary && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {article.summary}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleToggleLike}
                    disabled={likeLoading}
                    className={cn(
                      "group inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold border shadow-xs transition-all duration-200 cursor-pointer select-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50",
                      isLiked
                        ? "bg-rose-500 hover:bg-rose-600 text-white border-rose-600 shadow-rose-500/30 scale-100 active:scale-95"
                        : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:border-rose-500/60 active:scale-95 hover:shadow-sm"
                    )}
                    aria-label={isLiked ? "Unlike article" : "Like article"}
                  >
                    <Heart
                      className={cn(
                        "size-3.5 transition-transform duration-300",
                        isLiked
                          ? "fill-white text-white scale-110"
                          : "fill-rose-500/20 text-rose-600 dark:text-rose-400 group-hover:scale-125 group-hover:fill-rose-500"
                      )}
                    />
                    <span className="font-mono tabular-nums">
                      {likesCount > 0 ? `${likesCount} likes` : "Like"}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {isLiked ? "Click to unlike" : "Click to like this article"}
                </TooltipContent>
              </Tooltip>

              {/* Share button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(window.location.href);
                        showToast("Article link copied to clipboard!", "success");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-border/80 bg-muted/40 hover:bg-muted text-foreground/90 shadow-2xs hover:border-primary/40 transition-all cursor-pointer select-none active:scale-95"
                    aria-label="Share article"
                  >
                    <Share2 className="size-3.5 text-primary shrink-0" />
                    <span>Share</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copy shareable link</TooltipContent>
              </Tooltip>

              {article.visibility === "UNPUBLIC" && (
                <Badge variant="outline" className="border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10 text-xs gap-1 font-mono">
                  <Link2 className="size-3" />
                  <span>Unlisted</span>
                </Badge>
              )}
              {article.audience === "INTERNAL" && (
                <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-xs gap-1 font-mono">
                  <Lock className="size-3" />
                  <span>MPC Internal</span>
                </Badge>
              )}
              {/* 1. Author (Icon User) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-xs text-foreground/90 font-medium cursor-default">
                    <User className="size-3.5 text-primary shrink-0" />
                    <span>{article.authorName}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Author</TooltipContent>
              </Tooltip>

              {/* 2. Publish Date (Icon Calendar) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground font-mono tabular-nums cursor-default">
                    <Calendar className="size-3.5 text-muted-foreground/80 shrink-0" />
                    <span>{createdDateStr}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Published Date</TooltipContent>
              </Tooltip>

              {/* 3. Last Edit Date (Icon Refresh) */}
              {isRecentlyUpdated && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs text-foreground/80 font-mono tabular-nums cursor-default">
                      <RefreshCw className="size-3 text-primary shrink-0" />
                      <span>{updatedDateStr}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Last Updated</TooltipContent>
                </Tooltip>
              )}

              {/* 4. Reading Time (Icon Clock) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground font-mono tabular-nums cursor-default">
                    <Clock className="size-3.5 text-muted-foreground/80 shrink-0" />
                    <span>~{article.readingTime} min read</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Estimated reading time</TooltipContent>
              </Tooltip>

              {/* 5. Views Count (Icon Eye - with Debounce) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground font-mono tabular-nums cursor-default">
                    <Eye className="size-3.5 text-muted-foreground/80 shrink-0" />
                    <span>{currentViews.toLocaleString("en-US")}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Article views</TooltipContent>
              </Tooltip>

              {/* 6. Learning Requirement / Completed Status */}
              {/* {isArticleCompleted ? (
                <Badge variant="success" className="gap-1 px-2.5 py-1 text-xs font-medium">
                  <CheckCircle2 className="size-3.5" />
                  <span>Completed</span>
                </Badge>
              ) : article.passScorePercent > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="info" className="gap-1 px-2.5 py-1 text-xs font-medium cursor-help">
                      <Award className="size-3.5" />
                      <span>≥ {article.passScorePercent}% Quiz</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Requires minimum {article.passScorePercent}% quiz score</TooltipContent>
                </Tooltip>
              ) : (
                <Badge variant="secondary" className="gap-1 px-2.5 py-1 text-xs font-normal text-muted-foreground">
                  <BookOpen className="size-3.5" />
                  <span>Read to complete</span>
                </Badge>
              )} */}

            </div>
          </header>

          {/* BlockNote Prose + Attachment Bar */}
          <ArticleRenderer
            blocks={article.content || []}
            attachments={article.attachments || []}
          />

          {/* Scroll Tracker Sentinel at bottom of article */}
          <ScrollTracker
            key={`${article.id}_${Boolean(myProgress?.hasScrolledBottom)}`}
            articleId={article.id}
            requireScroll={article.requireScrollToBottom}
            initialScrolled={Boolean(myProgress?.hasScrolledBottom)}
            onScrollVerified={handleScrollVerified}
          />

          {/* End-of-Article Quiz Runner */}
          <QuizRunner
            articleId={article.id}
            passScorePercent={article.passScorePercent}
            durationMinutes={article.quizDurationMinutes}
            maxAttempts={article.quizMaxAttempts}
            isExam={article.quizIsExam}
            questions={clientSafeQuestions}
            isUnlockedByScroll={isScrolledBottom}
            highestQuizScore={myProgress?.highestQuizScore ?? 0}
            onSubmitQuiz={(answers) => submitArticleQuiz(article.id, answers)}
          />

          {/* Completion Banner & Prev/Next Sequential Navigation */}
          <footer className="mt-10 space-y-5">
            <Separator />

            {/* Notification Banner: Category Completed vs Article Completed */}
            {isCategoryCompleted ? (
              <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-card to-background p-6 sm:p-7 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs ring-2 ring-emerald-500/30">
                      <Trophy className="size-6" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="success" className="gap-1 font-semibold text-xs py-0.5 px-2.5">
                          <CheckCircle2 className="size-3.5" />
                          <span>Category Completed</span>
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                          {categoryArticles.length}/{categoryArticles.length} lessons completed
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-foreground">
                        Congratulations! You have completed the entire section &ldquo;{currentRootCategory?.name || currentCat?.name}&rdquo;!
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
                        {nextCategoryArticle
                          ? "You have completed all lessons in this section. Continue on to explore subsequent categories in the curriculum roadmap!"
                          : "You have successfully completed all lessons in the MPC Club Handbook!"}
                      </p>
                    </div>
                  </div>

                  {/* 2 Buttons: Continue reading & Return to Home */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                    {nextCategoryArticle && (
                      <Button
                        asChild
                        size="default"
                        className="font-semibold gap-2 shadow-sm cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border-none h-10 px-5"
                      >
                        <Link href={`/docs/${nextCategoryArticle.slug}`}>
                          <span>Continue reading</span>
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      asChild
                      variant="outline"
                      size="default"
                      className="gap-2 cursor-pointer font-medium h-10 px-4 border-border hover:bg-muted"
                    >
                      <Link href="/">
                        <Home className="size-4" />
                        <span>Return to Home</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : isArticleCompleted ? (
              <Alert variant="success" className="items-center">
                <CheckCircle2 className="size-4" />
                <div className="col-start-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                  <div>
                    <AlertTitle className="text-emerald-700 dark:text-emerald-400">
                      You have successfully completed this lesson!
                    </AlertTitle>
                    <AlertDescription>
                      Your progress has been recorded and the next lesson in the roadmap is unlocked.
                    </AlertDescription>
                  </div>
                  {nextArticle && (
                    <Button asChild variant="success" size="sm" className="shrink-0 cursor-pointer">
                      <Link href={`/docs/${nextArticle.slug}`}>
                        <span>Next: {nextArticle.title}</span>
                        <ArrowRight className="size-3.5 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </Alert>
            ) : null}

            {/* Appreciation & Like Box */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card/60">
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="text-sm font-semibold text-foreground">
                  Did you find this helpful?
                </p>
                <p className="text-xs text-muted-foreground">
                  Leave a like to support the author {article.authorName}.
                </p>
              </div>
              <Button
                type="button"
                variant={isLiked ? "secondary" : "outline"}
                size="sm"
                onClick={handleToggleLike}
                disabled={likeLoading}
                className={`gap-2 cursor-pointer transition-all ${isLiked
                    ? "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10 font-semibold"
                    : "hover:border-rose-500/40 hover:text-rose-600"
                  }`}
              >
                <Heart
                  className={`size-4 transition-transform ${isLiked ? "fill-rose-500 text-rose-500 scale-110" : ""
                    }`}
                />
                <span>{isLiked ? "Liked" : "Like article"}</span>
                <span className="font-mono text-xs opacity-80">({likesCount})</span>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {prevArticle ? (
                <Card
                  asChild
                  className="p-4 gap-1 hover:border-primary/60 transition-colors cursor-pointer"
                >
                  <Link href={`/docs/${prevArticle.slug}`}>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ArrowLeft className="size-3.5" /> Previous lesson
                    </span>
                    <span className="text-sm font-semibold text-foreground truncate">
                      {prevArticle.title}
                    </span>
                  </Link>
                </Card>
              ) : (
                <div />
              )}

              {nextArticle ? (
                <Card
                  asChild
                  className="p-4 gap-1 items-end text-right hover:border-primary/60 transition-colors cursor-pointer"
                >
                  <Link href={`/docs/${nextArticle.slug}`}>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      Next lesson <ArrowRight className="size-3.5" />
                    </span>
                    <span className="text-sm font-semibold text-foreground truncate max-w-full">
                      {nextArticle.title}
                    </span>
                  </Link>
                </Card>
              ) : null}
            </div>
          </footer>

          {/* Discussion & Comment Section */}
          <CommentSection articleId={article.id} />
        </article>

        {/* Right Sticky Table of Contents & Progress */}
        <TableOfContents article={article} progress={myProgress} />
      </div>
    </AppShell>
  );
}

