"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { useHandbook } from "@/context/HandbookContext";
import { AppShell } from "@/components/layout/AppShell";
import {
  computeAchievements,
  computeStreak,
  toDayKey,
  type AchievementId,
} from "@/lib/gamification";
import {
  getCourseItemsInOrder,
  getCourseProgress,
} from "@/lib/progression";
import {
  CountUp,
  ProgressBar,
  ProgressRing,
} from "@/components/ui/animated-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  GraduationCap,
  KeyRound,
  Loader2,
  Sparkles,
  Trophy,
} from "lucide-react";

const ACHIEVEMENT_ICONS: Record<
  AchievementId,
  React.ComponentType<{ className?: string }>
> = {
  first_chapter: BookOpen,
  chapters_5: BookOpen,
  chapters_20: BookOpen,
  first_quiz_passed: CheckCircle2,
  perfect_score: Sparkles,
  first_course_complete: GraduationCap,
  streak_3: Flame,
  streak_7: Flame,
  streak_30: Trophy,
};

const HEATMAP_WEEKS = 12;
const HEATMAP_DAYS = HEATMAP_WEEKS * 7;

export default function ProfilePage() {
  const t = useTranslations("profile");
  const tRoles = useTranslations("nav.roles");
  const format = useFormatter();
  const reduceMotion = useReducedMotion();

  const {
    user,
    dataLoading,
    courses,
    lessons,
    items,
    progressMap,
    quizAttempts,
    ssoStatus,
    showToast,
  } = useHandbook();

  const isEmailLoginActive = ssoStatus?.emailLoginEnabled ?? true;

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast(t("account.errors.tooShort"), "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t("account.errors.mismatch"), "error");
      return;
    }
    if (!user?.noPassword && !currentPassword) {
      showToast(t("account.errors.currentRequired"), "error");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: user?.noPassword ? undefined : currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(t("account.success"), "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        if (user) {
          user.noPassword = false;
        }
      } else {
        showToast(data.error || t("account.errors.failed"), "error");
      }
    } catch {
      showToast(t("account.errors.serverError"), "error");
    } finally {
      setPasswordLoading(false);
    }
  };

  const progressList = useMemo(
    () => Object.values(progressMap),
    [progressMap]
  );

  const streak = useMemo(() => computeStreak(progressList), [progressList]);

  const activeDaySet = useMemo(
    () => new Set(streak.activeDays),
    [streak.activeDays]
  );

  // Build 12-week (84 days) grid ending today
  const heatmapWeeks = useMemo(() => {
    const today = new Date();
    const cells: Array<{ key: string; date: Date; active: boolean }> = [];
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = toDayKey(d);
      cells.push({ key, date: d, active: activeDaySet.has(key) });
    }
    const weeks: Array<Array<{ key: string; date: Date; active: boolean }>> =
      [];
    for (let w = 0; w < HEATMAP_WEEKS; w++) {
      weeks.push(cells.slice(w * 7, (w + 1) * 7));
    }
    return weeks;
  }, [activeDaySet]);

  const publishedCourses = useMemo(
    () =>
      courses
        .filter((c) => c.status === "PUBLISHED")
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [courses]
  );

  const courseMap = useMemo(
    () => new Map(courses.map((c) => [c.id, c])),
    [courses]
  );
  const lessonMap = useMemo(
    () => new Map(lessons.map((l) => [l.id, l])),
    [lessons]
  );
  const itemMap = useMemo(
    () => new Map(items.map((i) => [i.id, i])),
    [items]
  );

  const myQuizAttempts = useMemo(() => {
    if (!user) return [];
    return quizAttempts
      .filter((att) => att.userId === user.uid)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [user, quizAttempts]);

  const achievements = useMemo(
    () =>
      computeAchievements({
        progress: progressList,
        courses: publishedCourses,
        lessons,
        items,
        attempts: myQuizAttempts,
      }),
    [progressList, publishedCourses, lessons, items, myQuizAttempts]
  );

  const unlockedCount = useMemo(
    () => achievements.filter((a) => a.unlocked).length,
    [achievements]
  );

  const resolveItemContext = (itemId: string) => {
    const item = itemMap.get(itemId) || items.find((i) => i.slug === itemId);
    const lesson = item ? lessonMap.get(item.lessonId) : undefined;
    const course = lesson ? courseMap.get(lesson.courseId) : undefined;
    const href =
      course && lesson && item
        ? `/learn/${course.slug}/${lesson.slug}/${item.slug}`
        : course
        ? `/learn/${course.slug}`
        : "/";
    return { item, lesson, course, href };
  };

  if (!user && !dataLoading) {
    return (
      <AppShell hideLeftSidebar>
        <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">
            {t("guestPrompt.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("guestPrompt.description")}
          </p>
          <Button asChild size="sm">
            <Link href="/login">{t("guestPrompt.cta")}</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const initials = (user?.fullName || "MP")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(-2)
    .toUpperCase();

  return (
    <AppShell hideLeftSidebar>
      <div className="mx-auto max-w-4xl px-4 sm:px-8 py-8 space-y-6">
        {/* User Summary Header */}
        <div className="flex items-center gap-4">
          <Avatar className="size-14 border border-border">
            {user?.avatarUrl && (
              <AvatarImage
                src={user.avatarUrl}
                alt={user.fullName}
                referrerPolicy="no-referrer"
              />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 space-y-0.5">
            <h1 className="text-xl font-bold text-foreground truncate">
              {user?.fullName}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {user ? tRoles(user.role) : ""}
              {user?.department
                ? ` · ${user.department}`
                : ` · ${t("defaultDepartment")}`}
              {user?.email ? ` · ${user.email}` : ""}
            </p>
          </div>
        </div>

        {/* Main Profile Tabs */}
        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="w-full sm:w-fit justify-start overflow-x-auto">
            <TabsTrigger value="progress">{t("tabs.progress")}</TabsTrigger>
            <TabsTrigger value="achievements">
              {t("tabs.achievements")}
            </TabsTrigger>
            <TabsTrigger value="attempts">{t("tabs.attempts")}</TabsTrigger>
            <TabsTrigger value="account">{t("tabs.account")}</TabsTrigger>
          </TabsList>

          {/* TAB 1: Streak + Course Progress */}
          <TabsContent value="progress" className="space-y-6">
            {/* Streak & 12-Week Activity Heatmap */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg",
                        streak.activeToday
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Flame className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t("streak.current")}
                      </p>
                      <p className="text-lg font-bold text-foreground tabular-nums">
                        <CountUp value={streak.current} />
                      </p>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-border" />

                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t("streak.longest")}
                    </p>
                    <p className="text-lg font-bold text-foreground tabular-nums">
                      <CountUp value={streak.longest} />
                    </p>
                  </div>
                </div>

                <span className="text-xs text-muted-foreground">
                  {t("streak.heatmapLabel")}
                </span>
              </div>

              {/* 12-week heatmap grid */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {heatmapWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1.5">
                    {week.map((cell) => {
                      const formattedDate = format.dateTime(cell.date, {
                        dateStyle: "medium",
                      });
                      const label = cell.active
                        ? t("streak.activeDay", { date: formattedDate })
                        : t("streak.inactiveDay", { date: formattedDate });
                      return (
                        <Tooltip key={cell.key}>
                          <TooltipTrigger asChild>
                            <div
                              aria-label={label}
                              className={cn(
                                "size-3 rounded-[3px] transition-colors",
                                cell.active
                                  ? "bg-primary"
                                  : "bg-muted hover:bg-muted-foreground/20"
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent>{label}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Course Progress List */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                {t("courses.title")}
              </h2>

              {publishedCourses.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  {t("courses.empty")}
                </p>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                  {publishedCourses.map((course) => {
                    const prog = getCourseProgress(
                      course.id,
                      lessons,
                      items,
                      progressMap
                    );
                    const isDone = prog.total > 0 && prog.completed >= prog.total;
                    const orderedItems = getCourseItemsInOrder(
                      course.id,
                      lessons,
                      items
                    );
                    const nextIncomplete = orderedItems.find(
                      (i) => !progressMap[i.id]?.isCompleted
                    );
                    const nextLesson = nextIncomplete
                      ? lessonMap.get(nextIncomplete.lessonId)
                      : undefined;
                    const actionHref = isDone
                      ? `/learn/${course.slug}/certificate`
                      : nextIncomplete && nextLesson
                      ? `/learn/${course.slug}/${nextLesson.slug}/${nextIncomplete.slug}`
                      : `/learn/${course.slug}`;

                    return (
                      <div
                        key={course.id}
                        className="flex items-center justify-between gap-4 p-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <ProgressRing
                            value={prog.percent}
                            size={44}
                            strokeWidth={4}
                          />
                          <div className="min-w-0 space-y-0.5">
                            <Link
                              href={`/learn/${course.slug}`}
                              className="block text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
                            >
                              {course.title}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {t("courses.chaptersProgress", {
                                completed: prog.completed,
                                total: prog.total,
                              })}
                            </p>
                          </div>
                        </div>

                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-xs"
                        >
                          <Link href={actionHref}>
                            {isDone
                              ? t("courses.certificate")
                              : prog.completed > 0
                              ? t("courses.continue")
                              : t("courses.start")}
                          </Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: Achievements */}
          <TabsContent value="achievements" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {t("achievements.unlockedCount", {
                unlocked: unlockedCount,
                total: achievements.length,
              })}
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {achievements.map((ach, idx) => {
                const Icon = ACHIEVEMENT_ICONS[ach.id] || Award;
                const pct =
                  ach.target > 0
                    ? Math.round((ach.value / ach.target) * 100)
                    : 0;

                return (
                  <motion.div
                    key={ach.id}
                    initial={
                      reduceMotion || !ach.unlocked
                        ? false
                        : { opacity: 0, scale: 0.96 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: 0.2, delay: idx * 0.03 }
                    }
                    className={cn(
                      "flex flex-col justify-between gap-3 rounded-xl border p-4 transition-colors",
                      ach.unlocked
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-card opacity-75"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          ach.unlocked
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold text-foreground leading-snug">
                          {t(`achievements.${ach.id}.title`)}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {t(`achievements.${ach.id}.description`)}
                        </p>
                      </div>
                    </div>

                    {ach.unlocked ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" />
                        <span>{t("achievements.unlockedLabel")}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                          <span>
                            {ach.value}/{ach.target}
                          </span>
                          <span>{pct}%</span>
                        </div>
                        <ProgressBar
                          value={pct}
                          label={t(`achievements.${ach.id}.title`)}
                          heightClassName="h-1"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 3: Quiz & Assignment Attempts */}
          <TabsContent value="attempts">
            {myQuizAttempts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                {t("attempts.empty")}
              </p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                {myQuizAttempts.map((att) => {
                  const resolved = resolveItemContext(att.itemId);
                  const title =
                    att.itemTitle ||
                    resolved.item?.title ||
                    t("attempts.untitledItem");
                  const isPending = att.status === "PENDING_REVIEW";
                  const statusLabel = isPending
                    ? t("attempts.status.pendingReview")
                    : att.isPassed
                    ? t("attempts.status.passed")
                    : t("attempts.status.failed");

                  return (
                    <div
                      key={att.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <Link
                          href={resolved.href}
                          className="block text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                        >
                          {title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {resolved.course && resolved.lesson
                            ? `${resolved.course.title} › ${resolved.lesson.title} · `
                            : ""}
                          {format.dateTime(new Date(att.createdAt), {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {t("attempts.score", { score: att.scorePercent })}
                        </span>

                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            isPending
                              ? "bg-muted text-muted-foreground"
                              : att.isPassed
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-destructive/15 text-destructive"
                          )}
                        >
                          {statusLabel}
                        </span>

                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                        >
                          <Link href={resolved.href}>
                            {t("attempts.openItem")}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* TAB 4: Account & Password */}
          <TabsContent value="account" className="space-y-6">
            {/* Personal Info */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">
                {t("account.infoTitle")}
              </h2>

              <dl className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="space-y-1">
                  <dt className="text-muted-foreground">
                    {t("account.fullName")}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {user?.fullName}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">
                    {t("account.email")}
                  </dt>
                  <dd className="font-mono text-foreground">{user?.email}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">
                    {t("account.department")}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {user?.department || t("defaultDepartment")}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">{t("account.role")}</dt>
                  <dd className="font-medium text-foreground">
                    {user ? tRoles(user.role) : ""}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Password Management */}
            {isEmailLoginActive && (
              <div className="rounded-xl border border-border bg-card p-5 max-w-lg space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground">
                    {user?.noPassword
                      ? t("account.setPasswordTitle")
                      : t("account.passwordTitle")}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {user?.noPassword
                      ? t("account.noPasswordHint")
                      : t("account.passwordHint")}
                  </p>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-3.5">
                  {!user?.noPassword && (
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="current-pass"
                        className="text-xs font-medium"
                      >
                        {t("account.currentPassword")}
                      </Label>
                      <div className="relative">
                        <Input
                          id="current-pass"
                          type={showCurrentPass ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="pr-9 text-xs h-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          aria-label={
                            showCurrentPass
                              ? t("account.hidePassword")
                              : t("account.showPassword")
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showCurrentPass ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="new-pass" className="text-xs font-medium">
                      {t("account.newPassword")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-pass"
                        type={showNewPass ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t("account.passwordPlaceholder")}
                        required
                        minLength={6}
                        className="pr-9 text-xs h-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        aria-label={
                          showNewPass
                            ? t("account.hidePassword")
                            : t("account.showPassword")
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showNewPass ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="confirm-pass"
                      className="text-xs font-medium"
                    >
                      {t("account.confirmPassword")}
                    </Label>
                    <Input
                      id="confirm-pass"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t("account.confirmPlaceholder")}
                      required
                      minLength={6}
                      className="text-xs h-9"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={passwordLoading}
                    className="gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>{t("account.saving")}</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="size-3.5" />
                        <span>
                          {user?.noPassword
                            ? t("account.submitCreate")
                            : t("account.submitUpdate")}
                        </span>
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
