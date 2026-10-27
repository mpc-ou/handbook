"use client";

import React from "react";
import Link from "next/link";
import { useHandbook } from "@/context/HandbookContext";
import { AppShell } from "@/components/layout/AppShell";
import { ArticleCover } from "@/components/ui/ArticleCover";
import { checkArticleAccess, canUserViewArticle } from "@/lib/progression";
import { ArticleRecord, UserProgressRecord, UserProfile } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  FileText,
  FolderOpen,
  GraduationCap,
  Info,
  Lock,
  Search,
  ShieldAlert,
  Users,
  Eye,
  Heart,
  Sparkles,
} from "lucide-react";

function ArticleRoadmapCard({
  article,
  publishedArticles,
  progressMap,
  user,
}: {
  article: ArticleRecord;
  publishedArticles: ArticleRecord[];
  progressMap: Record<string, UserProgressRecord>;
  user: UserProfile | null;
}) {
  const access = checkArticleAccess(
    article.id,
    publishedArticles,
    progressMap
  );
  const groupAccess = canUserViewArticle(user, article);
  const prog = user ? progressMap[article.id] : undefined;
  const isDone = Boolean(prog?.isCompleted);
  const isBlockedByGroup = !groupAccess.allowed;
  const isBlockedBySequence = user ? !access.allowed : false;
  const isAccessible = !isBlockedByGroup && !isBlockedBySequence;

  return (
    <Card
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden border p-0 gap-0 transition-all duration-300 cursor-pointer",
        !isAccessible
          ? "border-border/50 bg-muted/20 opacity-75 hover:opacity-90"
          : isDone
          ? "border-emerald-500/30 bg-emerald-500/[0.02] hover:border-emerald-500/60 hover:shadow-md"
          : "border-border/80 bg-card hover:border-primary/60 hover:shadow-md"
      )}
    >
      <Link href={`/docs/${article.slug}`} className="flex flex-col h-full cursor-pointer">
        {/* 3:1 Banner Cover Image */}
        <div className="overflow-hidden border-b border-border/60">
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

        {/* Card Body */}
        <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            {/* Meta Tags Strip */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="size-3 text-primary/70 shrink-0" />
                  <span>{article.readingTime}m</span>
                </span>
                {(article.viewsCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="size-3 text-muted-foreground/70 shrink-0" />
                    <span>{article.viewsCount}</span>
                  </span>
                )}
                {(article.likesCount ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-rose-500 font-semibold">
                    <Heart className="size-3 fill-rose-500/30 text-rose-500 shrink-0" />
                    <span>{article.likesCount}</span>
                  </span>
                )}
                {article.isRequired === false ? (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 text-muted-foreground font-normal">
                    Optional
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 text-primary border-primary/30 font-medium">
                    Required
                  </Badge>
                )}
              </div>

              {isDone ? (
                <Badge variant="success" className="text-xs gap-1 py-0.5 px-2">
                  <CheckCircle2 className="size-3" />
                  <span>Completed</span>
                </Badge>
              ) : isBlockedByGroup ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs gap-1 py-0.5 px-2 border-primary/40 bg-primary/10 text-primary cursor-help">
                      <Lock className="size-3" />
                      <span>{!user ? "Internal" : "Restricted"}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!user
                      ? "Sign in with an MPC account to read this article"
                      : `Reserved for: ${article.allowedGroups?.join(", ") || "Internal"}`}
                  </TooltipContent>
                </Tooltip>
              ) : isBlockedBySequence ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="warning"
                      className="text-xs gap-1 py-0.5 px-2 cursor-help"
                    >
                      <Lock className="size-3" />
                      <span>Locked</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Requires completing &ldquo;{access.blockingArticle?.title}&rdquo; first
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>

            {/* Title with HoverCard Summary */}
            <HoverCard openDelay={250}>
              <HoverCardTrigger asChild>
                <h4 className="font-semibold text-base text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </h4>
              </HoverCardTrigger>
              {article.summary && (
                <HoverCardContent align="start" className="w-72 text-xs space-y-1.5">
                  <p className="font-semibold text-foreground">{article.title}</p>
                  <p className="text-muted-foreground leading-relaxed">
                    {article.summary}
                  </p>
                </HoverCardContent>
              )}
            </HoverCard>
          </div>

          {/* Card Footer Action */}
          <div className="pt-1 flex items-center justify-between text-xs">
            {isBlockedByGroup ? (
              <span className="text-xs text-primary font-medium inline-flex items-center gap-1.5">
                <Lock className="size-3 shrink-0" />
                <span>{!user ? "Sign in to read" : "Restricted to internal group"}</span>
              </span>
            ) : isBlockedBySequence ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5 cursor-help">
                    <Lock className="size-3 text-amber-500 shrink-0" />
                    <span>Complete previous lesson first</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Complete &ldquo;{access.blockingArticle?.title}&rdquo; to unlock
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center justify-between w-full text-muted-foreground group-hover:text-primary transition-colors text-xs font-medium">
                <span>{isDone ? "Review lesson" : "Start lesson"}</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            )}
          </div>
        </div>
      </Link>
    </Card>
  );
}

