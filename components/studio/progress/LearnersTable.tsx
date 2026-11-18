"use client";

import React, { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ArrowUpDown, RotateCcw, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProgressBar } from "@/components/ui/animated-progress";
import { cn } from "@/lib/utils";
import type { LearnerStats } from "./progress-utils";

export type SortField = "name" | "progress" | "activity";
export type SortDirection = "asc" | "desc";

interface LearnersTableProps {
  learners: LearnerStats[];
  departments: string[];
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  deptFilter: string;
  onDeptFilterChange: (dept: string) => void;
  onResetFilters: () => void;
  onSelectLearner: (learner: LearnerStats) => void;
  loading?: boolean;
}

const PAGE_SIZE = 15;

export function LearnersTable({
  learners,
  departments,
  searchQuery,
  onSearchQueryChange,
  deptFilter,
  onDeptFilterChange,
  onResetFilters,
  onSelectLearner,
  loading,
}: LearnersTableProps) {
  const t = useTranslations("progress");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  const [sortField, setSortField] = useState<SortField>("progress");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "name" ? "asc" : "desc");
    }
    setPage(1);
  };

  const sortedLearners = useMemo(() => {
    const copy = [...learners];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = a.user.fullName.localeCompare(b.user.fullName);
      } else if (sortField === "progress") {
        cmp =
          a.overallPercent - b.overallPercent ||
          a.completedCoursesCount - b.completedCoursesCount ||
          a.user.fullName.localeCompare(b.user.fullName);
      } else {
        cmp =
          a.lastAccessedMs - b.lastAccessedMs ||
          a.user.fullName.localeCompare(b.user.fullName);
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [learners, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedLearners.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pagedLearners = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedLearners.slice(start, start + PAGE_SIZE);
  }, [sortedLearners, safePage]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || deptFilter !== "ALL";

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="size-3.5 text-muted-foreground/60" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="size-3.5 text-foreground" />
    ) : (
      <ArrowDown className="size-3.5 text-foreground" />
    );
  };

  const now = new Date();

  return (
    <div className="space-y-4">
      {/* Thanh tìm kiếm & lọc phòng ban */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              onSearchQueryChange(e.target.value);
              setPage(1);
            }}
            placeholder={t("filters.searchPlaceholder")}
            aria-label={tCommon("actions.search")}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={deptFilter}
            onValueChange={(val) => {
              onDeptFilterChange(val);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="h-9 w-[200px] text-sm cursor-pointer"
              aria-label={t("table.department")}
            >
              <SelectValue placeholder={t("filters.allDepartments")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("filters.allDepartments")}</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onResetFilters();
                setPage(1);
              }}
              className="h-9 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="size-3.5 mr-1" />
              <span>{t("filters.reset")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bảng học viên */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground">
                <th className="py-3 px-4 min-w-[220px]">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    aria-label={t("table.sortByName")}
                    className="inline-flex items-center gap-1.5 font-medium hover:text-foreground transition-colors cursor-pointer"
                  >
                    <span>{t("table.learner")}</span>
                    {renderSortIcon("name")}
                  </button>
                </th>
                <th className="py-3 px-4 min-w-[150px]">
                  {t("table.department")}
                </th>
                <th className="py-3 px-4 min-w-[140px]">
                  {t("table.coursesStartedCompleted")}
                </th>
                <th className="py-3 px-4 min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => handleSort("progress")}
                    aria-label={t("table.sortByProgress")}
                    className="inline-flex items-center gap-1.5 font-medium hover:text-foreground transition-colors cursor-pointer"
                  >
                    <span>{t("table.overallProgress")}</span>
                    {renderSortIcon("progress")}
                  </button>
                </th>
                <th className="py-3 px-4 min-w-[150px] text-right">
                  <button
                    type="button"
                    onClick={() => handleSort("activity")}
                    aria-label={t("table.sortByActivity")}
                    className="inline-flex items-center justify-end gap-1.5 font-medium hover:text-foreground transition-colors cursor-pointer ml-auto"
                  >
                    <span>{t("table.lastActive")}</span>
                    {renderSortIcon("activity")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-8 rounded-full shrink-0" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-3.5 px-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-3.5 px-4">
                      <Skeleton className="h-3 w-32" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : pagedLearners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        {t("table.emptyTitle")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("table.emptyDescription")}
                      </p>
                      {hasActiveFilters && (
                        <div className="pt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onResetFilters();
                              setPage(1);
                            }}
                            className="cursor-pointer"
                          >
                            {t("filters.reset")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pagedLearners.map((row) => {
                  const { user } = row;
                  const hasValidLastActive =
                    row.lastAccessedAt !== null && row.lastAccessedMs > 0;

                  return (
                    <tr
                      key={user.uid}
                      onClick={() => onSelectLearner(row)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="size-8 shrink-0">
                            {user.avatarUrl && (
                              <AvatarImage
                                src={user.avatarUrl}
                                alt={user.fullName}
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <AvatarFallback className="text-xs bg-muted text-foreground font-medium">
                              {user.fullName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">
                                {user.fullName}
                              </p>
                              {user.role !== "MEMBER" && (
                                <span className="text-[11px] text-muted-foreground">
                                  ·{" "}
                                  {user.role === "ADMIN"
                                    ? t("table.roleAdmin")
                                    : t("table.roleEditor")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {user.department || t("filters.unassignedDept")}
                      </td>

                      <td className="py-3 px-4">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs font-mono tabular-nums text-foreground">
                              {format.number(row.startedCoursesCount)} /{" "}
                              <span
                                className={cn(
                                  row.completedCoursesCount > 0 &&
                                    "text-emerald-600 dark:text-emerald-400 font-semibold"
                                )}
                              >
                                {format.number(row.completedCoursesCount)}
                              </span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("table.coursesRatioHint", {
                              started: format.number(row.startedCoursesCount),
                              completed: format.number(
                                row.completedCoursesCount
                              ),
                              total: format.number(row.totalCoursesCount),
                            })}
                          </TooltipContent>
                        </Tooltip>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 max-w-[200px]">
                          <ProgressBar
                            value={row.overallPercent}
                            label={t("table.overallProgress")}
                            className="flex-1"
                          />
                          <span
                            className={cn(
                              "text-xs font-mono tabular-nums w-10 text-right shrink-0",
                              row.overallPercent >= 100
                                ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                                : "text-foreground"
                            )}
                          >
                            {format.number(row.overallPercent)}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                        {hasValidLastActive && row.lastAccessedAt ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                {format.relativeTime(
                                  new Date(row.lastAccessedAt),
                                  now
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {format.dateTime(new Date(row.lastAccessedAt), {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span>{t("table.noActivity")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {!loading && sortedLearners.length > PAGE_SIZE && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span>
              {t("table.showingRange", {
                from: format.number((safePage - 1) * PAGE_SIZE + 1),
                to: format.number(
                  Math.min(safePage * PAGE_SIZE, sortedLearners.length)
                ),
                total: format.number(sortedLearners.length),
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="cursor-pointer"
              >
                {tCommon("actions.previous")}
              </Button>
              <span className="tabular-nums">
                {t("table.pageIndicator", {
                  page: format.number(safePage),
                  totalPages: format.number(totalPages),
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="cursor-pointer"
              >
                {tCommon("actions.next")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
