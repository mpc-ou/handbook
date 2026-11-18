"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Download, Shield } from "lucide-react";
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canUserManageCourse } from "@/lib/progression";
import {
  buildUserProgressIndex,
  computeCourseFunnel,
  computeCourseSummaryMetrics,
  computeLearnerStats,
  computeOverviewMetrics,
  computeQuizAssessmentRows,
  downloadCsvFile,
  getLessonCellProgress,
  type LearnerStats,
} from "@/components/studio/progress/progress-utils";
import { OverviewCards } from "@/components/studio/progress/OverviewCards";
import { LearnersTable } from "@/components/studio/progress/LearnersTable";
import { LearnerDrawer } from "@/components/studio/progress/LearnerDrawer";
import { CourseMatrix } from "@/components/studio/progress/CourseMatrix";
import { ItemFunnel } from "@/components/studio/progress/ItemFunnel";
import { QuizzesTable } from "@/components/studio/progress/QuizzesTable";

type ActiveTab = "overview" | "course" | "quizzes";

export default function StudioProgressPage() {
  const t = useTranslations("progress");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  const {
    user: currentUser,
    allUsers,
    allProgress,
    courses,
    lessons,
    items,
    quizAttempts,
    departments,
    dataLoading,
  } = useHandbook();

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [includeStaff, setIncludeStaff] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedLearnerUid, setSelectedLearnerUid] = useState<string | null>(
    null
  );

  // Các khóa học thuộc phạm vi quản lý (ADMIN: mọi khóa; EDITOR: khóa được giao)
  const visibleCourses = useMemo(() => {
    if (!currentUser) return [];
    return courses
      .filter((c) => canUserManageCourse(currentUser, c.id))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [courses, currentUser]);

  const visibleCourseIds = useMemo(
    () => new Set(visibleCourses.map((c) => c.id)),
    [visibleCourses]
  );

  const visibleLessons = useMemo(
    () => lessons.filter((l) => visibleCourseIds.has(l.courseId)),
    [lessons, visibleCourseIds]
  );

  const visibleLessonIds = useMemo(
    () => new Set(visibleLessons.map((l) => l.id)),
    [visibleLessons]
  );

  const visibleItems = useMemo(
    () => items.filter((i) => visibleLessonIds.has(i.lessonId)),
    [items, visibleLessonIds]
  );

  const visibleItemIds = useMemo(
    () => new Set(visibleItems.map((i) => i.id)),
    [visibleItems]
  );

  // Tự động chọn khóa đầu tiên khi danh sách khóa thay đổi
  useEffect(() => {
    if (
      visibleCourses.length > 0 &&
      !visibleCourses.some((c) => c.id === selectedCourseId)
    ) {
      setSelectedCourseId(visibleCourses[0].id);
    }
  }, [visibleCourses, selectedCourseId]);

  // Danh sách học viên: mặc định role MEMBER, có tuỳ chọn gồm cả staff
  const baseLearners = useMemo(() => {
    if (includeStaff) return allUsers;
    return allUsers.filter((u) => u.role === "MEMBER");
  }, [allUsers, includeStaff]);

  const learnerUidSet = useMemo(
    () => new Set(baseLearners.map((u) => u.uid)),
    [baseLearners]
  );

  // Chỉ mục tiến độ theo học viên
  const progressIndex = useMemo(
    () =>
      buildUserProgressIndex(
        allProgress,
        currentUser?.role === "ADMIN" ? undefined : visibleItemIds
      ),
    [allProgress, currentUser?.role, visibleItemIds]
  );

  const allLearnerStats = useMemo(
    () =>
      computeLearnerStats(
        baseLearners,
        visibleCourses,
        visibleLessons,
        visibleItems,
        progressIndex
      ),
    [baseLearners, visibleCourses, visibleLessons, visibleItems, progressIndex]
  );

  // Danh sách phòng ban duy nhất
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    for (const d of departments) {
      if (d.name?.trim()) set.add(d.name.trim());
    }
    for (const u of allUsers) {
      if (u.department?.trim()) set.add(u.department.trim());
    }
    return Array.from(set);
  }, [departments, allUsers]);

  // Lọc học viên cho bảng tổng quan
  const filteredLearners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allLearnerStats.filter((l) => {
      if (deptFilter !== "ALL" && l.user.department !== deptFilter) {
        return false;
      }
      if (q) {
        return (
          l.user.fullName.toLowerCase().includes(q) ||
          l.user.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allLearnerStats, deptFilter, searchQuery]);

  const overviewMetrics = useMemo(
    () => computeOverviewMetrics(allLearnerStats, visibleCourses),
    [allLearnerStats, visibleCourses]
  );

  const activeCourseId = selectedCourseId || visibleCourses[0]?.id || "";

  const courseSummaryMetrics = useMemo(
    () =>
      computeCourseSummaryMetrics(
        activeCourseId,
        allLearnerStats,
        visibleLessons,
        visibleItems,
        quizAttempts,
        learnerUidSet
      ),
    [
      activeCourseId,
      allLearnerStats,
      visibleLessons,
      visibleItems,
      quizAttempts,
      learnerUidSet,
    ]
  );

  const funnelRows = useMemo(
    () =>
      computeCourseFunnel(
        activeCourseId,
        allLearnerStats,
        visibleLessons,
        visibleItems,
        quizAttempts,
        learnerUidSet
      ),
    [
      activeCourseId,
      allLearnerStats,
      visibleLessons,
      visibleItems,
      quizAttempts,
      learnerUidSet,
    ]
  );

  const quizAssessmentRows = useMemo(
    () =>
      computeQuizAssessmentRows(
        visibleCourses,
        visibleLessons,
        visibleItems,
        quizAttempts,
        learnerUidSet
      ),
    [visibleCourses, visibleLessons, visibleItems, quizAttempts, learnerUidSet]
  );

  const selectedLearner = useMemo(
    () =>
      allLearnerStats.find((l) => l.user.uid === selectedLearnerUid) ?? null,
    [allLearnerStats, selectedLearnerUid]
  );

  const handleExportCsv = () => {
    if (activeTab === "overview") {
      const headers = [
        t("csv.fullName"),
        t("csv.email"),
        t("csv.department"),
        t("csv.startedCourses"),
        t("csv.completedCourses"),
        t("csv.overallProgress"),
        t("csv.lastActive"),
        ...visibleCourses.map((c) => `${c.title} (%)`),
      ];
      const rows = filteredLearners.map((l) => [
        l.user.fullName,
        l.user.email,
        l.user.department || t("filters.unassignedDept"),
        l.startedCoursesCount,
        l.completedCoursesCount,
        l.overallPercent,
        l.lastAccessedAt && l.lastAccessedMs > 0
          ? format.dateTime(new Date(l.lastAccessedAt), {
              dateStyle: "short",
              timeStyle: "short",
            })
          : "",
        ...visibleCourses.map(
          (c) => l.courseProgressById[c.id]?.percent ?? 0
        ),
      ]);
      downloadCsvFile(t("csv.learnersFilename"), headers, rows);
      return;
    }

    if (activeTab === "course") {
      const publishedCourseLessons = visibleLessons
        .filter((l) => l.courseId === activeCourseId && l.isPublished)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const headers = [
        t("csv.fullName"),
        t("csv.email"),
        t("csv.department"),
        t("csv.courseProgress"),
        ...publishedCourseLessons.map((l, i) => `${i + 1}. ${l.title} (%)`),
      ];

      const sorted = [...allLearnerStats].sort((a, b) => {
        const pA = a.courseProgressById[activeCourseId]?.percent ?? 0;
        const pB = b.courseProgressById[activeCourseId]?.percent ?? 0;
        return pB - pA || a.user.fullName.localeCompare(b.user.fullName);
      });

      const rows = sorted.map((l) => [
        l.user.fullName,
        l.user.email,
        l.user.department || t("filters.unassignedDept"),
        l.courseProgressById[activeCourseId]?.percent ?? 0,
        ...publishedCourseLessons.map(
          (lesson) =>
            getLessonCellProgress(
              lesson.id,
              visibleItems,
              l.progressByItemId
            ).percent
        ),
      ]);

      downloadCsvFile(t("csv.matrixFilename"), headers, rows);
      return;
    }

    const headers = [
      t("csv.itemTitle"),
      t("csv.itemType"),
      t("csv.courseTitle"),
      t("csv.lessonTitle"),
      t("csv.attemptsCount"),
      t("csv.avgScore"),
      t("csv.passRate"),
      t("csv.pendingCount"),
    ];
    const rows = quizAssessmentRows.map((r) => [
      r.item.title,
      tCommon(`itemType.${r.item.type}`),
      r.courseTitle,
      r.lessonTitle,
      r.attemptsCount,
      r.avgScore ?? "",
      r.passRate ?? "",
      r.pendingCount,
    ]);
    downloadCsvFile(t("csv.quizzesFilename"), headers, rows);
  };

  // Kiểm tra quyền truy cập: chỉ ADMIN hoặc EDITOR
  if (
    currentUser &&
    currentUser.role !== "ADMIN" &&
    currentUser.role !== "EDITOR"
  ) {
    return (
      <AdminLayout breadcrumbs={[{ label: t("breadcrumb") }]}>
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
          <Shield className="size-10 text-destructive/80" />
          <h2 className="text-lg font-bold text-foreground">
            {t("accessDenied.title")}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("accessDenied.description")}
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
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
                <Checkbox
                  checked={includeStaff}
                  onCheckedChange={(checked) =>
                    setIncludeStaff(Boolean(checked))
                  }
                />
                <span>{t("includeStaff")}</span>
              </label>

              <Button
                type="button"
                size="sm"
                onClick={handleExportCsv}
                disabled={dataLoading}
                className="cursor-pointer"
              >
                <Download className="size-4" />
                <span>{t("exportCsv")}</span>
              </Button>
            </div>
          }
        />

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as ActiveTab)}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
            <TabsTrigger value="course">{t("tabs.byCourse")}</TabsTrigger>
            <TabsTrigger value="quizzes">{t("tabs.quizzes")}</TabsTrigger>
          </TabsList>

          {/* 1. Chế độ Tổng quan */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            <OverviewCards metrics={overviewMetrics} loading={dataLoading} />
            <LearnersTable
              learners={filteredLearners}
              departments={departmentOptions}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              deptFilter={deptFilter}
              onDeptFilterChange={setDeptFilter}
              onResetFilters={() => {
                setSearchQuery("");
                setDeptFilter("ALL");
              }}
              onSelectLearner={(l: LearnerStats) =>
                setSelectedLearnerUid(l.user.uid)
              }
              loading={dataLoading}
            />
          </TabsContent>

          {/* 2. Chế độ Theo khóa học */}
          <TabsContent value="course" className="space-y-6 mt-0">
            {dataLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-9 w-72" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
                <Skeleton className="h-72 rounded-xl" />
              </div>
            ) : visibleCourses.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  {t("courseView.noCoursesTitle")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("courseView.noCoursesDescription")}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("filters.selectCourse")}
                  </span>
                  <Select
                    value={activeCourseId}
                    onValueChange={setSelectedCourseId}
                  >
                    <SelectTrigger
                      className="h-9 w-full sm:w-[320px] text-sm cursor-pointer"
                      aria-label={t("filters.selectCourse")}
                    >
                      <SelectValue
                        placeholder={t("filters.selectCoursePlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {visibleCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <CourseMatrix
                  courseId={activeCourseId}
                  summary={courseSummaryMetrics}
                  learners={allLearnerStats}
                  lessons={visibleLessons}
                  items={visibleItems}
                  onSelectLearner={(l: LearnerStats) =>
                    setSelectedLearnerUid(l.user.uid)
                  }
                />

                <ItemFunnel rows={funnelRows} />
              </div>
            )}
          </TabsContent>

          {/* 3. Chế độ Bài kiểm tra */}
          <TabsContent value="quizzes" className="space-y-6 mt-0">
            <QuizzesTable rows={quizAssessmentRows} loading={dataLoading} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Ngăn bên chi tiết học viên */}
      <LearnerDrawer
        learner={selectedLearner}
        onClose={() => setSelectedLearnerUid(null)}
        courses={visibleCourses}
        lessons={visibleLessons}
        items={visibleItems}
        quizAttempts={quizAttempts}
      />
    </AdminLayout>
  );
}
