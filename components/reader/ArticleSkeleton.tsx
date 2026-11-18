"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
      <header className="space-y-3 border-b border-border/60 pb-6">
        <Skeleton className="h-9 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center gap-3 pt-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      </header>

      <div className="space-y-5">
        <Skeleton className="h-6 w-2/5 rounded-md" />
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
