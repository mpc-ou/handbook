"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useHandbook } from "@/context/HandbookContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, formatDateTime } from "@/lib/date";
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  GraduationCap,
  Heart,
  HelpCircle,
  Mail,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";

export default function ProfilePage() {
  const { user, articles, categories, progressMap, quizAttempts, showToast } = useHandbook();
  const [activeTab, setActiveTab] = useState<"reading" | "quizzes" | "likes">("reading");

  // Category mapping
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categories]);

  // User reading progress statistics
  const userProgressList = useMemo(() => {
    if (!user) return [];
    return Object.values(progressMap);
  }, [user, progressMap]);

  const completedCount = useMemo(() => {
    return userProgressList.filter((p) => p.isCompleted).length;
  }, [userProgressList]);

  const totalPublishedArticles = useMemo(() => {
    return articles.filter((a) => a.isPublished).length;
  }, [articles]);

  const overallProgressPct = useMemo(() => {
    if (totalPublishedArticles === 0) return 0;
    return Math.round((completedCount / totalPublishedArticles) * 100);
  }, [completedCount, totalPublishedArticles]);

  // User's quiz attempts
  const myQuizAttempts = useMemo(() => {
    if (!user) return [];
    return quizAttempts.filter((att) => att.userId === user.uid);
  }, [user, quizAttempts]);

  const passedQuizzesCount = useMemo(() => {
    // Unique quizzes passed
    const passedQuizIds = new Set(
      myQuizAttempts.filter((a) => a.isPassed).map((a) => a.articleId || a.quizId)
    );
    return passedQuizIds.size;
  }, [myQuizAttempts]);

  const avgQuizScore = useMemo(() => {
    if (myQuizAttempts.length === 0) return 0;
    const sum = myQuizAttempts.reduce((acc, curr) => acc + (curr.scorePercent || 0), 0);
    return Math.round(sum / myQuizAttempts.length);
  }, [myQuizAttempts]);

  // Liked articles
  const likedArticles = useMemo(() => {
    if (!user) return [];
    return articles.filter((a) => a.likedUserIds?.includes(user.uid));
  }, [user, articles]);

  // Export User Transcript to CSV for Excel
  const exportUserTranscript = () => {
    if (!user) return;

    const headers = [
      "Full Name",
      "Email",
      "Department",
      "Lesson / Assessment Title",
      "Category",
      "Reading Status",
      "Quiz Score (%)",
      "Assessment Result",
      "Completion Date",
    ];

    const rows = articles
      .filter((a) => a.isPublished)
      .map((art) => {
        const prog = progressMap[art.id];
        const isDone = Boolean(prog?.isCompleted);
        const score = prog?.highestQuizScore ?? 0;
        const quizRequired = (art.passScorePercent || 0) > 0;
        let quizStatus = "Not Required";
        if (quizRequired) {
          quizStatus = score >= art.passScorePercent ? "Passed" : "Failed";
        }
        const completedDate = prog?.completedAt
          ? formatDate(prog.completedAt)
          : "Incomplete";

        return [
          `"${user.fullName}"`,
          `"${user.email}"`,
          `"${user.department || ""}"`,
          `"${art.title}"`,
          `"${categoryMap.get(art.categoryId) || "Category"}"`,
          isDone ? "Completed" : "In Progress",
          quizRequired ? score : "—",
          quizStatus,
          `"${completedDate}"`,
        ];
      });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Transcript_${user.fullName.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded personal learning transcript.", "success");
  };

  const initials = (user?.fullName || "MPC")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppShell hideLeftSidebar>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* User Profile Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2 border-primary/20 shadow-xs">
              {user?.avatarUrl && (
                <AvatarImage src={user.avatarUrl} alt={user.fullName} referrerPolicy="no-referrer" />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">
                  {user?.fullName || "MPC Member"}
                </h1>
                <Badge variant="outline" className="font-mono text-xs">
                  {user?.role || "MEMBER"}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                  <Mail className="size-3" />
                  <span>{user?.email || "member@mpclub.dev"}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3 text-primary" />
                  <span>{user?.department || "Academic Team"}</span>
                </span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportUserTranscript}
            className="gap-1.5 text-xs cursor-pointer shrink-0"
          >
            <Download className="size-3.5" />
            <span>Export Transcript (CSV)</span>
          </Button>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
              <span>Completed Lessons</span>
              <BookOpen className="size-3.5 text-primary" />
            </span>
            <p className="text-2xl font-bold text-foreground font-mono">
              {completedCount} / {totalPublishedArticles}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Lessons completed across roadmap
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
              <span>Overall Progress</span>
              <GraduationCap className="size-3.5 text-emerald-500" />
            </span>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {overallProgressPct}%
            </p>
            <Progress value={overallProgressPct} className="h-1.5 mt-1" />
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
              <span>Passed Assessments</span>
              <Award className="size-3.5 text-blue-500" />
            </span>
            <p className="text-2xl font-bold text-foreground font-mono">
              {passedQuizzesCount}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Met passing standards
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-1">
            <span className="text-xs text-muted-foreground font-medium flex items-center justify-between">
              <span>Average Quiz Score</span>
              <HelpCircle className="size-3.5 text-purple-500" />
            </span>
            <p className="text-2xl font-bold text-foreground font-mono">
              {avgQuizScore}%
            </p>
            <p className="text-[11px] text-muted-foreground">
              Across {myQuizAttempts.length} total attempts
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("reading")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "reading"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Lesson Progress ({completedCount}/{totalPublishedArticles})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("quizzes")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "quizzes"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Quiz History ({myQuizAttempts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("likes")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "likes"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Liked Articles ({likedArticles.length})
          </button>
        </div>

        {/* TAB 1: Reading Progress */}
        {activeTab === "reading" && (
          <div className="space-y-3">
            {articles
              .filter((a) => a.isPublished)
              .map((art) => {
                const prog = progressMap[art.id];
                const isDone = Boolean(prog?.isCompleted);
                const isScrolled = Boolean(prog?.hasScrolledBottom);
                const score = prog?.highestQuizScore ?? 0;
                const quizRequired = (art.passScorePercent || 0) > 0;
                const catName = categoryMap.get(art.categoryId) || "Category";

                return (
                  <div
                    key={art.id}
                    className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-primary/40 transition-colors shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-normal">
                          {catName}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          ~{art.readingTime} min read
                        </span>
                      </div>

                      <Link
                        href={`/docs/${art.slug}`}
                        className="font-medium text-foreground hover:text-primary transition-colors text-sm block leading-snug"
                      >
                        {art.title}
                      </Link>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {quizRequired ? (
                          <span className="font-mono">
                            Highest score:{" "}
                            <strong className="text-foreground">{score}%</strong> (Required: ≥
                            {art.passScorePercent}%)
                          </span>
                        ) : (
                          <span>Reading only required</span>
                        )}
                        {prog?.completedAt && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px]">
                              Completed:{" "}
                              {formatDate(prog.completedAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <Badge
                        variant={isDone ? "success" : "secondary"}
                        className="text-xs font-normal"
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 className="size-3 mr-1" />
                            <span>Completed</span>
                          </>
                        ) : isScrolled ? (
                          "Read (Pending quiz)"
                        ) : (
                          "In Progress"
                        )}
                      </Badge>

                      <Button asChild variant="outline" size="xs" className="cursor-pointer text-xs">
                        <Link href={`/docs/${art.slug}`}>
                          <span>Open Lesson</span>
                          <ExternalLink className="size-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* TAB 2: Quiz History */}
        {activeTab === "quizzes" && (
          <div className="space-y-3">
            {myQuizAttempts.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden bg-card shadow-2xs">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Assessment</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3 text-center">Result</th>
                      <th className="py-2.5 px-3 text-left">Submitted At</th>
                      <th className="py-2.5 px-3 text-left">Review / Feedback</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {myQuizAttempts.map((att) => (
                      <tr key={att.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground max-w-xs">
                          <p className="line-clamp-1">{att.articleTitle}</p>
                        </td>

                        <td className="py-2.5 px-3 text-center font-mono font-bold text-foreground">
                          {att.scorePercent}%
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

                        <td className="py-2.5 px-3 text-muted-foreground max-w-sm">
                          {att.feedback ? (
                            <span className="text-foreground">{att.feedback}</span>
                          ) : (
                            <span className="italic text-muted-foreground/60">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <Button asChild variant="outline" size="xs" className="cursor-pointer text-xs">
                            <Link href={`/docs/${att.articleId}`}>
                              <span>Retake</span>
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2 bg-card/40">
                <Award className="size-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">
                  You haven&apos;t taken any assessments yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Read through the handbook lessons and complete the assessment at the end of each lesson.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Liked Articles */}
        {activeTab === "likes" && (
          <div className="space-y-3">
            {likedArticles.length > 0 ? (
              likedArticles.map((art) => {
                const catName = categoryMap.get(art.categoryId) || "Category";
                return (
                  <div
                    key={art.id}
                    className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-primary/40 transition-colors shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-normal">
                          {catName}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          ~{art.readingTime} min read
                        </span>
                      </div>

                      <Link
                        href={`/docs/${art.slug}`}
                        className="font-medium text-foreground hover:text-primary transition-colors text-sm block leading-snug"
                      >
                        {art.title}
                      </Link>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-mono text-rose-600 dark:text-rose-400">
                          <Heart className="size-3 fill-rose-500 text-rose-500" />
                          <span>{art.likesCount || 1} likes</span>
                        </span>
                      </div>
                    </div>

                    <Button asChild variant="outline" size="xs" className="cursor-pointer text-xs shrink-0">
                      <Link href={`/docs/${art.slug}`}>
                        <span>Read Lesson</span>
                        <ExternalLink className="size-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2 bg-card/40">
                <Heart className="size-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">
                  You haven&apos;t liked any articles yet
                </p>
                <p className="text-xs text-muted-foreground">
                  When reading lessons, click the Like button to save them here for quick reference.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

