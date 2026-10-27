"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { ArticleCover } from "@/components/ui/ArticleCover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRight,
  FolderTree,
  Plus,
} from "lucide-react";

export default function StudioOverviewPage() {
  const { articles, categories, allUsers, allProgress, quizAttempts } =
    useHandbook();

  const publishedArticles = useMemo(
    () => articles.filter((a) => a.isPublished),
    [articles]
  );
  const draftArticles = useMemo(
    () => articles.filter((a) => !a.isPublished),
    [articles]
  );

  // Average completion rate across all members
  const { avgCompletion, completedMembersCount, notStartedMembers } =
    useMemo(() => {
      if (allUsers.length === 0 || publishedArticles.length === 0) {
        return {
          avgCompletion: 0,
          completedMembersCount: 0,
          notStartedMembers: [] as typeof allUsers,
        };
      }
      const pubIds = new Set(publishedArticles.map((a) => a.id));
      let totalPct = 0;
      let fullDone = 0;
      const notStarted: typeof allUsers = [];

      for (const u of allUsers) {
        const uProg = allProgress.filter(
          (p) => p.userId === u.uid && pubIds.has(p.articleId)
        );
        const doneCount = uProg.filter((p) => p.isCompleted).length;
        const pct = Math.round((doneCount / publishedArticles.length) * 100);
        totalPct += pct;
        if (doneCount >= publishedArticles.length) fullDone++;
        if (uProg.length === 0) notStarted.push(u);
      }

      return {
        avgCompletion: Math.round(totalPct / allUsers.length),
        completedMembersCount: fullDone,
        notStartedMembers: notStarted,
      };
    }, [allUsers, allProgress, publishedArticles]);

  const quizPassRate = useMemo(() => {
    if (quizAttempts.length === 0) return 100;
    const passed = quizAttempts.filter((a) => a.isPassed).length;
    return Math.round((passed / quizAttempts.length) * 100);
  }, [quizAttempts]);

  const failedAttempts = useMemo(
    () => quizAttempts.filter((a) => !a.isPassed),
    [quizAttempts]
  );

  const recentArticles = useMemo(
    () =>
      [...articles]
        .sort(
          (a, b) =>
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime()
        )
        .slice(0, 5),
    [articles]
  );

  const recentAttempts = useMemo(
    () =>
      [...quizAttempts]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        )
        .slice(0, 6),
    [quizAttempts]
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of allUsers) map.set(u.uid, u.fullName);
    return map;
  }, [allUsers]);

  const articleTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of articles) map.set(a.id, a.title);
    return map;
  }, [articles]);

  return (
    <AdminLayout breadcrumbs={[{ label: "Overview" }]}>
      <div className="space-y-8">
        <PageHeader
          title="Operations Overview"
          description="Track handbook documentation status, member reading progress, and triage action items."
          actions={
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="cursor-pointer"
              >
                <Link href="/studio/curriculum">
                  <FolderTree className="size-4 mr-1.5" />
                  <span>Curriculum</span>
                </Link>
              </Button>
              <Button asChild size="sm" className="cursor-pointer">
                <Link href="/studio/articles/new">
                  <Plus className="size-4 mr-1.5" />
                  <span>New Article</span>
                </Link>
              </Button>
            </div>
          }
        />

        {/* Typographic Stat Strip (No decorative icon circles) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-xl border border-border bg-card">
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Published Articles
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
              {publishedArticles.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {draftArticles.length > 0
                ? `${draftArticles.length} drafts in progress`
                : `Across ${categories.length} categories`}
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Active Members
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
              {allUsers.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {completedMembersCount} members fully completed (100%)
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Avg Completion Rate
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
              {avgCompletion}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Across {publishedArticles.length} official curriculum lessons
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium text-muted-foreground">
              Quiz Pass Rate
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
              {quizPassRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {quizAttempts.length} club-wide submissions
            </p>
          </div>
        </div>

        {/* Actionable Triage Section ("Items Requiring Attention") */}
        {(draftArticles.length > 0 ||
          notStartedMembers.length > 0 ||
          failedAttempts.length > 0) && (
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-primary shrink-0" />
              <h2 className="text-base font-semibold text-foreground">
                Items Requiring Attention
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {draftArticles.length} draft articles
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {draftArticles.length > 0
                      ? "Not yet published for members"
                      : "All articles published"}
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="xs"
                  className="shrink-0 cursor-pointer"
                >
                  <Link href="/studio/articles">Review</Link>
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {notStartedMembers.length} members not started
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Haven&apos;t finished introductory lesson
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="xs"
                  className="shrink-0 cursor-pointer"
                >
                  <Link href="/studio/members">View list</Link>
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {failedAttempts.length} failed quiz attempts
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    May need review on lesson material
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="xs"
                  className="shrink-0 cursor-pointer"
                >
                  <Link href="/studio/quizzes">View details</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Two-Column Activity & Content View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Recently Updated Articles */}
          <div className="lg:col-span-7 rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <h2 className="text-base font-semibold text-foreground">
                Recently Updated Articles
              </h2>
              <Link
                href="/studio/articles"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                <span>All articles</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-border">
              {recentArticles.map((art) => (
                <Link
                  key={art.id}
                  href={`/studio/articles/${art.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 shrink-0 overflow-hidden rounded border border-border">
                      <ArticleCover
                        coverImage={art.coverImage}
                        title={art.title}
                        showLabel={false}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {art.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {categoryMap.get(art.categoryId) || "Club Category"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs ${
                        art.isPublished
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          art.isPublished ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      <span>{art.isPublished ? "Published" : "Draft"}</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right Column (5 cols): Recent Quiz Submissions */}
          <div className="lg:col-span-5 rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <h2 className="text-base font-semibold text-foreground">
                Recent Quiz Submissions
              </h2>
              <Link
                href="/studio/quizzes"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-border">
              {recentAttempts.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No quiz submissions recorded yet.
                </p>
              ) : (
                recentAttempts.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {userMap.get(att.userId) || "Club Member"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {articleTitleMap.get(att.articleId) || att.articleId}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={`shrink-0 font-mono text-xs ${
                        att.isPassed
                          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                          : "border-destructive/30 text-destructive"
                      }`}
                    >
                      {att.scorePercent}% · {att.isPassed ? "Passed" : "Failed"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
