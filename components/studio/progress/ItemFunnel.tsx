"use client";

import React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ProgressBar } from "@/components/ui/animated-progress";
import { cn } from "@/lib/utils";
import type { FunnelItemRow } from "./progress-utils";

interface ItemFunnelProps {
  rows: FunnelItemRow[];
}

export function ItemFunnel({ rows }: ItemFunnelProps) {
  const t = useTranslations("progress");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">
          {t("funnel.title")}
        </h3>
        <p className="text-xs text-muted-foreground">{t("funnel.subtitle")}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          {t("funnel.empty")}
        </p>
      ) : (
        <div className="space-y-3.5">
          {rows.map((row) => {
            const isQuizOrAssignment =
              row.item.type === "QUIZ" || row.item.type === "ASSIGNMENT";

            return (
              <div key={row.item.id} className="space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-mono text-muted-foreground tabular-nums shrink-0">
                      {format.number(row.orderNumber)}.
                    </span>
                    <span className="font-medium text-foreground truncate">
                      {row.item.title}
                    </span>
                    {row.lessonTitle && (
                      <span className="text-muted-foreground truncate hidden sm:inline">
                        · {row.lessonTitle}
                      </span>
                    )}
                    {isQuizOrAssignment && (
                      <span className="text-[11px] text-muted-foreground">
                        ({tCommon(`itemType.${row.item.type}`)})
                      </span>
                    )}
                    {!row.item.isRequired && (
                      <span className="text-[11px] text-muted-foreground">
                        · {t("funnel.optionalTag")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 tabular-nums">
                    {row.avgQuizScore !== null && (
                      <span className="text-muted-foreground font-mono">
                        {t("funnel.avgScore", {
                          score: format.number(row.avgQuizScore),
                        })}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {t("funnel.learnersCompleted", {
                        completed: format.number(row.completedLearners),
                        total: format.number(row.totalLearners),
                      })}
                    </span>
                    <span
                      className={cn(
                        "font-mono font-semibold w-10 text-right",
                        row.completionPercent >= 100
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                      )}
                    >
                      {format.number(row.completionPercent)}%
                    </span>
                  </div>
                </div>

                <ProgressBar
                  value={row.completionPercent}
                  heightClassName="h-2"
                  label={row.item.title}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
