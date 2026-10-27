"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHandbook } from "@/context/HandbookContext";
import { checkArticleAccess } from "@/lib/progression";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  BookOpen,
  CalendarRange,
  Camera,
  CheckCircle2,
  ChevronRight,
  Code2,
  FileText,
  Folder,
  GraduationCap,
  Home,
  Lock,
  ShieldCheck,
  Terminal,
  Users,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck,
  CalendarRange,
  Code2,
  Users,
  GraduationCap,
  Terminal,
  Camera,
  Folder,
  FileText,
};

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const { categories, articles, progressMap, user } = useHandbook();

  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});

  const toggleCollapse = (catId: string, open: boolean) => {
    setCollapsedIds((prev) => ({ ...prev, [catId]: !open }));
  };

  const level1Categories = categories
    .filter((c) => c.depth === 1 && c.isPublished)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const slugSegments = pathname.startsWith("/docs")
    ? pathname.replace(/^\/docs\/?/, "").split("/").filter(Boolean)
    : [];
  const currentSlug = slugSegments[slugSegments.length - 1]
    ? decodeURIComponent(slugSegments[slugSegments.length - 1])
    : "";

  const visibleArticles = articles
    .filter((a) => {
      const isUnpublic = (a.visibility || "").toUpperCase() === "UNPUBLIC";
      const isReadingThis = a.slug === currentSlug || a.id === currentSlug;
      const isStaff = user?.role === "ADMIN" || user?.role === "EDITOR";
      if (isUnpublic) {
        return isReadingThis || isStaff;
      }
      if (!user) {
        const aud = (a.audience || "INTERNAL").toUpperCase();
        if (aud === "INTERNAL") {
          return false;
        }
      }
      return a.isPublished || isStaff;
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const currentArticle = visibleArticles.find(
    (a) => a.slug === currentSlug || a.id === currentSlug
  );

  const activeRootCategory = React.useMemo(() => {
    if (currentArticle) {
      let cat = categories.find((c) => c.id === currentArticle.categoryId);
      // Recursively traverse parentId to reach Tier 1 category (depth: 1)
      while (cat && cat.parentId) {
        const parent = categories.find((c) => c.id === cat?.parentId);
        if (!parent) break;
        cat = parent;
      }
      if (cat && cat.depth === 1) return cat;
    }
    return level1Categories[0];
  }, [currentArticle, categories, level1Categories]);

  const ActiveRootIcon = activeRootCategory
    ? ICON_MAP[activeRootCategory.icon] || Folder
    : Folder;

  const publishedCount = visibleArticles.filter((a) => a.isPublished).length;
  const completedCount = visibleArticles.filter(
    (a) => a.isPublished && progressMap[a.id]?.isCompleted
  ).length;
  const completionPct =
    publishedCount > 0 ? Math.round((completedCount / publishedCount) * 100) : 0;

  const isRootCategoryCompleted = React.useMemo(() => {
    if (!activeRootCategory) return false;
    const subCatIds = categories
      .filter((c) => c.depth === 2 && c.parentId === activeRootCategory.id)
      .map((c) => c.id);
    const catArticles = visibleArticles.filter(
      (a) =>
        a.isPublished &&
        (a.categoryId === activeRootCategory.id || subCatIds.includes(a.categoryId))
    );
    if (catArticles.length === 0) return false;
    return catArticles.every((a) => Boolean(progressMap[a.id]?.isCompleted));
  }, [activeRootCategory, categories, visibleArticles, progressMap]);

  const renderArticleLink = (articleId: string) => {
    const article = visibleArticles.find((a) => a.id === articleId);
    if (!article) return null;

    const access = checkArticleAccess(article.id, visibleArticles, progressMap);
    const prog = progressMap[article.id];
    const isCompleted = Boolean(prog?.isCompleted);
    const isCurrent = pathname === `/docs/${article.slug}`;

    if (!access.allowed) {
      return (
        <Tooltip key={article.id}>
          <TooltipTrigger asChild>
            <div className="group relative flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground/60 cursor-not-allowed select-none hover:bg-muted/40">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="size-3.5 shrink-0 text-muted-foreground/60" />
                <span className="truncate">{article.title}</span>
              </div>
              <Badge variant="warning" className="hidden group-hover:inline-flex text-[9px] px-1.5 py-0">
                Locked
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[230px]">
            Please complete{" "}
            <strong className="font-semibold">
              &ldquo;{access.blockingArticle?.title || "the previous lesson"}&rdquo;
            </strong>{" "}
            to unlock this lesson.
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        key={article.id}
        href={`/docs/${article.slug}`}
        onClick={onNavigate}
        className={cn(
          "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
          isCurrent
            ? "bg-primary/10 text-primary font-semibold"
            : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isCompleted ? (
            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
          ) : (
            <BookOpen
              className={cn(
                "size-3.5 shrink-0",
                isCurrent ? "text-primary" : "text-muted-foreground"
              )}
            />
          )}
          <span className="truncate">{article.title}</span>
        </div>
        {!article.isPublished && (
          <Badge variant="warning" className="text-[9px] px-1.5 py-0">
            Draft
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground select-none">
      {/* Sidebar Header Progress Summary or Guest Access Prompt */}
      {user ? (
        <div className="border-b border-sidebar-border px-4 py-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              Curriculum Progress
            </span>
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {completedCount}/{publishedCount} ({completionPct}%)
            </span>
          </div>
          <Progress
            value={completionPct}
            className="h-1.5"
            indicatorClassName="bg-emerald-500"
          />
        </div>
      ) : (
        <div className="border-b border-sidebar-border px-4 py-3 space-y-1.5 bg-sidebar-accent/10">
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <Lock className="size-3.5" />
            <span>MPC Internal Curriculum</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Sign in with an MPC account to access internal lessons and track progress.
          </p>
        </div>
      )}

      {/* Back Button & Navigation Toolbar */}
      <div className="px-3 py-2 border-b border-sidebar-border bg-sidebar-accent/10 flex items-center justify-between gap-1.5">
        <Button
          asChild
          variant="ghost"
          size="xs"
          className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent cursor-pointer gap-1.5 px-2 -ml-1 group flex-1 justify-start min-w-0"
        >
          <Link
            href={activeRootCategory ? `/#category-${activeRootCategory.id}` : "/"}
            onClick={onNavigate}
            title={
              activeRootCategory
                ? `Back to category "${activeRootCategory.name}" on Roadmap`
                : "Back to Curriculum Roadmap"
            }
          >
            <ArrowLeft className="size-3.5 text-muted-foreground group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span className="truncate">
              {activeRootCategory ? `Back: ${activeRootCategory.name}` : "Back to Roadmap"}
            </span>
          </Link>
        </Button>

        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="size-7 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent cursor-pointer shrink-0"
          title="Return to Handbook Home"
        >
          <Link href="/" onClick={onNavigate}>
            <Home className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* Active Tier 1 Category Header */}
      {activeRootCategory && (
        <div className="px-4 py-3 border-b border-sidebar-border bg-sidebar-accent/15 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Current Category</span>
            {isRootCategoryCompleted ? (
              <Badge variant="success" className="text-[9px] h-4 px-1.5 gap-1 font-semibold">
                <CheckCircle2 className="size-2.5" />
                <span>Completed</span>
              </Badge>
            ) : (
              <span className="font-mono text-[9px] text-muted-foreground/70">
                Tier 1
              </span>
            )}
          </div>
          <Link
            href={`/#category-${activeRootCategory.id}`}
            onClick={onNavigate}
            className="flex items-center gap-2 pt-0.5 min-w-0 group hover:opacity-90 transition-opacity"
            title="Click to view this category on the Roadmap"
          >
            <ActiveRootIcon className="size-4 text-primary shrink-0" />
            <h2 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {activeRootCategory.name}
            </h2>
          </Link>
        </div>
      )}

      {/* Single Root Category Articles & Sub-Categories Tree */}
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-3 pb-4">
          {activeRootCategory && (() => {
            const rootCat = activeRootCategory;
            const directArticles = visibleArticles.filter(
              (a) => a.categoryId === rootCat.id
            );
            const subCategories = categories
              .filter(
                (c) =>
                  c.depth === 2 && c.parentId === rootCat.id && c.isPublished
              )
              .sort((a, b) => a.orderIndex - b.orderIndex);

            return (
              <div key={rootCat.id} className="space-y-3">
                {/* Direct Articles in this Root Category */}
                {directArticles.length > 0 && (
                  <div className="space-y-0.5">
                    {directArticles.map((art) => renderArticleLink(art.id))}
                  </div>
                )}

                {/* Sub-Categories under this Root Category */}
                {subCategories.map((subCat) => {
                  const SubIcon = ICON_MAP[subCat.icon] || FileText;
                  const isSubOpen = !collapsedIds[subCat.id];
                  const subArticles = visibleArticles.filter(
                    (a) => a.categoryId === subCat.id
                  );

                  if (subArticles.length === 0) return null;

                  return (
                    <Collapsible
                      key={subCat.id}
                      open={isSubOpen}
                      onOpenChange={(open) => toggleCollapse(subCat.id, open)}
                      className="space-y-1"
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-semibold text-foreground/90 hover:bg-sidebar-accent transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <SubIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{subCat.name}</span>
                          </div>
                          <ChevronRight
                            className={cn(
                              "size-3 shrink-0 text-muted-foreground transition-transform duration-200",
                              isSubOpen && "rotate-90"
                            )}
                          />
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="space-y-0.5 pl-2.5 border-l border-sidebar-border ml-2 pt-0.5">
                        {subArticles.map((art) => renderArticleLink(art.id))}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </ScrollArea>

      {/* Sidebar Footer Back Action */}
      <div className="border-t border-sidebar-border p-2 bg-sidebar-accent/10">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full justify-center text-xs h-8 gap-2 cursor-pointer border-sidebar-border/80 text-muted-foreground hover:text-foreground bg-sidebar"
        >
          <Link
            href={activeRootCategory ? `/#category-${activeRootCategory.id}` : "/"}
            onClick={onNavigate}
          >
            <ArrowLeft className="size-3.5" />
            <span className="truncate">Back to Roadmap</span>
          </Link>
        </Button>
      </div>
    </aside>
  );
}
