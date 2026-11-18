"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 6 }: TableSkeletonProps) {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border bg-muted/30">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28 ml-auto" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>

        <div className="divide-y divide-border/60">
          {Array.from({ length: rows }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 px-4 py-3 transition-colors"
            >
              <Skeleton className="size-4 rounded shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-3/4 max-w-sm" />
                <Skeleton className="h-3 w-1/2 max-w-xs" />
              </div>
              <Skeleton className="h-5 w-24 rounded-md shrink-0" />
              <Skeleton className="h-5 w-20 rounded-full shrink-0" />
              <Skeleton className="size-7 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-1 pt-1 text-xs text-muted-foreground">
        <Skeleton className="h-4 w-36" />
        <div className="flex items-center gap-1">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="size-7 rounded-md" />
        </div>
      </div>
    </div>
  );
}