function ArticleCardsContainer({
  articles,
  publishedArticles,
  progressMap,
  user,
}: {
  articles: ArticleRecord[];
  publishedArticles: ArticleRecord[];
  progressMap: Record<string, UserProgressRecord>;
  user: UserProfile | null;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  React.useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, articles, isExpanded]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 320;
    const scrollAmount = cardWidth + 16;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (articles.length <= 3) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((art) => (
          <ArticleRoadmapCard
            key={art.id}
            article={art}
            publishedArticles={publishedArticles}
            progressMap={progressMap}
            user={user}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Top Carousel Navigation Toolbar */}
      {!isExpanded && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-[11px]">
            <span>Scroll horizontally or use arrows to view more</span>
            <span className="text-foreground font-semibold">({articles.length} lessons)</span>
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="h-7 w-7 rounded-lg cursor-pointer"
              title="Scroll left"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="h-7 w-7 rounded-lg cursor-pointer"
              title="Scroll right"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Articles: Horizontal Carousel or Expanded Multi-Row Grid */}
      {!isExpanded ? (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-none pb-2 pt-1 scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {articles.map((art) => (
            <div
              key={art.id}
              className="w-[85vw] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] shrink-0 snap-start flex flex-col"
            >
              <ArticleRoadmapCard
                article={art}
                publishedArticles={publishedArticles}
                progressMap={progressMap}
                user={user}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((art) => (
            <ArticleRoadmapCard
              key={art.id}
              article={art}
              publishedArticles={publishedArticles}
              progressMap={progressMap}
              user={user}
            />
          ))}
        </div>
      )}

      {/* Expand / Collapse Button */}
      <div className="flex justify-center pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-full border border-border/60 hover:bg-muted/60 px-3.5 h-7 font-medium"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="size-3.5" />
              <span>Collapse to carousel</span>
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" />
              <span>Show all ({articles.length} lessons)</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user, categories, articles, progressMap, setIsSearchOpen } =
    useHandbook();

  const publishedArticles = articles
    .filter((a) => {
      if (!a.isPublished) return false;
      if ((a.visibility || "").toUpperCase() === "UNPUBLIC") return false;
      if (!user && (a.audience || "INTERNAL").toUpperCase() === "INTERNAL") {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const requiredArticles = publishedArticles.filter(
    (a) => a.isRequired !== false
  );

  const completedRequiredCount = requiredArticles.filter(
    (a) => progressMap[a.id]?.isCompleted
  ).length;

  const requiredPercent =
    requiredArticles.length > 0
      ? Math.round((completedRequiredCount / requiredArticles.length) * 100)
      : 0;

  // Next recommended unlocked incomplete article
  const nextRecommendedArticle =
    publishedArticles.find((art) => {
      const isDone = progressMap[art.id]?.isCompleted;
      if (isDone) return false;
      const access = checkArticleAccess(
        art.id,
        publishedArticles,
        progressMap
      );
      const groupAccess = canUserViewArticle(user, art);
      return access.allowed && groupAccess.allowed;
    }) || publishedArticles[0];

  const rootCategories = categories
    .filter((c) => c.depth === 1 && c.isPublished)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <AppShell hideLeftSidebar={true}>
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-8 sm:py-10 space-y-10">
        {/* Sleek, High-Taste Hero Banner (mpclub.dev aesthetic) */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-background p-6 sm:p-10 shadow-xs">
          {/* Subtle Orange Ambient Glow & Tech Grid Texture */}
          <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.1),transparent_65%)]" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3.5 max-w-2xl">
              {!user ? (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 hover:bg-primary/20 px-3.5 py-1 text-xs font-semibold text-primary transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
                >
                  <span className="flex size-2 rounded-full bg-primary animate-pulse" />
                  <span>If you are an MPC member, please sign in to access internal documents</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {user?.department && (
                    <Badge variant="secondary" className="text-xs">
                      Hello, {user.fullName}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground font-mono">
                    &ldquo;Where there are bugs, there is MPC!&rdquo;
                  </span>
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                <span className="text-primary">Internal Handbook</span>{" "}
                <span className="text-foreground">& Curriculum Roadmap</span>
              </h1>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Standardized operating regulations, professional event playbooks, and specialized training curriculums from MPC Club leaders.
              </p>

              {/* Compact Progress Indicator Pill - Only displayed when authenticated */}
              {user && (
                <div className="inline-flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2 text-xs">
                  <span className="text-muted-foreground">Required lessons:</span>
                  <span className="font-mono font-bold text-foreground">
                    {completedRequiredCount}/{requiredArticles.length} lessons ({requiredPercent}%)
                  </span>
                  <div className="w-24 sm:w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${requiredPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions (mpclub.dev styled CTA) */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
              {nextRecommendedArticle && (
                <Button
                  asChild
                  size="default"
                  className="font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 rounded-xl cursor-pointer"
                >
                  <Link href={`/docs/${nextRecommendedArticle.slug}`}>
                    <span className="font-mono text-xs opacity-90">&gt;_</span>
                    <span>
                      {user && completedRequiredCount > 0
                        ? "Continue learning"
                        : "Start learning now"}
                    </span>
                    <ArrowRight className="size-4 ml-1" />
                  </Link>
                </Button>
              )}

            </div>
          </div>
        </div>

        {/* Structured Curriculum Sections */}
        {publishedArticles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-8 sm:p-12 text-center space-y-4 bg-muted/20">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderOpen className="size-6" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-bold text-foreground">
                {user ? "Handbook is Currently Empty" : "No Articles Available"}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {user
                  ? "There are currently no published articles in the handbook database. You can create new articles in Studio or run 'pnpm db:seed' to populate standard data."
                  : "All current handbook materials are reserved for internal MPC members. Please sign in with your club account to explore the curriculum."}
              </p>
            </div>
            <div className="pt-2">
              {user ? (
                <Button asChild size="sm">
                  <Link href="/studio/articles">
                    <span>Manage Articles in Studio</span>
                    <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link href="/login">
                    <span>Sign in with MPC Account</span>
                    <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {rootCategories.map((rootCat) => {
            const subCats = categories
              .filter(
                (c) =>
                  c.depth === 2 && c.parentId === rootCat.id && c.isPublished
              )
              .sort((a, b) => a.orderIndex - b.orderIndex);

            const directArticles = publishedArticles.filter(
              (a) => a.categoryId === rootCat.id
            );

            const totalCatArticles =
              directArticles.length +
              subCats.reduce(
                (acc, sub) =>
                  acc +
                  publishedArticles.filter((a) => a.categoryId === sub.id)
                    .length,
                0
              );

            const catCompleted =
              directArticles.filter((a) => progressMap[a.id]?.isCompleted)
                .length +
                subCats.reduce(
                  (acc, sub) =>
                    acc +
                    publishedArticles
                      .filter((a) => a.categoryId === sub.id)
                      .filter((a) => progressMap[a.id]?.isCompleted).length,
                  0
                );

            const catPct =
              totalCatArticles > 0
                ? Math.round((catCompleted / totalCatArticles) * 100)
                : 0;

            if (totalCatArticles === 0) return null;

            return (
              <div key={rootCat.id} id={`category-${rootCat.id}`} className="space-y-4 scroll-mt-20">
                {/* Clean Category Section Header */}
                <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FolderOpen className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-foreground">
                        {rootCat.name}
                      </h3>
                      {rootCat.description && (
                        <p className="text-xs text-muted-foreground">
                          {rootCat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    {user
                      ? `${catCompleted}/${totalCatArticles} completed (${catPct}%)`
                      : `${totalCatArticles} lessons`}
                  </span>
                </div>

                {/* Direct Articles with Carousel & Expandable Grid */}
                {directArticles.length > 0 && (
                  <ArticleCardsContainer
                    articles={directArticles}
                    publishedArticles={publishedArticles}
                    progressMap={progressMap}
                    user={user}
                  />
                )}

                {/* Subcategories (if any) */}
                {subCats.length > 0 && (
                  <div className="space-y-6 pt-2">
                    {subCats.map((sub) => {
                      const subArticles = publishedArticles.filter(
                        (a) => a.categoryId === sub.id
                      );

                      if (subArticles.length === 0) return null;

                      return (
                        <div key={sub.id} className="space-y-3 pl-2 sm:pl-3 border-l-2 border-primary/20">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                              <FileText className="size-3.5 text-primary" />
                              <span>{sub.name}</span>
                            </h4>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {subArticles.length} lessons
                            </span>
                          </div>

                          <ArticleCardsContainer
                            articles={subArticles}
                            publishedArticles={publishedArticles}
                            progressMap={progressMap}
                            user={user}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </AppShell>
  );
}
