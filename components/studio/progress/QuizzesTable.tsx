"use client";

import React from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { QuizAssessmentRow } from "./progress-utils";

interface QuizzesTableProps {
  rows: QuizAssessmentRow[];
  loading?: boolean;
}

export function QuizzesTable({ rows, loading }: QuizzesTableProps) {
  const t = useTranslations("progress");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">
            {t("quizzes.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("quizzes.subtitle")}
          </p>
        </div>

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="self-start sm:self-auto cursor-pointer"
        >
          <Link href="/studio/quizzes">
            <span>{t("quizzes.manageQuizzes")}</span>
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium text-muted-foreground">
                <th className="py-3 px-4 min-w-[240px]">
                  {t("quizzes.columnItem")}
                </th>
                <th className="py-3 px-4 min-w-[110px]">
                  {t("quizzes.columnType")}
                </th>
                <th className="py-3 px-4 min-w-[110px] text-right">
                  {t("quizzes.columnAttempts")}
                </th>
                <th className="py-3 px-4 min-w-[120px] text-right">
                  {t("quizzes.columnAvgScore")}
                </th>
                <th className="py-3 px-4 min-w-[110px] text-right">
                  {t("quizzes.columnPassRate")}
                </th>
                <th className="py-3 px-4 min-w-[140px] text-right">
                  {t("quizzes.columnPending")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="py-3.5 px-4 space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-36" />
                    </td>
                    <td className="py-3.5 px-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Skeleton className="h-4 w-10 ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
                    <div className="max-w-sm mx-auto space-y-1.5">
                      <p className="text-sm font-medium text-foreground">
                        {t("quizzes.emptyTitle")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("quizzes.emptyDescription")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.item.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-foreground truncate max-w-md">
                        {row.item.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        {row.courseTitle} › {row.lessonTitle}
                      </p>
                    </td>

                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {tCommon(`itemType.${row.item.type}`)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-foreground">
                      {format.number(row.attemptsCount)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-foreground">
                      {row.avgScore !== null
                        ? `${format.number(row.avgScore)}%`
                        : "—"}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      {row.passRate !== null ? (
                        <span
                          className={cn(
                            row.passRate >= 80
                              ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                              : "text-foreground"
                          )}
                        >
                          {format.number(row.passRate)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right text-xs">
                      {row.pendingCount > 0 ? (
                        <Link
                          href="/studio/quizzes"
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          <span>
                            {t("quizzes.reviewNow", {
                              count: format.number(row.pendingCount),
                            })}
                          </span>
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">
                          {t("quizzes.allGraded")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
