"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { CountUp } from "@/components/ui/animated-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ItemType } from "@/types";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  FolderTree,
  HelpCircle,
  Loader2,
} from "lucide-react";

function getItemTypeIcon(type: ItemType) {
  switch (type) {
    case "QUIZ":
      return HelpCircle;
    case "ASSIGNMENT":
      return ClipboardCheck;
    default:
      return BookOpen;
  }
}

export default function StudioOverviewPage() {
  const t = useTranslations("studio");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  const {
    courses,
    lessons,
    items,
    categories,
    allUsers,
    quizAttempts,
    dataLoading,
    dbError,
  } = useHandbook();

  const publishedCourses = useMemo(
    () => courses.filter((c) => c.status === "PUBLISHED"),
    [courses]
  );

  const publishedLessons = useMemo(
    () => lessons.filter((l) => l.isPublished),
    [lessons]
  );

  const publishedItems = useMemo(
    () => items.filter((i) => i.status === "PUBLISHED"),
    [items]
  );
  const pendingItems = useMemo(
    () => items.filter((i) => i.status === "PENDING_REVIEW"),
    [items]
  );
  const draftItems = useMemo(
    () => items.filter((i) => i.status === "DRAFT"),
    [items]
  );

  const pendingAttempts = useMemo(
    () => quizAttempts.filter((a) => a.status === "PENDING_REVIEW"),
    [quizAttempts]
  );

  const totalPendingReview = pendingItems.length + pendingAttempts.length;

  const recentItems = useMemo(
    () =>
      [...items]
        .sort(
          (a, b) =>
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime()
        )
        .slice(0, 5),
    [items]
  );

  const courseMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses) map.set(c.id, c.title);
    return map;
  }, [courses]);

  const lessonMap = useMemo(() => {
    const map = new Map<string, { title: string; courseId: string }>();
    for (const l of lessons) {
      map.set(l.id, { title: l.title, courseId: l.courseId });
    }
    return map;
  }, [lessons]);

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of allUsers) map.set(u.uid, u.fullName);
    return map;
  }, [allUsers]);

  const itemTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) map.set(i.id, i.title);
    return map;
  }, [items]);

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return format.dateTime(d, { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <AdminLayout breadcrumbs={[{ label: t("nav.overview") }]}>
      <div className="space-y-8">
        <PageHeader
          title={t("dashboard.title")}
          description={t("dashboard.description")}
          actions={
            <Button asChild size="sm" className="cursor-pointer">
              <Link href="/studio/curriculum">
                <FolderTree className="size-4 mr-1.5" />
                <span>{t("dashboard.openCurriculum")}</span>
              </Link>
            </Button>
          }
        />

        {dbError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {dbError}
          </div>
        )}

        {dataLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card py-16 text-sm text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>{tCommon("actions.loading")}</span>
          </div>
        ) : (
          <>
            {/* 4 số chính dùng CountUp */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-lg border border-border bg-card">
              <div className="p-4 sm:p-5">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("dashboard.stats.courses")}
                </p>
                <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                  <CountUp value={courses.length} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.stats.coursesSub", {
                    published: publishedCourses.length,
                    categories: categories.length,
                  })}
                </p>
              </div>

              <div className="p-4 sm:p-5">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("dashboard.stats.lessons")}
                </p>
                <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                  <CountUp value={lessons.length} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.stats.lessonsSub", {
                    published: publishedLessons.length,
                    hidden: lessons.length - publishedLessons.length,
                  })}
                </p>
              </div>

              <div className="p-4 sm:p-5">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("dashboard.stats.items")}
                </p>
                <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                  <CountUp value={items.length} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.stats.itemsSub", {
                    published: publishedItems.length,
                    draft: draftItems.length,
                  })}
                </p>
              </div>

              <div className="p-4 sm:p-5">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("dashboard.stats.pendingReview")}
                </p>
                <p className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
                  <CountUp value={totalPendingReview} />
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("dashboard.stats.pendingReviewSub", {
                    items: pendingItems.length,
                    attempts: pendingAttempts.length,
                  })}
                </p>
              </div>
            </div>

            {/* Khối Cần xử lý (item PENDING_REVIEW, bài làm chờ chấm) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">
                  {t("dashboard.needsAction.title")}
                </h2>
              </div>

              {totalPendingReview === 0 ? (
                <div className="rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground text-center">
                  {t("dashboard.needsAction.empty")}
                </div>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
                  {pendingItems.map((item) => {
                    const lessonInfo = lessonMap.get(item.lessonId);
                    const courseTitle = lessonInfo
                      ? courseMap.get(lessonInfo.courseId) || ""
                      : "";
                    const lessonTitle = lessonInfo?.title || "";
                    const TypeIcon = getItemTypeIcon(item.type);

                    return (
                      <div
                        key={`item-${item.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <TypeIcon className="size-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">
                                {item.title}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-[11px] px-1.5 py-0 h-4 shrink-0 text-muted-foreground"
                              >
                                {tCommon("status.PENDING_REVIEW")}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {t("dashboard.needsAction.pendingItemMeta", {
                                course: courseTitle,
                                lesson: lessonTitle,
                                author: item.authorName,
                              })}
                            </p>
                          </div>
                        </div>

                        <Button
                          asChild
                          variant="outline"
                          size="xs"
                          className="shrink-0 cursor-pointer"
                        >
                          <Link href={`/studio/items/${item.id}`}>
                            {t("dashboard.needsAction.view")}
                          </Link>
                        </Button>
                      </div>
                    );
                  })}

                  {pendingAttempts.map((att) => {
                    const learnerName =
                      userMap.get(att.userId) ||
                      att.userFullName ||
                      att.userEmail ||
                      "";
                    const title =
                      itemTitleMap.get(att.itemId) ||
                      att.itemTitle ||
                      att.itemId;

                    return (
                      <div
                        key={`attempt-${att.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ClipboardCheck className="size-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">
                                {title}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-[11px] px-1.5 py-0 h-4 shrink-0 border-primary/30 text-primary"
                              >
                                {t("dashboard.needsAction.pendingAttemptBadge")}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {t("dashboard.needsAction.pendingAttemptMeta", {
                                learner: learnerName,
                                date: formatDate(att.createdAt),
                              })}
                            </p>
                          </div>
                        </div>

                        <Button
                          asChild
                          variant="outline"
                          size="xs"
                          className="shrink-0 cursor-pointer"
                        >
                          <Link href="/studio/quizzes">
                            {t("dashboard.needsAction.view")}
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Khối Chỉnh sửa gần đây (5 item cập nhật gần nhất) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">
                  {t("dashboard.recentEdits.title")}
                </h2>
                <Link
                  href="/studio/items"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <span>{t("dashboard.recentEdits.viewAll")}</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
                {recentItems.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("dashboard.recentEdits.empty")}
                  </p>
                ) : (
                  recentItems.map((item) => {
                    const lessonInfo = lessonMap.get(item.lessonId);
                    const courseTitle = lessonInfo
                      ? courseMap.get(lessonInfo.courseId) || ""
                      : "";
                    const lessonTitle = lessonInfo?.title || "";
                    const TypeIcon = getItemTypeIcon(item.type);

                    return (
                      <Link
                        key={item.id}
                        href={`/studio/items/${item.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <TypeIcon className="size-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">
                                {item.title}
                              </p>
                              {item.status !== "PUBLISHED" && (
                                <Badge
                                  variant="outline"
                                  className="text-[11px] px-1.5 py-0 h-4 shrink-0 text-muted-foreground"
                                >
                                  {tCommon(`status.${item.status}`)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {t("dashboard.recentEdits.itemMeta", {
                                course: courseTitle,
                                lesson: lessonTitle,
                              })}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {formatDate(item.updatedAt)}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
