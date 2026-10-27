"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/layout/AppShell";

export function ArticleSkeleton() {
  return (
    <div className="w-full">
      {/* Top sticky progress line */}
      <div className="sticky top-14 z-20 xl:hidden h-1 bg-muted/40 animate-pulse" />

      <div className="mx-auto flex max-w-7xl justify-between gap-10 px-4 sm:px-8 py-6">
        {/* Main Article Column */}
        <div className="w-full max-w-4xl lg:max-w-5xl flex-1 min-w-0 space-y-6">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <span className="text-muted-foreground/30">/</span>
            <Skeleton className="h-4 w-36" />
            <span className="text-muted-foreground/30">/</span>
            <Skeleton className="h-4 w-48" />
          </div>

          {/* 3:1 Cover Banner Skeleton */}
          <div className="relative aspect-[3/1] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/30">
            <Skeleton className="h-full w-full" />
          </div>

          {/* Title & Metadata Header Skeleton */}
          <header className="border-b border-border/80 pb-6 space-y-3.5">
            <Skeleton className="h-9 sm:h-11 w-4/5 rounded-lg" />
            <div className="space-y-2 pt-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Badges Row Skeleton */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Skeleton className="h-6 w-32 rounded-md" />
              <Skeleton className="h-6 w-28 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-6 w-28 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md ml-auto" />
            </div>
          </header>

          {/* Article Body Content Skeletons */}
          <div className="space-y-6 py-2">
            {/* Section Heading H2 */}
            <Skeleton className="h-7 w-2/5 rounded-md" />

            {/* Paragraph 1 */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>

            {/* Callout Box Skeleton */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded-full bg-primary/20" />
                <Skeleton className="h-4 w-28 bg-primary/20" />
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>

            {/* Paragraph 2 */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-9/12" />
            </div>

            {/* Bullet List Skeleton */}
            <div className="space-y-2.5 pl-2">
              <div className="flex items-center gap-3">
                <Skeleton className="size-2 rounded-full shrink-0" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="size-2 rounded-full shrink-0" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="size-2 rounded-full shrink-0" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>

            {/* Code Block Skeleton */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <Skeleton className="h-3.5 w-24 bg-slate-800" />
                <Skeleton className="h-3.5 w-16 bg-slate-800" />
              </div>
              <Skeleton className="h-3.5 w-4/5 bg-slate-800" />
              <Skeleton className="h-3.5 w-3/5 bg-slate-800" />
              <Skeleton className="h-3.5 w-2/3 bg-slate-800" />
            </div>

            {/* Quote Block Skeleton */}
            <div className="border-l-4 border-primary pl-4 py-1 space-y-2">
              <Skeleton className="h-4 w-5/6 italic" />
              <Skeleton className="h-3.5 w-28" />
            </div>

            {/* Attachments Section Skeleton */}
            <div className="mt-8 rounded-xl border border-border/80 bg-card/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-4 w-44" />
                </div>
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            </div>

            {/* Quiz Block Skeleton */}
            <div className="mt-8 rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="grid gap-2 pt-2">
                <Skeleton className="h-9 rounded-md" />
                <Skeleton className="h-9 rounded-md" />
              </div>
            </div>

            {/* Comments Section Skeleton */}
            <div className="mt-12 border-t border-border pt-8 space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="h-5 w-36" />
              </div>
              <Skeleton className="h-20 w-full rounded-xl" />
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sticky TOC Skeleton */}
        <aside className="hidden xl:block w-64 shrink-0 space-y-4 pt-8">
          <div className="sticky top-20 space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="space-y-2 pt-2 border-l border-border pl-3">
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-48" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

