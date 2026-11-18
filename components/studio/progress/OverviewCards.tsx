"use client";

import React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { CountUp } from "@/components/ui/animated-progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { OverviewMetrics } from "./progress-utils";

interface OverviewCardsProps {
  metrics: OverviewMetrics;
  loading?: boolean;
}

export function OverviewCards({ metrics, loading }: OverviewCardsProps) {
  const t = useTranslations("progress");
  const format = useFormatter();

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-border bg-card p-5 space-y-2"
          >
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t("overview.learnersCount")}
        </p>
        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          <CountUp value={metrics.totalLearners} />
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t("overview.avgCompletion")}
        </p>
        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          <CountUp value={metrics.avgCompletionPercent} suffix="%" />
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t("overview.active7d")}
        </p>
        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          <CountUp value={metrics.activeLast7DaysCount} />
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {t("overview.completedCourses")}
        </p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            <CountUp value={metrics.coursesWithCompletionsCount} />
          </p>
          <span className="text-xs text-muted-foreground">
            {t("overview.outOfCourses", {
              total: format.number(metrics.totalCoursesCount),
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
