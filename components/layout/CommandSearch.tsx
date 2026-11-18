"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useHandbook } from "@/context/HandbookContext";
import {
  createHandbookSearchIndex,
  searchHandbook,
  splitHighlightSegments,
  type SearchResultKind,
} from "@/lib/search";
import type { ItemType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  HelpCircle,
  Layers,
} from "lucide-react";

const RECENT_SEARCH_KEY = "mpc_recent_search";
const MAX_RECENT_ITEMS = 5;

interface RecentSearchEntry {
  id: string;
  kind: SearchResultKind;
  title: string;
  href: string;
  breadcrumb?: string;
  itemType?: ItemType;
}

const ITEM_TYPE_ICON: Record<
  ItemType,
  React.ComponentType<{ className?: string }>
> = {
  CONTENT: FileText,
  QUIZ: HelpCircle,
  ASSIGNMENT: ClipboardList,
};

function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const segments = useMemo(
    () => splitHighlightSegments(text, query),
    [text, query]
  );

  return (
    <>
      {segments.map((seg, idx) =>
        seg.highlight ? (
          <mark
            key={idx}
            className="rounded-xs bg-primary/20 px-0.5 text-foreground font-medium"
          >
            {seg.text}
          </mark>
        ) : (
          <React.Fragment key={idx}>{seg.text}</React.Fragment>
        )
      )}
    </>
  );
}

