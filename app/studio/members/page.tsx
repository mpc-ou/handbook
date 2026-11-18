"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, SortableHeader } from "@/components/admin/DataTable";
import { ProgressBar } from "@/components/ui/animated-progress";
import { hasQuiz } from "@/lib/quiz-rules";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DepartmentRecord, Role, UserProfile } from "@/types";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  Clock,
  Edit,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

interface MemberWithStats extends UserProfile {
  completedCount: number;
  totalPublished: number;
  completionRate: number;
  avgQuizScore: number | null;
  statusKey: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED";
}

export default function StudioMembersPage() {
  const {
    user: currentUser,
    allUsers,
    courses,
    lessons,
    items,
    departments,
    allProgress,
    quizAttempts,
    dataLoading,
    ssoStatus,
    updateUserRoleAndPermissions,
    saveDepartment,
    deleteDepartment,
    showToast,
  } = useHandbook();

  const format = useFormatter();
  const t = useTranslations("studioItems.members");
  const tc = useTranslations("common");

  const [mainTab, setMainTab] = useState<"members" | "departments">("members");

  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptDescription, setDeptDescription] = useState("");
  const [deptColor, setDeptColor] = useState("#f97316");
  const [savingDept, setSavingDept] = useState(false);
  const [deleteDeptId, setDeleteDeptId] = useState<string | null>(null);

  const fmtDateTime = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return format.dateTime(d, { dateStyle: "short", timeStyle: "short" });
  };

  const departmentList = useMemo(() => {
    if (departments && departments.length > 0) return departments;
    return [];
  }, [departments]);

  const departmentNames = useMemo(
    () => departmentList.map((d) => d.name),
    [departmentList]
  );

  const [editRole, setEditRole] = useState<Role>("MEMBER");
  const [editDepartment, setEditDepartment] = useState<string>("");
  const [editCourseIds, setEditCourseIds] = useState<string[]>([]);
  const [editManagedGroups, setEditManagedGroups] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.orderIndex - b.orderIndex),
    [courses]
  );

  const lessonMap = useMemo(
    () => new Map(lessons.map((l) => [l.id, l])),
    [lessons]
  );
  const courseMap = useMemo(
    () => new Map(courses.map((c) => [c.id, c])),
    [courses]
  );

  const publishedItems = useMemo(
    () =>
      items
        .filter((i) => i.status === "PUBLISHED")
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [items]
  );

  const membersWithStats = useMemo<MemberWithStats[]>(() => {
    const totalPub = publishedItems.length || 1;
    const pubIds = new Set(publishedItems.map((i) => i.id));

    return allUsers.map((m) => {
      const userProg = allProgress.filter(
        (p) => p.userId === m.uid && pubIds.has(p.itemId)
      );
      const completedCount = userProg.filter((p) => p.isCompleted).length;
      const completionRate = Math.round((completedCount / totalPub) * 100);

      const scoredProg = userProg.filter((p) => p.highestQuizScore > 0);
      const avgQuizScore =
        scoredProg.length > 0
          ? Math.round(
              scoredProg.reduce((sum, p) => sum + p.highestQuizScore, 0) /
                scoredProg.length
            )
          : null;

      let statusKey: "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" =
        "NOT_STARTED";
      if (
        completedCount >= publishedItems.length &&
        publishedItems.length > 0
      ) {
        statusKey = "COMPLETED";
      } else if (userProg.length > 0) {
        statusKey = "IN_PROGRESS";
      }

      return {
        ...m,
        completedCount,
        totalPublished: publishedItems.length,
        completionRate,
        avgQuizScore,
        statusKey,
      };
    });
  }, [allUsers, allProgress, publishedItems]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return membersWithStats.filter((m) => {
      if (deptFilter !== "ALL" && m.department !== deptFilter) return false;
      if (roleFilter !== "ALL" && m.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && m.statusKey !== statusFilter) return false;
      if (q) {
        return (
          m.fullName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [membersWithStats, deptFilter, roleFilter, statusFilter, searchQuery]);

  const selectedMember = useMemo(
    () => membersWithStats.find((m) => m.uid === selectedUid) || null,
    [membersWithStats, selectedUid]
  );

  useEffect(() => {
    if (selectedMember) {
      setEditRole(selectedMember.role);
      setEditDepartment(selectedMember.department || departmentNames[0] || "");
      setEditCourseIds(selectedMember.managedCourseIds || []);
      setEditManagedGroups(selectedMember.managedGroups || []);
    }
  }, [selectedMember, departmentNames]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    deptFilter !== "ALL" ||
    roleFilter !== "ALL" ||
    statusFilter !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setDeptFilter("ALL");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
  };

  const columns = useMemo<ColumnDef<MemberWithStats, unknown>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: ({ column }) => (
          <SortableHeader column={column} label={t("columns.member")} />
        ),
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center gap-3 min-w-[200px]">
              <Avatar className="size-8 shrink-0">
                {m.avatarUrl && (
                  <AvatarImage
                    src={m.avatarUrl}
                    alt={m.fullName}
                    referrerPolicy="no-referrer"
                  />
                )}
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  {m.fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {m.fullName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {m.email}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "department",
        header: ({ column }) => (
          <SortableHeader column={column} label={t("columns.department")} />
        ),
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex flex-col gap-0.5 min-w-[160px]">
              <span className="text-xs text-foreground">
                {m.department || t("columns.unassignedDept")}
              </span>
              {m.managedGroups && m.managedGroups.length > 0 && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                  {t("columns.viewGroupsPrefix")} {m.managedGroups.join(", ")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <SortableHeader column={column} label={t("columns.role")} />
        ),
        cell: ({ row }) => {
          const m = row.original;
          const adminEmails = ssoStatus?.superAdminEmails || [
            "trieukon1011@gmail.com",
          ];
          if (adminEmails.includes(m.email.toLowerCase())) {
            return (
              <Badge variant="default" className="text-xs font-medium">
                {t("roles.SUPER_ADMIN")}
              </Badge>
            );
          }
          return (
            <div className="flex flex-col items-start gap-0.5">
              <Badge
                variant={
                  m.role === "ADMIN"
                    ? "default"
                    : m.role === "EDITOR"
                    ? "secondary"
                    : "outline"
                }
                className="text-xs font-normal"
              >
                {t(`roles.${m.role}`)}
              </Badge>
              {m.role === "EDITOR" && (
                <span className="text-[11px] text-muted-foreground">
                  {t("columns.assignedCoursesCount", {
                    count: m.managedCourseIds?.length || 0,
                  })}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "completionRate",
        header: ({ column }) => (
          <SortableHeader column={column} label={t("columns.progress")} />
        ),
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="w-32 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {t(`progressStatus.${m.statusKey}`)}
                </span>
                <span className="font-mono tabular-nums text-foreground">
                  {m.completionRate}%
                </span>
              </div>
              <ProgressBar
                value={m.completionRate}
                label={t("columns.progress")}
              />
            </div>
          );
        },
      },
      {
        accessorKey: "avgQuizScore",
        header: ({ column }) => (
          <SortableHeader column={column} label={t("columns.avgQuizScore")} />
        ),
        cell: ({ row }) => {
          const score = row.original.avgQuizScore;
          if (score === null) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <span className="text-xs font-mono font-medium text-foreground tabular-nums">
              {score}%
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("columns.detailsSr")}</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setSelectedUid(row.original.uid)}
              className="cursor-pointer text-xs"
            >
              {t("columns.viewProfile")}
            </Button>
          </div>
        ),
      },
    ],
    [ssoStatus, t]
  );

  const toggleManagedCourse = (courseId: string) => {
    setEditCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedMember) return;
    setSavingPerms(true);
    try {
      await updateUserRoleAndPermissions(
        selectedMember.uid,
        editRole,
        editDepartment,
        editRole === "EDITOR" ? editCourseIds : [],
        editManagedGroups
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("toast.savePermsFailed"),
        "error"
      );
    } finally {
      setSavingPerms(false);
    }
  };

  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setDeptName("");
    setDeptDescription("");
    setDeptColor("#f97316");
    setDeptDialogOpen(true);
  };

  const handleOpenEditDept = (dept: DepartmentRecord) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptDescription(dept.description || "");
    setDeptColor(dept.color || "#f97316");
    setDeptDialogOpen(true);
  };

  const handleSaveDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      showToast(t("toast.deptNameRequired"), "error");
      return;
    }
    setSavingDept(true);
    try {
      await saveDepartment({
        id: editingDept?.id,
        name: deptName.trim(),
        description: deptDescription.trim() || null,
        color: deptColor,
      });
      setDeptDialogOpen(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("toast.saveDeptFailed"),
        "error"
      );
    } finally {
      setSavingDept(false);
    }
  };

  const handleConfirmDeleteDept = async () => {
    if (!deleteDeptId) return;
    try {
      await deleteDepartment(deleteDeptId);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("toast.deleteDeptFailed"),
        "error"
      );
    } finally {
      setDeleteDeptId(null);
    }
  };

  if (currentUser && currentUser.role !== "ADMIN") {
    return (
      <AdminLayout breadcrumbs={[{ label: t("breadcrumb") }]}>
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
          <Shield className="size-10 text-destructive/80" />
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
      <div className="space-y-5">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            mainTab === "departments" ? (
              <Button
                type="button"
                size="sm"
                onClick={handleOpenCreateDept}
                className="gap-1.5 cursor-pointer text-xs"
              >
                <Plus className="size-3.5" />
                <span>{t("addDepartment")}</span>
              </Button>
            ) : undefined
          }
        />

        {/* Chuyển tab: Thành viên | Các ban */}
        <div className="border-b border-border">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setMainTab("members")}
              className={cn(
                "pb-2.5 text-xs font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer",
                mainTab === "members"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="size-3.5" />
              <span>{t("tabs.members")}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                ({allUsers.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("departments")}
              className={cn(
                "pb-2.5 text-xs font-medium flex items-center gap-2 border-b-2 transition-colors cursor-pointer",
                mainTab === "departments"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="size-3.5" />
              <span>{t("tabs.departments")}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                ({departmentList.length})
              </span>
            </button>
          </div>
        </div>

        {mainTab === "members" ? (
          <DataTable
            columns={columns}
            data={filteredMembers}
            loading={dataLoading}
            onRowClick={(m) => setSelectedUid(m.uid)}
            emptyTitle={t("empty.title")}
            emptyDescription={t("empty.description")}
            emptyAction={
              hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="cursor-pointer text-xs"
                >
                  <RotateCcw className="size-3.5 mr-1.5" />
                  <span>{t("empty.resetFilters")}</span>
                </Button>
              ) : undefined
            }
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("filters.searchPlaceholder")}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-8 w-[170px] text-xs cursor-pointer">
                    <SelectValue placeholder={t("filters.allDepartments")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      {t("filters.allDepartments")}
                    </SelectItem>
                    {departmentNames.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-8 w-[145px] text-xs cursor-pointer">
                    <SelectValue placeholder={t("filters.allRoles")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("filters.allRoles")}</SelectItem>
                    <SelectItem value="ADMIN">{t("roles.ADMIN")}</SelectItem>
                    <SelectItem value="EDITOR">{t("roles.EDITOR")}</SelectItem>
                    <SelectItem value="MEMBER">{t("roles.MEMBER")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[145px] text-xs cursor-pointer">
                    <SelectValue placeholder={t("filters.allProgress")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">
                      {t("filters.allProgress")}
                    </SelectItem>
                    <SelectItem value="COMPLETED">
                      {t("progressStatus.COMPLETED")}
                    </SelectItem>
                    <SelectItem value="IN_PROGRESS">
                      {t("progressStatus.IN_PROGRESS")}
                    </SelectItem>
                    <SelectItem value="NOT_STARTED">
                      {t("progressStatus.NOT_STARTED")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <RotateCcw className="size-3.5 mr-1" />
                    <span>{t("filters.reset")}</span>
                  </Button>
                )}
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentList.map((dept) => {
              const memberCount = allUsers.filter(
                (u) => u.department === dept.name
              ).length;
              const restrictedCourseCount = courses.filter((c) =>
                c.allowedGroups?.includes(dept.name)
              ).length;

              return (
                <div
                  key={dept.id}
                  className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full shrink-0"
                          style={{ backgroundColor: dept.color || "#f97316" }}
                        />
                        <h3 className="font-semibold text-sm text-foreground">
                          {dept.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleOpenEditDept(dept)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer h-7 w-7"
                          title={t("departmentsGrid.editAria")}
                          aria-label={t("departmentsGrid.editAria")}
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={memberCount > 0}
                          onClick={() => setDeleteDeptId(dept.id)}
                          className={cn(
                            "cursor-pointer h-7 w-7",
                            memberCount > 0
                              ? "opacity-40 cursor-not-allowed text-muted-foreground"
                              : "text-muted-foreground hover:text-destructive"
                          )}
                          title={
                            memberCount > 0
                              ? t("departmentsGrid.deleteDisabledHint", {
                                  count: memberCount,
                                })
                              : t("departmentsGrid.deleteAria")
                          }
                          aria-label={t("departmentsGrid.deleteAria")}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {dept.description || t("departmentsGrid.noDescription")}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                      <span>
                        {t("departmentsGrid.memberCount", {
                          count: memberCount,
                        })}
                      </span>
                      <span>·</span>
                      <span>
                        {t("departmentsGrid.restrictedCoursesCount", {
                          count: restrictedCourseCount,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeptFilter(dept.name);
                        setMainTab("members");
                      }}
                      className="text-xs h-8 cursor-pointer w-full justify-start px-2"
                    >
                      <Users className="size-3.5 mr-1.5" />
                      <span>
                        {t("departmentsGrid.viewMembers", {
                          count: memberCount,
                        })}
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ngăn chi tiết thành viên & Phân quyền khóa học */}
      <Sheet
        open={Boolean(selectedMember)}
        onOpenChange={(open) => {
          if (!open) setSelectedUid(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto"
        >
          {selectedMember && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 shrink-0">
                    {selectedMember.avatarUrl && (
                      <AvatarImage
                        src={selectedMember.avatarUrl}
                        alt={selectedMember.fullName}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                      {selectedMember.fullName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <SheetTitle className="text-base truncate">
                      {selectedMember.fullName}
                    </SheetTitle>
                    <SheetDescription className="text-xs truncate">
                      {selectedMember.email}
                      {selectedMember.department
                        ? ` · ${selectedMember.department}`
                        : ""}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="px-4 pb-8">
                <Tabs defaultValue="progress" className="space-y-4">
                  <TabsList className="w-full grid grid-cols-2 h-9">
                    <TabsTrigger value="progress" className="text-xs">
                      <UserCheck className="size-3.5 mr-1.5" />
                      <span>{t("sheet.tabProgress")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="permissions" className="text-xs">
                      <Shield className="size-3.5 mr-1.5" />
                      <span>{t("sheet.tabPermissions")}</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Tiến độ học tập & Lịch sử nộp bài */}
                  <TabsContent value="progress" className="space-y-5 mt-0">
                    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2.5">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("sheet.completedItems")}
                          </p>
                          <p className="text-base font-semibold font-mono tabular-nums mt-0.5">
                            {selectedMember.completedCount}/
                            {selectedMember.totalPublished}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("sheet.completionRate")}
                          </p>
                          <p className="text-base font-semibold font-mono tabular-nums mt-0.5">
                            {selectedMember.completionRate}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t("sheet.avgScore")}
                          </p>
                          <p className="text-base font-semibold font-mono tabular-nums mt-0.5">
                            {selectedMember.avgQuizScore !== null
                              ? `${selectedMember.avgQuizScore}%`
                              : "—"}
                          </p>
                        </div>
                      </div>
                      <ProgressBar
                        value={selectedMember.completionRate}
                        label={t("sheet.completionRate")}
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("sheet.itemsDetailHeading", {
                          count: publishedItems.length,
                        })}
                      </p>

                      <div className="rounded-lg border border-border divide-y divide-border">
                        {publishedItems.map((item) => {
                          const prog = allProgress.find(
                            (p) =>
                              p.userId === selectedMember.uid &&
                              p.itemId === item.id
                          );
                          const lesson = lessonMap.get(item.lessonId);
                          const course = lesson
                            ? courseMap.get(lesson.courseId)
                            : undefined;

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {item.title}
                                </p>
                                {course && lesson && (
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {course.title} › {lesson.title}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                  {item.type === "CONTENT" ? (
                                    <span>
                                      {prog?.hasScrolledBottom
                                        ? t("sheet.readDone")
                                        : t("sheet.readPending")}
                                    </span>
                                  ) : (
                                    hasQuiz(item.type) && (
                                      <span className="font-mono">
                                        {prog && prog.highestQuizScore > 0
                                          ? t("sheet.scoreValue", {
                                              score: prog.highestQuizScore,
                                            })
                                          : t("sheet.scoreNotTaken")}
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0">
                                {prog?.isCompleted ? (
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                  >
                                    <CheckCircle2 className="size-3 mr-1" />
                                    <span>{t("progressStatus.COMPLETED")}</span>
                                  </Badge>
                                ) : prog ? (
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    <Clock className="size-3 mr-1" />
                                    <span>
                                      {t("progressStatus.IN_PROGRESS")}
                                    </span>
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    {t("progressStatus.NOT_STARTED")}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("sheet.attemptHistoryHeading")}
                      </p>
                      {(() => {
                        const memberAttempts = quizAttempts.filter(
                          (a) => a.userId === selectedMember.uid
                        );
                        if (memberAttempts.length === 0) {
                          return (
                            <p className="text-xs text-muted-foreground py-2">
                              {t("sheet.noAttempts")}
                            </p>
                          );
                        }
                        return (
                          <div className="rounded-lg border border-border divide-y divide-border">
                            {memberAttempts.map((att) => {
                              const item = items.find(
                                (i) => i.id === att.itemId
                              );
                              return (
                                <div
                                  key={att.id}
                                  className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground truncate">
                                      {item?.title ||
                                        att.itemTitle ||
                                        att.itemId}
                                    </p>
                                    <p className="text-muted-foreground font-mono">
                                      {fmtDateTime(att.createdAt)}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={
                                      att.isPassed
                                        ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono"
                                        : "border-destructive/30 text-destructive font-mono"
                                    }
                                  >
                                    {att.scorePercent}% ·{" "}
                                    {att.isPassed
                                      ? t("sheet.passed")
                                      : t("sheet.failed")}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </TabsContent>

                  {/* Tab 2: Vai trò & Phân quyền theo khóa học */}
                  <TabsContent value="permissions" className="space-y-5 mt-0">
                    {(() => {
                      const adminEmails = ssoStatus?.superAdminEmails || [
                        "trieukon1011@gmail.com",
                      ];
                      const isCurrentSuperAdmin = Boolean(
                        currentUser?.email &&
                          adminEmails.includes(currentUser.email.toLowerCase())
                      );
                      const isTargetSuperAdmin = Boolean(
                        selectedMember?.email &&
                          adminEmails.includes(
                            selectedMember.email.toLowerCase()
                          )
                      );
                      const isTargetAdmin = selectedMember?.role === "ADMIN";
                      const canModifyTarget =
                        isCurrentSuperAdmin ||
                        (!isTargetSuperAdmin && !isTargetAdmin);

                      return (
                        <div className="space-y-4">
                          {isTargetSuperAdmin && (
                            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                              {t("sheet.superAdminNotice")}
                            </div>
                          )}

                          {!isCurrentSuperAdmin &&
                            isTargetAdmin &&
                            !isTargetSuperAdmin && (
                              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                                {t("sheet.adminProtectedNotice")}
                              </div>
                            )}

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                              {t("sheet.departmentLabel")}
                            </Label>
                            <Select
                              value={editDepartment}
                              onValueChange={setEditDepartment}
                              disabled={
                                !canModifyTarget ||
                                currentUser?.role !== "ADMIN"
                              }
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue
                                  placeholder={t("sheet.departmentPlaceholder")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {departmentNames.map((d) => (
                                  <SelectItem key={d} value={d}>
                                    {d}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                              {t("sheet.roleLabel")}
                            </Label>
                            <Select
                              value={editRole}
                              onValueChange={(val) => setEditRole(val as Role)}
                              disabled={
                                !canModifyTarget ||
                                currentUser?.role !== "ADMIN"
                              }
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue
                                  placeholder={t("sheet.rolePlaceholder")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MEMBER">
                                  {t("roles.MEMBER_DESC")}
                                </SelectItem>
                                <SelectItem value="EDITOR">
                                  {t("roles.EDITOR_DESC")}
                                </SelectItem>
                                {isCurrentSuperAdmin && (
                                  <SelectItem value="ADMIN">
                                    {t("roles.ADMIN_DESC")}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {departmentNames.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <div className="space-y-0.5">
                                <Label className="text-xs font-medium">
                                  {t("sheet.managedGroupsLabel")}
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                  {t("sheet.managedGroupsDescription")}
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-border p-3">
                                {departmentNames.map((dept) => {
                                  const isChecked =
                                    editManagedGroups.includes(dept);
                                  return (
                                    <label
                                      key={dept}
                                      className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground"
                                    >
                                      <Checkbox
                                        checked={isChecked}
                                        disabled={
                                          !canModifyTarget ||
                                          currentUser?.role !== "ADMIN"
                                        }
                                        onCheckedChange={(checked) => {
                                          setEditManagedGroups((prev) =>
                                            checked
                                              ? [...prev, dept]
                                              : prev.filter((d) => d !== dept)
                                          );
                                        }}
                                      />
                                      <span className="truncate">{dept}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Phân quyền theo khóa học cho EDITOR */}
                          {editRole === "EDITOR" && (
                            <div className="space-y-2 pt-1">
                              <div className="space-y-0.5">
                                <Label className="text-xs font-medium flex items-center gap-1.5">
                                  <BookOpen className="size-3.5 text-primary" />
                                  <span>{t("sheet.assignedCoursesLabel")}</span>
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                  {t("sheet.assignedCoursesDescription")}
                                </p>
                              </div>
                              {sortedCourses.length > 0 ? (
                                <div className="rounded-lg border border-border divide-y divide-border">
                                  {sortedCourses.map((course) => {
                                    const checked = editCourseIds.includes(
                                      course.id
                                    );
                                    return (
                                      <label
                                        key={course.id}
                                        className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/30"
                                      >
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-foreground truncate">
                                            {course.title}
                                          </p>
                                          <p className="text-[11px] text-muted-foreground font-mono truncate">
                                            /learn/{course.slug}
                                          </p>
                                        </div>
                                        <Checkbox
                                          checked={checked}
                                          disabled={!canModifyTarget}
                                          onCheckedChange={() =>
                                            toggleManagedCourse(course.id)
                                          }
                                        />
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground py-2">
                                  {t("sheet.noCourses")}
                                </p>
                              )}
                            </div>
                          )}

                          <Separator />

                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                savingPerms ||
                                !canModifyTarget ||
                                currentUser?.role !== "ADMIN"
                              }
                              onClick={handleSavePermissions}
                              className="cursor-pointer"
                            >
                              <Save className="size-3.5 mr-1.5" />
                              <span>
                                {savingPerms
                                  ? t("sheet.savingPermissions")
                                  : t("sheet.savePermissions")}
                              </span>
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Hộp thoại Thêm / Sửa Ban */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDept
                ? t("deptDialog.editTitle")
                : t("deptDialog.createTitle")}
            </DialogTitle>
            <DialogDescription>{t("deptDialog.description")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDeptSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="deptNameInput" className="text-xs font-medium">
                {t("deptDialog.nameLabel")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="deptNameInput"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder={t("deptDialog.namePlaceholder")}
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deptDescInput" className="text-xs font-medium">
                {t("deptDialog.descLabel")}
              </Label>
              <Textarea
                id="deptDescInput"
                rows={3}
                value={deptDescription}
                onChange={(e) => setDeptDescription(e.target.value)}
                placeholder={t("deptDialog.descPlaceholder")}
                className="text-xs resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {t("deptDialog.colorLabel")}
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={deptColor}
                  onChange={(e) => setDeptColor(e.target.value)}
                  className="size-8 rounded border border-border cursor-pointer p-0.5 bg-background"
                />
                <div className="flex items-center gap-1.5">
                  {[
                    "#f97316",
                    "#3b82f6",
                    "#8b5cf6",
                    "#10b981",
                    "#f59e0b",
                    "#ec4899",
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDeptColor(c)}
                      className={cn(
                        "size-6 rounded-full cursor-pointer transition-transform",
                        deptColor === c
                          ? "ring-2 ring-primary ring-offset-2 scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: c }}
                      title={c}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDeptDialogOpen(false)}
                className="cursor-pointer"
              >
                {tc("actions.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingDept || !deptName.trim()}
                className="cursor-pointer font-medium"
              >
                {savingDept ? t("deptDialog.saving") : t("deptDialog.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteDeptId)}
        onOpenChange={(open) => {
          if (!open) setDeleteDeptId(null);
        }}
        title={t("deleteDeptDialog.title")}
        description={t("deleteDeptDialog.description")}
        confirmLabel={t("deleteDeptDialog.confirm")}
        cancelLabel={tc("actions.cancel")}
        variant="destructive"
        onConfirm={handleConfirmDeleteDept}
      />
    </AdminLayout>
  );
}
