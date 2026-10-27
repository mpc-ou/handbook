"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { formatDateTime } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileEdit,
  GraduationCap,
  HelpCircle,
  RotateCcw,
  Search,
  Timer,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import type { QuizAttemptRecord } from "@/types";

export default function StudioQuizzesPage() {
  const { articles, allUsers, showToast, user } = useHandbook();

  const [activeTab, setActiveTab] = useState<"quizzes" | "submissions">("quizzes");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [quizFilter, setQuizFilter] = useState<string>("ALL");

  // Attempts fetched from PostgreSQL
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);

  // Selected attempt for grading modal
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttemptRecord | null>(null);
  const [gradingScore, setGradingScore] = useState<number>(0);
  const [gradingFeedback, setGradingFeedback] = useState<string>("");
  const [gradingLoading, setGradingLoading] = useState(false);
  const [deleteAttemptId, setDeleteAttemptId] = useState<string | null>(null);

  // Load attempts from API
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
      console.error("Failed to load quiz attempts:", err);
    } finally {
      setLoadingAttempts(false);
    }
  };

  useEffect(() => {
    loadAttempts();
  }, []);

  // Articles with quizzes
  const articlesWithQuizzes = useMemo(() => {
    return articles.filter((a) => (a.quizQuestions?.length || 0) > 0);
  }, [articles]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return attempts.filter((att) => {
      if (statusFilter === "PASSED" && !att.isPassed) return false;
      if (statusFilter === "FAILED" && att.isPassed) return false;
      if (quizFilter !== "ALL" && att.articleId !== quizFilter && att.quizId !== quizFilter) {
        return false;
      }
      if (q) {
        const matchUser = (att.userFullName || "").toLowerCase().includes(q);
        const matchEmail = (att.userEmail || "").toLowerCase().includes(q);
        const matchTitle = (att.articleTitle || "").toLowerCase().includes(q);
        return matchUser || matchEmail || matchTitle;
      }
      return true;
    });
  }, [attempts, searchQuery, statusFilter, quizFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalQuizzes = articlesWithQuizzes.length;
    const totalSubmissions = attempts.length;
    const passedSubmissions = attempts.filter((a) => a.isPassed).length;
    const passRate = totalSubmissions > 0 ? Math.round((passedSubmissions / totalSubmissions) * 100) : 0;
    const avgScore =
      totalSubmissions > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.scorePercent || 0), 0) / totalSubmissions)
        : 0;

    return {
      totalQuizzes,
      totalSubmissions,
      passRate,
      avgScore,
    };
  }, [articlesWithQuizzes, attempts]);

  // Open grading modal
  const openGradingModal = (attempt: QuizAttemptRecord) => {
    setSelectedAttempt(attempt);
    setGradingScore(attempt.scorePercent || 0);
    setGradingFeedback(attempt.feedback || "");
  };

  // Submit grading update
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
          gradedBy: user?.fullName || "Academic Team",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showToast("Saved score and feedback successfully.", "success");
          setSelectedAttempt(null);
          await loadAttempts();
        } else {
          showToast(data.error || "Failed to update grade.", "error");
        }
      }
    } catch {
      showToast("An error occurred while saving grade.", "error");
    } finally {
      setGradingLoading(false);
    }
  };

  // Delete submission with confirmation dialog
  const handleDeleteAttempt = (attemptId: string) => {
    setDeleteAttemptId(attemptId);
  };

  const executeDeleteAttempt = async () => {
    if (!deleteAttemptId) return;

    try {
      const res = await fetch(`/api/quiz/attempts?id=${deleteAttemptId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setAttempts((prev) => prev.filter((a) => a.id !== deleteAttemptId));
        if (selectedAttempt?.id === deleteAttemptId) {
          setSelectedAttempt(null);
        }
        showToast("Deleted submission successfully.", "success");
      } else {
        showToast(data.error || "Failed to delete submission.", "error");
      }
    } catch {
      showToast("Connection error while deleting submission.", "error");
    } finally {
      setDeleteAttemptId(null);
    }
  };

  // Export results to UTF-8 CSV with BOM for Microsoft Excel
  const exportToExcel = () => {
    if (filteredSubmissions.length === 0) {
      showToast("No submissions to export.", "error");
      return;
    }

    const headers = ["Full Name", "Email", "Department", "Lesson / Assessment", "Score (%)", "Result", "Submitted At", "Evaluator Feedback"];
    const rows = filteredSubmissions.map((att) => [
      `"${att.userFullName || "Member"}"`,
      `"${att.userEmail || ""}"`,
      `"${att.userDepartment || ""}"`,
      `"${att.articleTitle || "Assessment"}"`,
      att.scorePercent,
      att.isPassed ? "Passed" : "Failed",
      `"${formatDateTime(att.createdAt)}"`,
      `"${(att.feedback || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Quiz_Gradebook_MPC_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported gradebook successfully.", "success");
  };

  return (
    <AdminLayout breadcrumbs={[{ label: "Quizzes & Assessments" }]}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Quizzes & Assessments"
          description="Manage question banks, multiple-choice quizzes, essay/code assessments, and monitor club member submissions."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={attempts.length === 0}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Export Gradebook (CSV)</span>
            </Button>
          }
        />

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total Quizzes</span>
              <Award className="size-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">
              {stats.totalQuizzes}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Embedded within handbook lessons
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Total Submissions</span>
              <FileCheck2 className="size-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">
              {stats.totalSubmissions}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Submissions from members and contributors
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Passing Rate</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.passRate}%
            </p>
            <p className="text-[11px] text-muted-foreground">
              Submissions meeting passing score
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">Average Score</span>
              <GraduationCap className="size-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground font-mono">
              {stats.avgScore}%
            </p>
            <p className="text-[11px] text-muted-foreground">
              Club-wide average quiz performance
            </p>
          </div>
        </div>

        {/* Tabs Switcher: Quizzes | Member Submissions */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("quizzes")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "quizzes"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Quiz Questionnaires ({articlesWithQuizzes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("submissions")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "submissions"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Member Submissions ({attempts.length})
            </button>
          </div>

          {activeTab === "submissions" && (
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Results</SelectItem>
                  <SelectItem value="PASSED">Passed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={quizFilter} onValueChange={setQuizFilter}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="Filter by lesson" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Assessments</SelectItem>
                  {articlesWithQuizzes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* TAB 1: List of Quizzes */}
        {activeTab === "quizzes" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articlesWithQuizzes.map((art) => {
              const qCount = art.quizQuestions?.length || 0;
              const relatedAttempts = attempts.filter((att) => att.articleId === art.id);
              const passedCount = relatedAttempts.filter((att) => att.isPassed).length;

              return (
                <div
                  key={art.id}
                  className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-normal">
                        MPC Handbook
                      </Badge>
                      <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Required: ≥{art.passScorePercent}%
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                      {art.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>{qCount} questions</span>
                      <span>•</span>
                      <span>{relatedAttempts.length} submissions</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {passedCount} passed
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setQuizFilter(art.id);
                        setActiveTab("submissions");
                      }}
                      className="text-xs text-primary hover:text-primary cursor-pointer p-0 h-auto"
                    >
                      <Users className="size-3.5 mr-1" />
                      <span>View Submissions</span>
                    </Button>

                    <Button asChild variant="outline" size="xs" className="cursor-pointer text-xs">
                      <Link href={`/studio/articles/${art.id}?tab=quiz`}>
                        <FileEdit className="size-3 mr-1" />
                        <span>Edit Questions</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TAB 2: Member Submissions Table */
          <div className="space-y-3">
            {filteredSubmissions.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden bg-card shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Member</th>
                        <th className="py-2.5 px-3 text-left">Assessment</th>
                        <th className="py-2.5 px-3 text-center">Score</th>
                        <th className="py-2.5 px-3 text-center">Result</th>
                        <th className="py-2.5 px-3 text-left">Submitted At</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSubmissions.map((att) => (
                        <tr key={att.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <div>
                              <p className="font-semibold text-foreground">
                                {att.userFullName || "Member"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {att.userEmail || "—"}
                              </p>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 max-w-xs">
                            <p className="font-medium text-foreground line-clamp-1">
                              {att.articleTitle}
                            </p>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {att.scorePercent}%
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant={att.isPassed ? "success" : "destructive"}
                              className="text-[10px] h-4.5 px-1.5 font-normal"
                            >
                              {att.isPassed ? "Passed" : "Failed"}
                            </Badge>
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                            {formatDateTime(att.createdAt)}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => openGradingModal(att)}
                                className="cursor-pointer text-xs"
                              >
                                <Eye className="size-3 mr-1" />
                                <span>Review & Grade</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDeleteAttempt(att.id)}
                                className="text-muted-foreground hover:text-destructive cursor-pointer h-7 w-7"
                                title="Delete submission"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2 bg-card/40">
                <FileCheck2 className="size-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">
                  No matching submissions found
                </p>
                <p className="text-xs text-muted-foreground">
                  When members complete assessments in the handbook, their submissions will appear here automatically.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Submission Details and Grading */}
      <Dialog
        open={Boolean(selectedAttempt)}
        onOpenChange={(open) => !open && setSelectedAttempt(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {selectedAttempt && (() => {
            const currentArticle = articles.find(
              (a) => a.id === selectedAttempt.articleId
            );
            const userAnswers = selectedAttempt.answers || {};

            return (
              <div className="flex flex-col h-full overflow-hidden">
                <DialogHeader className="p-5 border-b border-border bg-card shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <DialogTitle className="text-base sm:text-lg font-bold">
                        Member Submission Details
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Member: <strong className="text-foreground">{selectedAttempt.userFullName}</strong> ({selectedAttempt.userEmail})
                      </DialogDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={selectedAttempt.isPassed ? "success" : "destructive"}
                        className="text-xs font-mono"
                      >
                        {selectedAttempt.scorePercent}%
                      </Badge>
                      {selectedAttempt.timeSpentSec != null && (
                        <Badge variant="outline" className="text-xs font-mono gap-1">
                          <Timer className="size-3 text-amber-500" />
                          <span>{selectedAttempt.timeSpentSec}s</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </DialogHeader>

                {/* Scrollable Body: Questions & User Answers + Score/Feedback Form */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  <div className="p-3 rounded-lg border border-border bg-muted/20 text-xs space-y-1">
                    <span className="text-muted-foreground block">Handbook Lesson:</span>
                    <span className="font-semibold text-foreground text-sm">
                      {selectedAttempt.articleTitle}
                    </span>
                  </div>

                  {/* Question & Answer Inspection */}
                  {currentArticle?.quizQuestions && currentArticle.quizQuestions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Submitted Responses ({currentArticle.quizQuestions.length} questions):
                      </h4>

                      <div className="space-y-3">
                        {currentArticle.quizQuestions.map((q, qIdx) => {
                          const ans = userAnswers[q.id] || [];

                          return (
                            <div
                              key={q.id}
                              className="p-3.5 rounded-xl border border-border bg-card space-y-2 text-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-foreground">
                                  Question {qIdx + 1}: {q.questionText}
                                </span>
                                <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                                  {q.type === "essay"
                                    ? "Essay"
                                    : q.type === "fill_blank"
                                    ? "Fill in blank"
                                    : q.type === "scale"
                                    ? "Rating scale"
                                    : q.type === "file_upload"
                                    ? "File upload"
                                    : "Choice"}
                                </Badge>
                              </div>

                              {/* Member's Submitted Content */}
                              <div className="pt-1">
                                {q.type === "essay" ? (
                                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                                    {ans[0] || "(No response provided)"}
                                  </div>
                                ) : q.type === "fill_blank" ? (
                                  <div className="p-2 rounded bg-muted/40 border border-border font-mono text-foreground font-medium">
                                    Submitted: &ldquo;{ans[0] || "(Blank)"}&rdquo;
                                    {q.correctTextAnswer && (
                                      <span className="text-muted-foreground font-normal text-[11px] block mt-1">
                                        Expected answer: {q.correctTextAnswer}
                                      </span>
                                    )}
                                  </div>
                                ) : q.type === "scale" ? (
                                  <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold font-mono">
                                    Rating score: {ans[0] || "—"}/{q.scaleMax || 5}
                                  </div>
                                ) : q.type === "file_upload" ? (
                                  <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2">
                                    <div className="truncate">
                                      <span className="font-semibold text-foreground truncate block">
                                        {ans[1] || "Uploaded File"}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground truncate block">
                                        {ans[0] || "No file URL"}
                                      </span>
                                    </div>
                                    {ans[0] && (
                                      <Button asChild size="xs" variant="outline" className="shrink-0 gap-1 text-xs">
                                        <a href={ans[0]} target="_blank" rel="noreferrer">
                                          <ExternalLink className="size-3" />
                                          <span>Open File</span>
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  /* Single or Multiple Options */
                                  <div className="space-y-1">
                                    {(q.options || []).map((opt) => {
                                      const isPicked = ans.includes(opt.id);
                                      const isCorrect = (q.correctOptionIds || []).includes(opt.id);

                                      return (
                                        <div
                                          key={opt.id}
                                          className={cn(
                                            "flex items-center gap-2 p-1.5 rounded text-xs",
                                            isPicked && isCorrect
                                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                                              : isPicked && !isCorrect
                                              ? "bg-red-500/10 text-red-700 dark:text-red-400 font-medium"
                                              : isCorrect
                                              ? "text-emerald-600 font-medium"
                                              : "text-muted-foreground"
                                          )}
                                        >
                                          <span>{isPicked ? "●" : "○"}</span>
                                          <span>{opt.text}</span>
                                          {isPicked && (
                                            <Badge variant="outline" className="text-[9px] py-0 px-1 ml-auto">
                                              Selected
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

                  {/* Score Adjustment & Feedback Form */}
                  <div className="pt-2 border-t border-border space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Grading & Evaluator Feedback:
                    </h4>

                    {/* Score Input */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Assessment Score (%)
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={gradingScore}
                          onChange={(e) =>
                            setGradingScore(
                              Math.max(0, Math.min(100, Number(e.target.value)))
                            )
                          }
                          className="font-mono text-sm w-28 h-8"
                        />
                        <Badge
                          variant={gradingScore >= (currentArticle?.passScorePercent || 80) ? "success" : "destructive"}
                          className="text-xs font-normal"
                        >
                          {gradingScore >= (currentArticle?.passScorePercent || 80)
                            ? `Passed standard (≥${currentArticle?.passScorePercent || 80}%)`
                            : "Failed standard"}
                        </Badge>
                      </div>
                    </div>

                    {/* Feedback Textarea */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Evaluator Notes & Feedback:
                      </label>
                      <Textarea
                        value={gradingFeedback}
                        onChange={(e) => setGradingFeedback(e.target.value)}
                        placeholder="Provide constructive feedback on essay solutions, code submissions, or suggestions for improvement..."
                        rows={3}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <DialogFooter className="p-4 border-t border-border bg-card shrink-0 flex flex-row items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAttempt(selectedAttempt.id)}
                    className="text-destructive hover:bg-destructive/10 cursor-pointer text-xs gap-1.5"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete Submission</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAttempt(null)}
                      disabled={gradingLoading}
                      className="cursor-pointer text-xs"
                    >
                      Close
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveGrade}
                      disabled={gradingLoading}
                      className="cursor-pointer text-xs font-semibold"
                    >
                      {gradingLoading ? "Saving..." : "Save Grade & Feedback"}
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Quiz Attempt Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteAttemptId)}
        onOpenChange={(open) => !open && setDeleteAttemptId(null)}
        title="Confirm Delete Submission"
        description="Are you sure you want to delete this submission? After deletion, the member can retake the quiz and their progress score will be recalculated."
        confirmLabel="Delete Submission"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={executeDeleteAttempt}
      />
    </AdminLayout>
  );
}
