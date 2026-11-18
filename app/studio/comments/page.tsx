"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ExternalLink, Loader2, MessageSquare, Search, Trash2, X } from "lucide-react";
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, apiRequest } from "@/lib/api-client";
import { canUserManageCourse } from "@/lib/progression";
import type { Role } from "@/types";

const PAGE_SIZE = 30;
const ALL_COURSES = "ALL";

interface ModerationComment {
  id: string;
  content: string;
  isReply: boolean;
  replyCount: number;
  createdAt: string;
  author: { id: string; fullName: string; email: string; avatarUrl: string | null; role: Role };
  item: { id: string; title: string };
  lesson: { title: string };
  course: { id: string; title: string };
  href: string;
}

interface ManageResponse {
  total: number;
  comments: ModerationComment[];
}

/** Chuỗi truy vấn cho /api/comments/manage. */
function buildQuery(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  return sp.toString();
}

export default function StudioCommentsPage() {
  const { user, courses, allUsers, dataLoading, showToast } = useHandbook();
  const t = useTranslations("studioModeration.comments");
  const tc = useTranslations("common");
  const format = useFormatter();
  const reduce = useReducedMotion();

  const [courseId, setCourseId] = useState(ALL_COURSES);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [author, setAuthor] = useState<{ id: string; name: string } | null>(null);

  const [comments, setComments] = useState<ModerationComment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ModerationComment | "bulk" | null>(null);

  const hasAccess = !user || user.role !== "MEMBER";

  // ADMIN thấy mọi khóa; EDITOR chỉ các khóa được giao
  const selectableCourses = useMemo(
    () => courses.filter((c) => canUserManageCourse(user, c.id)),
    [courses, user]
  );

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const nameById = useMemo(() => new Map(allUsers.map((u) => [u.uid, u.fullName])), [allUsers]);
  /** `<@userId>` → `@Tên` */
  const renderContent = useCallback(
    (raw: string) => raw.replace(/<@([\w-]+)>/g, (_m, id: string) => `@${nameById.get(id) ?? "…"}`),
    [nameById]
  );

  const filterKey = `${courseId}|${debouncedSearch}|${author?.id ?? ""}`;

  const load = useCallback(
    async (offset: number) => {
      const query = buildQuery({
        courseId: courseId === ALL_COURSES ? undefined : courseId,
        q: debouncedSearch || undefined,
        userId: author?.id,
        limit: PAGE_SIZE,
        offset,
      });
      return apiRequest<ManageResponse>(`/api/comments/manage?${query}`);
    },
    [courseId, debouncedSearch, author?.id]
  );

  // Đổi bộ lọc → tải lại từ đầu
  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;
    setLoading(true);
    load(0)
      .then((res) => {
        if (cancelled) return;
        setComments(res.comments);
        setTotal(res.total);
        setSelected(new Set());
      })
      .catch((e) => !cancelled && showToast(e instanceof Error ? e.message : t("toast.loadFailed"), "error"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, hasAccess]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await load(comments.length);
      setComments((prev) => [...prev, ...res.comments.filter((c) => !prev.some((p) => p.id === c.id))]);
      setTotal(res.total);
    } catch (e) {
      showToast(e instanceof Error ? e.message : t("toast.loadFailed"), "error");
    } finally {
      setLoadingMore(false);
    }
  };

  const removeFromList = (ids: string[]) => {
    const gone = new Set(ids);
    setComments((prev) => prev.filter((c) => !gone.has(c.id)));
    setTotal((prev) => Math.max(0, prev - ids.length));
    setSelected((prev) => new Set([...prev].filter((id) => !gone.has(id))));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const ids = deleteTarget === "bulk" ? [...selected] : [deleteTarget.id];
    const done: string[] = [];
    let failed = 0;
    for (const id of ids) {
      try {
        await apiRequest(`/api/comments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        done.push(id);
      } catch (e) {
        failed++;
        if (ids.length === 1) showToast(e instanceof ApiError || e instanceof Error ? e.message : t("toast.deleteFailed"), "error");
      }
    }
    if (done.length) {
      removeFromList(done);
      showToast(t("toast.deleted"), "success");
      // Bình luận bị xóa kéo theo các trả lời: tải lại để số liệu khớp
      load(0).then((res) => {
        setComments(res.comments);
        setTotal(res.total);
      }).catch(() => {});
    }
    if (failed > 1) showToast(t("toast.deleteFailed"), "error");
    setDeleteTarget(null);
  };

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const resetFilters = () => {
    setCourseId(ALL_COURSES);
    setSearch("");
    setAuthor(null);
  };

  if (!hasAccess) {
    return (
      <AdminLayout breadcrumbs={[{ label: t("breadcrumb") }]}>
        <div className="mx-auto max-w-md py-20 text-center space-y-2">
          <h2 className="text-lg font-semibold">{t("noAccess.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("noAccess.description")}</p>
        </div>
      </AdminLayout>
    );
  }

  const allSelected = comments.length > 0 && comments.every((c) => selected.has(c.id));
  const filtered = courseId !== ALL_COURSES || debouncedSearch !== "" || author !== null;
  const deleteName = deleteTarget && deleteTarget !== "bulk" ? deleteTarget.author.fullName : "";

  return (
    <AdminLayout breadcrumbs={[{ label: t("breadcrumb") }]}>
      <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={<Badge variant="secondary">{t("totalBadge", { count: total })}</Badge>}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="sm:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_COURSES}>{t("filters.allCourses")}</SelectItem>
              {selectableCourses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("filters.searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </div>

        {(author || selected.size > 0) && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {author && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {t("filters.authorChip", { name: author.name })}
                <button
                  type="button"
                  onClick={() => setAuthor(null)}
                  aria-label={t("filters.clearAuthor")}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {selected.size > 0 && (
              <>
                <span className="text-muted-foreground">{t("filters.selectedCount", { count: selected.size })}</span>
                <Button size="sm" variant="destructive" onClick={() => setDeleteTarget("bulk")}>
                  <Trash2 className="size-3.5" />
                  {t("filters.deleteSelected", { count: selected.size })}
                </Button>
              </>
            )}
          </div>
        )}

        {loading || dataLoading ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <MessageSquare className="size-8 text-muted-foreground" />
            <h3 className="font-semibold">{t("empty.title")}</h3>
            <p className="text-sm text-muted-foreground">{t("empty.description")}</p>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                {t("empty.resetFilters")}
              </Button>
            )}
          </div>
        ) : (
          <>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => setSelected(v ? new Set(comments.map((c) => c.id)) : new Set())}
              />
              {t("filters.selectAll", { count: comments.length })}
            </label>

            <ul className="divide-y divide-border rounded-xl border">
              <AnimatePresence initial={false}>
                {comments.map((c) => {
                  const isOpen = expanded.has(c.id);
                  const name = c.author.fullName || t("row.unknownUser");
                  return (
                    <motion.li
                      key={c.id}
                      layout={!reduce}
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, height: 0 }}
                      className="flex gap-3 p-4"
                    >
                      <Checkbox
                        className="mt-1"
                        checked={selected.has(c.id)}
                        onCheckedChange={() => setSelected((prev) => toggle(prev, c.id))}
                        aria-label={t("row.selectAria", { name })}
                      />
                      <button
                        type="button"
                        onClick={() => setAuthor({ id: c.author.id, name })}
                        title={t("row.filterByAuthorTitle", { name })}
                        className="h-fit shrink-0"
                      >
                        <Avatar className="size-9">
                          <AvatarImage src={c.author.avatarUrl ?? undefined} alt="" />
                          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </button>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                          <span className="font-medium">{name}</span>
                          {c.author.role !== "MEMBER" && (
                            <Badge variant="outline" className="text-[10px]">
                              {c.author.role}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format.relativeTime(new Date(c.createdAt))}
                          </span>
                          {c.isReply && <Badge variant="secondary">{t("row.replyBadge")}</Badge>}
                          {c.replyCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {t("row.repliesCount", { count: c.replyCount })}
                            </span>
                          )}
                        </div>

                        <p className={`whitespace-pre-wrap break-words text-sm ${isOpen ? "" : "line-clamp-3"}`}>
                          {renderContent(c.content)}
                        </p>
                        {c.content.length > 180 && (
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => setExpanded((prev) => toggle(prev, c.id))}
                          >
                            {isOpen ? t("row.showLess") : t("row.showMore")}
                          </button>
                        )}

                        <p className="truncate text-xs text-muted-foreground">
                          {c.course.title} › {c.lesson.title} › {c.item.title}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-start gap-1">
                        <Button asChild variant="ghost" size="icon" title={t("row.viewInItem")}>
                          <a href={c.href} target="_blank" rel="noreferrer" aria-label={t("row.viewInItem")}>
                            <ExternalLink className="size-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(c)}
                          aria-label={t("row.deleteAria")}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>

            {comments.length < total && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t("loadingMore")}
                    </>
                  ) : (
                    t("loadMore", { shown: comments.length, total })
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget === "bulk" ? t("deleteConfirm.bulkTitle", { count: selected.size }) : t("deleteConfirm.singleTitle")}
        description={
          deleteTarget === "bulk"
            ? t("deleteConfirm.bulkDescription")
            : t("deleteConfirm.singleDescription", { name: deleteName })
        }
        confirmLabel={t("deleteConfirm.confirm")}
        cancelLabel={tc("actions.cancel")}
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </AdminLayout>
  );
}