export function CommandSearch() {
  const router = useRouter();
  const t = useTranslations("search");
  const tCommon = useTranslations("common");
  const {
    isSearchOpen,
    setIsSearchOpen,
    courses,
    lessons,
    items,
    categories,
    progressMap,
    user,
  } = useHandbook();

  const [hasOpened, setHasOpened] = useState(false);
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recentItems, setRecentItems] = useState<RecentSearchEntry[]>([]);

  useEffect(() => {
    if (isSearchOpen) {
      setHasOpened(true);
      try {
        const stored = localStorage.getItem(RECENT_SEARCH_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentItems(parsed.slice(0, MAX_RECENT_ITEMS));
          }
        }
      } catch {
        // Ignore storage errors
      }
    } else {
      setRawQuery("");
      setDebouncedQuery("");
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(rawQuery);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [rawQuery]);

  // Lazy MiniSearch index creation (only computed once opened)
  const searchIndex = useMemo(() => {
    if (!hasOpened) return null;
    return createHandbookSearchIndex({
      courses,
      lessons,
      items,
      categories,
      user,
    });
  }, [hasOpened, courses, lessons, items, categories, user]);

  const groupedResults = useMemo(() => {
    if (!searchIndex || !debouncedQuery.trim()) {
      return { courses: [], lessons: [], items: [] };
    }
    return searchHandbook(searchIndex, debouncedQuery);
  }, [searchIndex, debouncedQuery]);

  const saveRecentAndNavigate = useCallback(
    (entry: RecentSearchEntry) => {
      try {
        const next = [
          entry,
          ...recentItems.filter((r) => r.href !== entry.href),
        ].slice(0, MAX_RECENT_ITEMS);
        setRecentItems(next);
        localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      setIsSearchOpen(false);
      router.push(entry.href);
    },
    [recentItems, router, setIsSearchOpen]
  );

  const clearRecent = () => {
    setRecentItems([]);
    try {
      localStorage.removeItem(RECENT_SEARCH_KEY);
    } catch {
      // Ignore
    }
  };

  const hasQuery = debouncedQuery.trim().length > 0;
  const visibleCourses = searchIndex?.visibleCourses ?? [];

  return (
    <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
      <DialogHeader className="sr-only">
        <DialogTitle>{t("dialogTitle")}</DialogTitle>
        <DialogDescription>{t("dialogDescription")}</DialogDescription>
      </DialogHeader>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden p-0 shadow-2xl sm:max-w-xl"
      >
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5"
        >
          <CommandInput
            value={rawQuery}
            onValueChange={setRawQuery}
            placeholder={t("placeholder")}
          />

          <CommandList>
            <CommandEmpty>{t("empty")}</CommandEmpty>

            {!hasQuery ? (
              <>
                {recentItems.length > 0 && (
                  <CommandGroup
                    heading={
                      <div className="flex items-center justify-between">
                        <span>{t("groups.recent")}</span>
                        <button
                          type="button"
                          onClick={clearRecent}
                          className="text-[11px] font-normal text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {t("clearRecent")}
                        </button>
                      </div>
                    }
                  >
                    {recentItems.map((entry) => {
                      const Icon =
                        entry.kind === "course"
                          ? GraduationCap
                          : entry.kind === "lesson"
                          ? Layers
                          : entry.itemType
                          ? ITEM_TYPE_ICON[entry.itemType]
                          : FileText;

                      return (
                        <CommandItem
                          key={`recent-${entry.href}`}
                          value={`recent-${entry.href}`}
                          onSelect={() => saveRecentAndNavigate(entry)}
                          className="flex items-start gap-2.5"
                        >
                          <Clock className="mt-0.5 size-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">
                              {entry.title}
                            </p>
                            {entry.breadcrumb && (
                              <p className="text-xs text-muted-foreground truncate">
                                {entry.breadcrumb}
                              </p>
                            )}
                          </div>
                          <Icon className="size-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {recentItems.length > 0 && visibleCourses.length > 0 && (
                  <CommandSeparator />
                )}

                {visibleCourses.length > 0 && (
                  <CommandGroup heading={t("groups.courses")}>
                    {visibleCourses.map((course) => (
                      <CommandItem
                        key={`default-course-${course.id}`}
                        value={`default-course-${course.id}`}
                        onSelect={() =>
                          saveRecentAndNavigate({
                            id: course.id,
                            kind: "course",
                            title: course.title,
                            href: `/learn/${course.slug}`,
                          })
                        }
                        className="flex items-start gap-2.5"
                      >
                        <GraduationCap className="mt-0.5 size-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">
                              {course.title}
                            </span>
                            {course.status !== "PUBLISHED" && (
                              <span className="text-[10px] text-muted-foreground">
                                {tCommon("status.DRAFT")}
                              </span>
                            )}
                          </div>
                          {course.summary && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {course.summary}
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            ) : (
              <>
                {/* Group 1: Courses */}
                {groupedResults.courses.length > 0 && (
                  <CommandGroup heading={t("groups.courses")}>
                    {groupedResults.courses.map((hit) => (
                      <CommandItem
                        key={hit.id}
                        value={hit.id}
                        onSelect={() =>
                          saveRecentAndNavigate({
                            id: hit.entityId,
                            kind: "course",
                            title: hit.title,
                            href: hit.href,
                          })
                        }
                        className="flex items-start gap-2.5"
                      >
                        <GraduationCap className="mt-0.5 size-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">
                              <HighlightedText
                                text={hit.title}
                                query={debouncedQuery}
                              />
                            </span>
                            {hit.status !== "PUBLISHED" && (
                              <span className="text-[10px] text-muted-foreground">
                                {tCommon("status.DRAFT")}
                              </span>
                            )}
                          </div>
                          {hit.snippet && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              <HighlightedText
                                text={hit.snippet}
                                query={debouncedQuery}
                              />
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {groupedResults.courses.length > 0 &&
                  groupedResults.lessons.length > 0 && <CommandSeparator />}

                {/* Group 2: Lessons */}
                {groupedResults.lessons.length > 0 && (
                  <CommandGroup heading={t("groups.lessons")}>
                    {groupedResults.lessons.map((hit) => (
                      <CommandItem
                        key={hit.id}
                        value={hit.id}
                        onSelect={() =>
                          saveRecentAndNavigate({
                            id: hit.entityId,
                            kind: "lesson",
                            title: hit.title,
                            href: hit.href,
                            breadcrumb: hit.courseTitle,
                          })
                        }
                        className="flex items-start gap-2.5"
                      >
                        <Layers className="mt-0.5 size-4 text-primary/80 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground truncate">
                              <HighlightedText
                                text={hit.title}
                                query={debouncedQuery}
                              />
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {hit.courseTitle}
                            </span>
                          </div>
                          {hit.snippet && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              <HighlightedText
                                text={hit.snippet}
                                query={debouncedQuery}
                              />
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {(groupedResults.courses.length > 0 ||
                  groupedResults.lessons.length > 0) &&
                  groupedResults.items.length > 0 && <CommandSeparator />}

                {/* Group 3: Items (Chapters / Quizzes / Assignments) */}
                {groupedResults.items.length > 0 && (
                  <CommandGroup heading={t("groups.items")}>
                    {groupedResults.items.map((hit) => {
                      const isDone = Boolean(
                        progressMap[hit.entityId]?.isCompleted
                      );
                      const TypeIcon = hit.itemType
                        ? ITEM_TYPE_ICON[hit.itemType]
                        : FileText;
                      const breadcrumb = `${hit.courseTitle} › ${hit.lessonTitle}`;

                      return (
                        <CommandItem
                          key={hit.id}
                          value={hit.id}
                          onSelect={() =>
                            saveRecentAndNavigate({
                              id: hit.entityId,
                              kind: "item",
                              title: hit.title,
                              href: hit.href,
                              breadcrumb,
                              itemType: hit.itemType,
                            })
                          }
                          className="flex items-start gap-2.5"
                        >
                          {isDone ? (
                            <CheckCircle2 className="mt-0.5 size-4 text-emerald-500 shrink-0" />
                          ) : (
                            <TypeIcon className="mt-0.5 size-4 text-primary shrink-0" />
                          )}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-foreground truncate">
                                <HighlightedText
                                  text={hit.title}
                                  query={debouncedQuery}
                                />
                              </span>
                              <span className="text-[11px] text-muted-foreground shrink-0 max-w-[180px] truncate">
                                {breadcrumb}
                              </span>
                            </div>
                            {hit.snippet && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                <HighlightedText
                                  text={hit.snippet}
                                  query={debouncedQuery}
                                />
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>

          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
            <span>{t("footer.navigate")}</span>
            <span>{t("footer.close")}</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
