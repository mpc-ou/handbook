"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { CountUp } from "@/components/ui/animated-progress";
import { hasQuiz } from "@/lib/quiz-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  FileEdit,
  HelpCircle,
  Loader2,
  Search,
  ShieldAlert,
  Timer,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type {
  CourseRecord,
  ItemRecord,
  LessonRecord,
  QuizAttemptRecord,
  QuizQuestionType,
} from "@/types";

export default function StudioQuizzesPage() {
  const { items, lessons, courses, user, dataLoading, showToast } =
    useHandbook();
  const format = useFormatter();
  const t = useTranslations("studioItems.quizzes");
  const tc = useTranslations("common");

  // Mặc định mở danh sách bài làm để ưu tiên chấm bài
  const [activeTab, setActiveTab] = useState<"submissions" | "assessments">(
    "submissions"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [quizFilter, setQuizFilter] = useState<string>("ALL");

  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  // Bài làm đang chọn để chấm tại chỗ ở panel bên phải
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(
    null
  );
  const [gradingScore, setGradingScore] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState<string>("");
  const [gradingLoading, setGradingLoading] = useState(false);
  const [deleteAttemptId, setDeleteAttemptId] = useState<string | null>(null);

  const fmtDateTime = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format.dateTime(d, { dateStyle: "short", timeStyle: "short" });
  };

  const itemMap = useMemo(() => {
    const map = new Map<string, ItemRecord>();
    for (const i of items) {
      map.set(i.id, i);
    }
    return map;
  }, [items]);

  const lessonMap = useMemo(() => {
    const map = new Map<string, LessonRecord>();
    for (const l of lessons) {
      map.set(l.id, l);
    }
    return map;
  }, [lessons]);

  const courseMap = useMemo(() => {
    const map = new Map<string, CourseRecord>();
    for (const c of courses) {
      map.set(c.id, c);
    }
    return map;
  }, [courses]);

  const getItemReaderHref = (itemId: string): string | null => {
    const item = itemMap.get(itemId);
    if (!item) return null;
    const lesson = lessonMap.get(item.lessonId);
    if (!lesson) return null;
    const course = courseMap.get(lesson.courseId);
    if (!course) return null;
    return `/learn/${course.slug}/${lesson.slug}/${item.slug}`;
  };

  const getItemCourseLessonLabel = (itemId: string): string => {
    const item = itemMap.get(itemId);
    if (!item) return "";
    const lesson = lessonMap.get(item.lessonId);
    if (!lesson) return "";
    const course = courseMap.get(lesson.courseId);
    if (!course) return lesson.title;
    return `${course.title} › ${lesson.title}`;
  };

  const loadAttempts = async () => {
    setLoadingAttempts(true);
    try {
      const res = await fetch("/api/quiz/attempts");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.attempts)) {
          setAttempts(data.attempts);
        }
      }
    } catch (err) {
      console.error("Failed to load attempts:", err);
    } finally {
      setLoadingAttempts(false);
    }
  };

  useEffect(() => {
    loadAttempts();
  }, []);

  // Chỉ các mục thuộc loại QUIZ hoặc ASSIGNMENT
  const assessmentItems = useMemo(() => {
    return items.filter((i) => hasQuiz(i.type));
  }, [items]);

  // Danh sách bài chờ chấm (ưu tiên ở đầu)
  const pendingAttempts = useMemo(() => {
    return attempts.filter((att) => att.status === "PENDING_REVIEW");
  }, [attempts]);

  const selectedAttempt = useMemo(
    () => attempts.find((a) => a.id === selectedAttemptId) || null,
    [attempts, selectedAttemptId]
  );

  // Tự động chọn bài chờ chấm đầu tiên khi tải xong
  useEffect(() => {
    if (!selectedAttemptId && pendingAttempts.length > 0) {
      const first = pendingAttempts[0];
      setSelectedAttemptId(first.id);
      setGradingScore(first.scorePercent || 0);
      setGradingFeedback(first.feedback || "");
    }
  }, [pendingAttempts, selectedAttemptId]);

  const selectAttemptForGrading = (attempt: QuizAttemptRecord) => {
    setSelectedAttemptId(attempt.id);
    setGradingScore(attempt.scorePercent || 0);
    setGradingFeedback(attempt.feedback || "");
  };

  // Lọc danh sách bài nộp; luôn xếp PENDING_REVIEW lên trước
  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = attempts.filter((att) => {
      if (statusFilter === "PENDING_REVIEW" && att.status !== "PENDING_REVIEW")
        return false;
      if (
        statusFilter === "PASSED" &&
        (att.status === "PENDING_REVIEW" || !att.isPassed)
      )
        return false;
      if (
        statusFilter === "FAILED" &&
        (att.status === "PENDING_REVIEW" || att.isPassed)
      )
        return false;
      if (
        quizFilter !== "ALL" &&
        att.itemId !== quizFilter &&
        att.quizId !== quizFilter
      ) {
        return false;
      }
      if (q) {
        const resolvedTitle =
          att.itemTitle || itemMap.get(att.itemId)?.title || "";
        const matchUser = (att.userFullName || "").toLowerCase().includes(q);
        const matchEmail = (att.userEmail || "").toLowerCase().includes(q);
        const matchTitle = resolvedTitle.toLowerCase().includes(q);
        return matchUser || matchEmail || matchTitle;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const aPending = a.status === "PENDING_REVIEW" ? 0 : 1;
      const bPending = b.status === "PENDING_REVIEW" ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }, [attempts, searchQuery, statusFilter, quizFilter, itemMap]);

  const stats = useMemo(() => {
    const pendingCount = pendingAttempts.length;
    const totalSubmissions = attempts.length;
    const gradedAttempts = attempts.filter(
      (a) => a.status !== "PENDING_REVIEW"
    );
    const passedSubmissions = gradedAttempts.filter((a) => a.isPassed).length;
    const passRate =
      gradedAttempts.length > 0
        ? Math.round((passedSubmissions / gradedAttempts.length) * 100)
        : 0;
    const avgScore =
      gradedAttempts.length > 0
        ? Math.round(
            gradedAttempts.reduce((sum, a) => sum + (a.scorePercent || 0), 0) /
              gradedAttempts.length
          )
        : 0;

    return {
      pendingCount,
      totalSubmissions,
      passRate,
      avgScore,
    };
  }, [pendingAttempts, attempts]);

  // Chấm điểm qua PUT /api/quiz/attempts (chỉ gửi attemptId, scorePercent, feedback)
  const handleSaveGrade = async () => {
    if (!selectedAttempt) return;
    setGradingLoading(true);
    try {
      const res = await fetch("/api/quiz/attempts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: selectedAttempt.id,
          scorePercent: gradingScore,
          feedback: gradingFeedback,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showToast(t("toast.gradeSaved"), "success");
          await loadAttempts();
        } else {
          showToast(data.error || t("toast.gradeFailed"), "error");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || t("toast.gradeFailed"), "error");
      }
    } catch {
      showToast(t("toast.gradeFailed"), "error");
    } finally {
      setGradingLoading(false);
    }
  };

  const executeDeleteAttempt = async () => {
    if (!deleteAttemptId) return;

    try {
      const res = await fetch(
        `/api/quiz/attempts?id=${encodeURIComponent(deleteAttemptId)}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json();
      if (data.success) {
        setAttempts((prev) => prev.filter((a) => a.id !== deleteAttemptId));
        if (selectedAttemptId === deleteAttemptId) {
          setSelectedAttemptId(null);
        }
        showToast(t("toast.deleteSuccess"), "success");
      } else {
        showToast(data.error || t("toast.deleteFailed"), "error");
      }
    } catch {
      showToast(t("toast.deleteFailed"), "error");
    } finally {
      setDeleteAttemptId(null);
    }
  };

  const exportToExcel = () => {
    if (filteredSubmissions.length === 0) {
      showToast(t("toast.noDataExport"), "error");
      return;
    }

    const headers = [
      t("csv.headers.fullName"),
      t("csv.headers.email"),
      t("csv.headers.department"),
      t("csv.headers.item"),
      t("csv.headers.score"),
      t("csv.headers.result"),
      t("csv.headers.submittedAt"),
      t("csv.headers.feedback"),
    ];
    const rows = filteredSubmissions.map((att) => {
      const itemTitle =
        att.itemTitle || itemMap.get(att.itemId)?.title || att.itemId;
      const resultText =
        att.status === "PENDING_REVIEW"
          ? t("table.pendingBadge")
          : att.isPassed
          ? t("table.passedBadge")
          : t("table.failedBadge");
      return [
        `"${att.userFullName || t("table.fallbackMember")}"`,
        `"${att.userEmail || ""}"`,
        `"${att.userDepartment || ""}"`,
        `"${itemTitle.replace(/"/g, '""')}"`,
        att.scorePercent,
        `"${resultText}"`,
        `"${fmtDateTime(att.createdAt)}"`,
        `"${(att.feedback || "").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MPC_Submissions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t("toast.exportSuccess"), "success");
  };

  const getQuestionTypeLabel = (qType?: QuizQuestionType) => {
    const key: QuizQuestionType = qType || "single";
    return t(`gradingPanel.questionTypes.${key}`);
  };

  if (user && user.role !== "ADMIN" && user.role !== "EDITOR") {
    return (
      <AdminLayout breadcrumbs={[{ label: t("breadcrumb") }]}>
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
          <ShieldAlert className="size-10 text-destructive/80" />
          <h2 className="text-lg font-bold text-foreground">
            {t("noAccess.title")}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("noAccess.description")}
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout breadcrumbs={[{ label: t("breadcrumb") }]}>
      <div className="space-y-6">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={attempts.length === 0}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>{t("exportCsv")}</span>
            </Button>
          }
        />

        {/* Thống kê gọn */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">
              {t("stats.pendingReview")}
            </span>
            <p
              className={cn(
                "text-2xl font-bold font-mono",
                stats.pendingCount > 0 ? "text-primary" : "text-foreground"
              )}
            >
              <CountUp value={stats.pendingCount} />
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">
              {t("stats.totalSubmissions")}
            </span>
            <p className="text-2xl font-bold text-foreground font-mono">
              <CountUp value={stats.totalSubmissions} />
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">
              {t("stats.passRate")}
            </span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              <CountUp value={stats.passRate} suffix="%" />
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <span className="text-xs text-muted-foreground">
              {t("stats.avgScore")}
            </span>
            <p className="text-2xl font-bold text-foreground font-mono">
              <CountUp value={stats.avgScore} suffix="%" />
            </p>
          </div>
        </div>

        {/* Chuyển chế độ: Bài nộp | Đề trắc nghiệm & bài tập */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("submissions")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                activeTab === "submissions"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {t("tabs.submissions", { count: attempts.length })}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("assessments")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                activeTab === "assessments"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {t("tabs.assessments", { count: assessmentItems.length })}
            </button>
          </div>
        </div>

        {activeTab === "submissions" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cột trái: Ưu tiên bài chờ chấm + Danh sách tất cả bài nộp */}
            <div className="lg:col-span-7 space-y-5">
              {/* Khu vực ưu tiên: Bài tập chờ chấm (PENDING_REVIEW) */}
              {pendingAttempts.length > 0 && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="size-4 text-primary" />
                        <span>
                          {t("pendingSection.title", {
                            count: pendingAttempts.length,
                          })}
                        </span>
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {t("pendingSection.subtitle")}
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
                    {pendingAttempts.map((att) => {
                      const item = itemMap.get(att.itemId);
                      const displayTitle =
                        att.itemTitle || item?.title || att.itemId;
                      const isSelected = selectedAttemptId === att.id;

                      return (
                        <div
                          key={att.id}
                          onClick={() => selectAttemptForGrading(att)}
                          className={cn(
                            "flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs cursor-pointer transition-colors",
                            isSelected
                              ? "bg-primary/10"
                              : "hover:bg-muted/40"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">
                              {att.userFullName || t("table.fallbackMember")}
                              <span className="font-normal text-muted-foreground">
                                {" · "}
                                {displayTitle}
                              </span>
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              {fmtDateTime(att.createdAt)}
                            </p>
                          </div>

                          <Button
                            type="button"
                            size="xs"
                            variant={isSelected ? "default" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAttemptForGrading(att);
                            }}
                            className="cursor-pointer shrink-0 text-xs"
                          >
                            {t("pendingSection.gradeNow")}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bộ lọc một dòng */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("filters.searchPlaceholder")}
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-36 text-xs cursor-pointer">
                    <SelectValue placeholder={t("filters.statusPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      {t("filters.statusAll")}
                    </SelectItem>
                    <SelectItem value="PENDING_REVIEW">
                      {t("filters.statusPending")}
                    </SelectItem>
                    <SelectItem value="PASSED">
                      {t("filters.statusPassed")}
                    </SelectItem>
                    <SelectItem value="FAILED">
                      {t("filters.statusFailed")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={quizFilter} onValueChange={setQuizFilter}>
                  <SelectTrigger className="h-8 w-48 text-xs cursor-pointer">
                    <SelectValue placeholder={t("filters.itemPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("filters.itemAll")}</SelectItem>
                    {assessmentItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bảng bài nộp */}
              {loadingAttempts ? (
                <div className="rounded-xl border border-border p-12 text-center bg-card/40">
                  <Loader2 className="size-6 animate-spin mx-auto text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {tc("actions.loading")}
                  </p>
                </div>
              ) : filteredSubmissions.length > 0 ? (
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium">
                        <tr>
                          <th className="py-2.5 px-3 text-left">
                            {t("table.member")}
                          </th>
                          <th className="py-2.5 px-3 text-left">
                            {t("table.item")}
                          </th>
                          <th className="py-2.5 px-3 text-center">
                            {t("table.score")}
                          </th>
                          <th className="py-2.5 px-3 text-center">
                            {t("table.result")}
                          </th>
                          <th className="py-2.5 px-3 text-left">
                            {t("table.submittedAt")}
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            {t("table.actions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredSubmissions.map((att) => {
                          const item = itemMap.get(att.itemId);
                          const displayTitle =
                            att.itemTitle || item?.title || att.itemId;
                          const isSelected = selectedAttemptId === att.id;
                          const isPending = att.status === "PENDING_REVIEW";

                          return (
                            <tr
                              key={att.id}
                              onClick={() => selectAttemptForGrading(att)}
                              className={cn(
                                "transition-colors cursor-pointer",
                                isSelected
                                  ? "bg-primary/10"
                                  : "hover:bg-muted/30"
                              )}
                            >
                              <td className="py-2.5 px-3">
                                <p className="font-medium text-foreground">
                                  {att.userFullName ||
                                    t("table.fallbackMember")}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {att.userEmail || "—"}
                                </p>
                              </td>

                              <td className="py-2.5 px-3 max-w-[200px]">
                                <p className="font-medium text-foreground truncate">
                                  {displayTitle}
                                </p>
                              </td>

                              <td className="py-2.5 px-3 text-center font-mono font-semibold text-foreground">
                                {isPending ? "—" : `${att.scorePercent}%`}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                {isPending ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-normal"
                                  >
                                    {t("table.pendingBadge")}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant={
                                      att.isPassed ? "success" : "destructive"
                                    }
                                    className="text-[10px] font-normal"
                                  >
                                    {att.isPassed
                                      ? t("table.passedBadge")
                                      : t("table.failedBadge")}
                                  </Badge>
                                )}
                              </td>

                              <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                {fmtDateTime(att.createdAt)}
                              </td>

                              <td
                                className="py-2.5 px-3 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant={isSelected ? "default" : "ghost"}
                                    size="xs"
                                    onClick={() => selectAttemptForGrading(att)}
                                    className="cursor-pointer text-xs"
                                  >
                                    {t("table.inspectAndGrade")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setDeleteAttemptId(att.id)}
                                    className="text-muted-foreground hover:text-destructive cursor-pointer h-7 w-7"
                                    title={t("table.deleteAttempt")}
                                    aria-label={t("table.deleteAttempt")}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-1.5 bg-card/40">
                  <FileCheck2 className="size-7 mx-auto text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">
                    {t("emptySubmissions.title")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("emptySubmissions.description")}
                  </p>
                </div>
              )}
            </div>

            {/* Cột phải: Panel chấm điểm tại chỗ (không dùng modal chồng nhau) */}
            <div className="lg:col-span-5 lg:sticky lg:top-20">
              {selectedAttempt ? (
                (() => {
                  const currentItem = itemMap.get(selectedAttempt.itemId);
                  const readerHref = getItemReaderHref(selectedAttempt.itemId);
                  const userAnswers = selectedAttempt.answers || {};
                  const displayTitle =
                    selectedAttempt.itemTitle ||
                    currentItem?.title ||
                    selectedAttempt.itemId;
                  const passThreshold = currentItem?.passScorePercent || 80;
                  const meetsPass = gradingScore >= passThreshold;

                  return (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="p-4 border-b border-border flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground">
                            {t("gradingPanel.title")}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {t("gradingPanel.memberLabel")}{" "}
                            <strong className="text-foreground">
                              {selectedAttempt.userFullName ||
                                t("table.fallbackMember")}
                            </strong>{" "}
                            ({selectedAttempt.userEmail || "—"})
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {selectedAttempt.timeSpentSec != null && (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-mono gap-1"
                            >
                              <Timer className="size-3" />
                              <span>
                                {t("gradingPanel.timeSpent", {
                                  seconds: selectedAttempt.timeSpentSec,
                                })}
                              </span>
                            </Badge>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setSelectedAttemptId(null)}
                            className="h-7 w-7 cursor-pointer"
                            aria-label={tc("actions.close")}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="flex items-center justify-between gap-2 text-xs pb-3 border-b border-border">
                          <div className="min-w-0">
                            <span className="text-muted-foreground">
                              {t("gradingPanel.itemLabel")}{" "}
                            </span>
                            <span className="font-medium text-foreground">
                              {displayTitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              asChild
                              variant="ghost"
                              size="xs"
                              className="text-xs cursor-pointer"
                            >
                              <Link
                                href={`/studio/items/${selectedAttempt.itemId}`}
                              >
                                <FileEdit className="size-3 mr-1" />
                                <span>{t("gradingPanel.editItemLink")}</span>
                              </Link>
                            </Button>
                            {readerHref && (
                              <Button
                                asChild
                                variant="ghost"
                                size="xs"
                                className="text-xs cursor-pointer"
                              >
                                <Link href={readerHref} target="_blank">
                                  <ExternalLink className="size-3 mr-1" />
                                  <span>
                                    {t("gradingPanel.viewReaderLink")}
                                  </span>
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Danh sách câu trả lời */}
                        {currentItem?.quizQuestions &&
                          currentItem.quizQuestions.length > 0 && (
                            <div className="space-y-2.5">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t("gradingPanel.submittedAnswersHeading", {
                                  count: currentItem.quizQuestions.length,
                                })}
                              </h4>

                              <div className="space-y-2.5">
                                {currentItem.quizQuestions.map((q, qIdx) => {
                                  const rawAns = userAnswers[q.id];
                                  const ans: string[] = Array.isArray(rawAns)
                                    ? rawAns.map(String)
                                    : typeof rawAns === "string"
                                    ? [rawAns]
                                    : [];

                                  return (
                                    <div
                                      key={q.id}
                                      className="p-3 rounded-lg border border-border bg-muted/20 space-y-2 text-xs"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="font-medium text-foreground">
                                          {t("gradingPanel.questionNumber", {
                                            index: qIdx + 1,
                                            text: q.questionText,
                                          })}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] shrink-0 font-normal"
                                        >
                                          {getQuestionTypeLabel(q.type)}
                                        </Badge>
                                      </div>

                                      <div>
                                        {q.type === "essay" ? (
                                          <div className="p-2.5 rounded bg-background border border-border text-foreground whitespace-pre-wrap leading-relaxed">
                                            {ans[0] ||
                                              t("gradingPanel.noAnswer")}
                                          </div>
                                        ) : q.type === "code_submission" ? (
                                          <pre className="p-2.5 rounded bg-background border border-border font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap">
                                            {ans[0] ||
                                              t("gradingPanel.noAnswer")}
                                          </pre>
                                        ) : q.type === "fill_blank" ? (
                                          <div className="p-2 rounded bg-background border border-border font-mono text-foreground">
                                            {t("gradingPanel.filledAnswer", {
                                              answer:
                                                ans[0] ||
                                                t("gradingPanel.noAnswer"),
                                            })}
                                            {q.correctTextAnswer && (
                                              <span className="text-muted-foreground font-normal text-[11px] block mt-1">
                                                {t(
                                                  "gradingPanel.correctAnswerHint",
                                                  {
                                                    answer: q.correctTextAnswer,
                                                  }
                                                )}
                                              </span>
                                            )}
                                          </div>
                                        ) : q.type === "scale" ? (
                                          <div className="p-2 rounded bg-background border border-border font-mono">
                                            {t("gradingPanel.scaleValue", {
                                              value: ans[0] || "—",
                                              max: q.scaleMax || 5,
                                            })}
                                          </div>
                                        ) : q.type === "file_upload" ? (
                                          <div className="p-2.5 rounded bg-background border border-border flex items-center justify-between gap-2">
                                            <div className="truncate">
                                              <span className="font-medium text-foreground truncate block">
                                                {ans[1] ||
                                                  t(
                                                    "gradingPanel.attachedFile"
                                                  )}
                                              </span>
                                              <span className="text-[11px] text-muted-foreground truncate block">
                                                {ans[0] ||
                                                  t("gradingPanel.noFileUrl")}
                                              </span>
                                            </div>
                                            {ans[0] && (
                                              <Button
                                                asChild
                                                size="xs"
                                                variant="outline"
                                                className="shrink-0 gap-1 text-xs"
                                              >
                                                <a
                                                  href={ans[0]}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                >
                                                  <ExternalLink className="size-3" />
                                                  <span>
                                                    {t("gradingPanel.openFile")}
                                                  </span>
                                                </a>
                                              </Button>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="space-y-1">
                                            {(q.options || []).map((opt) => {
                                              const isPicked = ans.includes(
                                                opt.id
                                              );
                                              const isCorrect = (
                                                q.correctOptionIds || []
                                              ).includes(opt.id);

                                              return (
                                                <div
                                                  key={opt.id}
                                                  className={cn(
                                                    "flex items-center gap-2 p-1.5 rounded text-xs",
                                                    isPicked && isCorrect
                                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                                                      : isPicked && !isCorrect
                                                      ? "bg-destructive/10 text-destructive font-medium"
                                                      : isCorrect
                                                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                                      : "text-muted-foreground"
                                                  )}
                                                >
                                                  <span>
                                                    {isPicked ? "●" : "○"}
                                                  </span>
                                                  <span>{opt.text}</span>
                                                  {isPicked && (
                                                    <Badge
                                                      variant="outline"
                                                      className="text-[9px] py-0 px-1 ml-auto"
                                                    >
                                                      {t(
                                                        "gradingPanel.pickedBadge"
                                                      )}
                                                    </Badge>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        {/* Biểu mẫu chấm điểm & nhận xét tại chỗ */}
                        <div className="pt-3 border-t border-border space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t("gradingPanel.gradingHeading")}
                          </h4>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-foreground">
                              {t("gradingPanel.scoreLabel")}
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={gradingScore}
                                onChange={(e) =>
                                  setGradingScore(
                                    Math.max(
                                      0,
                                      Math.min(100, Number(e.target.value) || 0)
                                    )
                                  )
                                }
                                className="font-mono text-sm w-24 h-8"
                              />
                              <Badge
                                variant={meetsPass ? "success" : "destructive"}
                                className="text-xs font-normal"
                              >
                                {meetsPass
                                  ? t("gradingPanel.meetsThreshold", {
                                      pass: passThreshold,
                                    })
                                  : t("gradingPanel.belowThreshold", {
                                      pass: passThreshold,
                                    })}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-medium text-foreground">
                              {t("gradingPanel.feedbackLabel")}
                            </label>
                            <Textarea
                              value={gradingFeedback}
                              onChange={(e) =>
                                setGradingFeedback(e.target.value)
                              }
                              placeholder={
                                t("gradingPanel.feedbackPlaceholder")
                              }
                              rows={3}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDeleteAttemptId(selectedAttempt.id)
                          }
                          className="text-destructive hover:bg-destructive/10 cursor-pointer text-xs gap-1"
                        >
                          <Trash2 className="size-3.5" />
                          <span>{t("gradingPanel.deleteAttempt")}</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveGrade}
                          disabled={gradingLoading}
                          className="cursor-pointer text-xs font-medium"
                        >
                          {gradingLoading
                            ? t("gradingPanel.savingGrade")
                            : t("gradingPanel.saveGrade")}
                        </Button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground bg-card/40">
                  {t("gradingPanel.emptySelection")}
                </div>
              )}
            </div>
          </div>
        ) : /* Danh sách đề trắc nghiệm & bài tập */
        dataLoading ? (
          <div className="rounded-xl border border-border p-12 text-center bg-card/40">
            <Loader2 className="size-6 animate-spin mx-auto text-primary mb-2" />
            <p className="text-xs text-muted-foreground">
              {tc("actions.loading")}
            </p>
          </div>
        ) : assessmentItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessmentItems.map((item) => {
              const qCount = item.quizQuestions?.length || 0;
              const relatedAttempts = attempts.filter(
                (att) => att.itemId === item.id
              );
              const passedCount = relatedAttempts.filter(
                (att) => att.isPassed
              ).length;
              const readerHref = getItemReaderHref(item.id);
              const courseLessonLabel = getItemCourseLessonLabel(item.id);

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-border bg-card space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span
                        className="truncate max-w-[200px]"
                        title={courseLessonLabel}
                      >
                        {courseLessonLabel}
                      </span>
                      <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                        {t("assessmentsList.passThreshold", {
                          score: item.passScorePercent,
                        })}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>
                        {t("assessmentsList.questionCount", { count: qCount })}
                      </span>
                      <span>·</span>
                      <span>
                        {t("assessmentsList.submissionCount", {
                          count: relatedAttempts.length,
                        })}
                      </span>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {t("assessmentsList.passedCount", {
                          count: passedCount,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          setQuizFilter(item.id);
                          setActiveTab("submissions");
                        }}
                        className="text-xs text-primary hover:text-primary cursor-pointer p-0 h-auto"
                      >
                        <Users className="size-3.5 mr-1" />
                        <span>{t("assessmentsList.viewSubmissions")}</span>
                      </Button>

                      {readerHref && (
                        <Link
                          href={readerHref}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="size-3" />
                          <span>{t("assessmentsList.viewReader")}</span>
                        </Link>
                      )}
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      size="xs"
                      className="cursor-pointer text-xs"
                    >
                      <Link href={`/studio/items/${item.id}`}>
                        <FileEdit className="size-3 mr-1" />
                        <span>{t("assessmentsList.editQuestions")}</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2 bg-card/40">
            <HelpCircle className="size-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">
              {t("assessmentsList.emptyTitle")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("assessmentsList.emptyDescription")}
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteAttemptId)}
        onOpenChange={(open) => !open && setDeleteAttemptId(null)}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.description")}
        confirmLabel={t("deleteDialog.confirm")}
        cancelLabel={tc("actions.cancel")}
        variant="destructive"
        onConfirm={executeDeleteAttempt}
      />
    </AdminLayout>
  );
}
