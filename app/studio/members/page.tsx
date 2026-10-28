"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, SortableHeader } from "@/components/admin/DataTable";
import { formatDateTime } from "@/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  Building2,
  CheckCircle2,
  Clock,
  Edit,
  FolderLock,
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

function roleLabel(role: Role): string {
  if (role === "ADMIN") return "Administrator";
  if (role === "EDITOR") return "Department Editor";
  return "Reader / Member";
}

export default function StudioMembersPage() {
  const {
    user: currentUser,
    allUsers,
    articles,
    categories,
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

  const [mainTab, setMainTab] = useState<"members" | "departments">("members");

  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected member for slide-over sheet
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // Department modal state
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptDescription, setDeptDescription] = useState("");
  const [deptColor, setDeptColor] = useState("#f97316");
  const [savingDept, setSavingDept] = useState(false);
  const [deleteDeptId, setDeleteDeptId] = useState<string | null>(null);

  const departmentList = useMemo(() => {
    if (departments && departments.length > 0) return departments;
    return [
      { id: "dept_1", name: "Executive Board", description: "General management and club operations", color: "#8b5cf6" },
      { id: "dept_2", name: "Academic Team", description: "Technology R&D, technical training and curriculum", color: "#3b82f6" },
      { id: "dept_3", name: "Media & Events", description: "Public relations, visual design, and event operations", color: "#ec4899" },
      { id: "dept_4", name: "HR & External Affairs", description: "Member management, team building, and partner relations", color: "#f59e0b" },
    ];
  }, [departments]);

  const departmentNames = useMemo(
    () => departmentList.map((d) => d.name),
    [departmentList]
  );

  // Explicit permission form state inside Sheet
  const [editRole, setEditRole] = useState<Role>("MEMBER");
  const [editDepartment, setEditDepartment] = useState<string>("Academic Team");
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>([]);
  const [editManagedGroups, setEditManagedGroups] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const publishedArticles = useMemo(
    () =>
      articles
        .filter((a) => a.isPublished)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [articles]
  );

  const membersWithStats = useMemo<MemberWithStats[]>(() => {
    const totalPub = publishedArticles.length || 1;
    const pubIds = new Set(publishedArticles.map((a) => a.id));

    return allUsers.map((m) => {
      const userProg = allProgress.filter(
        (p) => p.userId === m.uid && pubIds.has(p.articleId)
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
      if (completedCount >= publishedArticles.length && publishedArticles.length > 0) {
        statusKey = "COMPLETED";
      } else if (userProg.length > 0) {
        statusKey = "IN_PROGRESS";
      }

      return {
        ...m,
        completedCount,
        totalPublished: publishedArticles.length,
        completionRate,
        avgQuizScore,
        statusKey,
      };
    });
  }, [allUsers, allProgress, publishedArticles]);

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

  // Sync permission form when selectedMember changes
  useEffect(() => {
    if (selectedMember) {
      setEditRole(selectedMember.role);
      setEditDepartment(selectedMember.department || "Academic Team");
      setEditCategoryIds(selectedMember.managedCategoryIds || []);
      setEditManagedGroups(selectedMember.managedGroups || []);
    }
  }, [selectedMember]);

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
          <SortableHeader column={column} label="Member" />
        ),
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center gap-3 min-w-[220px]">
              <Avatar className="size-8 shrink-0">
                {m.avatarUrl && (
                  <AvatarImage src={m.avatarUrl} alt={m.fullName} referrerPolicy="no-referrer" />
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
          <SortableHeader column={column} label="Department" />
        ),
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex flex-col gap-1 min-w-[170px]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-xs font-medium border-border/80 bg-muted/40 text-foreground"
                >
                  {m.department || "Unassigned"}
                </Badge>
              </div>
              {m.managedGroups && m.managedGroups.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground flex-wrap">
                  <span className="font-semibold text-primary">Manages:</span>
                  <span className="truncate max-w-[200px]">
                    {m.managedGroups.join(", ")}
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <SortableHeader column={column} label="Role" />
        ),
        cell: ({ row }) => {
          const m = row.original;
          const adminEmails = ssoStatus?.superAdminEmails || ["trieukon1011@gmail.com"];
          if (adminEmails.includes(m.email.toLowerCase())) {
            return (
              <Badge
                variant="default"
                className="text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white border-none"
              >
                Super Admin
              </Badge>
            );
          }
          return (
            <Badge
              variant={
                m.role === "ADMIN"
                  ? "default"
                  : m.role === "EDITOR"
                  ? "info"
                  : "secondary"
              }
              className="text-xs font-normal"
            >
              {roleLabel(m.role)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "avgQuizScore",
        header: ({ column }) => (
          <SortableHeader column={column} label="Avg Quiz Score" />
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
        accessorKey: "statusKey",
        header: "Status",
        cell: ({ row }) => {
          const st = row.original.statusKey;
          if (st === "COMPLETED") {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>Completed</span>
              </span>
            );
          }
          if (st === "IN_PROGRESS") {
            return (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <span className="size-1.5 rounded-full bg-primary" />
                <span>In Progress</span>
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-muted-foreground/40" />
              <span>Not Started</span>
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Details</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setSelectedUid(row.original.uid)}
              className="cursor-pointer"
            >
              View Profile
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const toggleManagedCategory = (catId: string) => {
    setEditCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
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
        editRole === "EDITOR" ? editCategoryIds : [],
        editManagedGroups
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
      showToast("Please enter a department name.", "error");
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
      showToast(err instanceof Error ? err.message : "Failed to save department.", "error");
    } finally {
      setSavingDept(false);
    }
  };

  const handleConfirmDeleteDept = async () => {
    if (!deleteDeptId) return;
    try {
      await deleteDepartment(deleteDeptId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete department.", "error");
    } finally {
      setDeleteDeptId(null);
    }
  };

  if (currentUser && currentUser.role !== "ADMIN") {
    return (
      <AdminLayout breadcrumbs={[{ label: "Members & Teams" }]}>
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
          <Shield className="size-10 text-destructive/80" />
          <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Only Administrators have permission to view members and configure role assignments.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout breadcrumbs={[{ label: "Members & Teams" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            title="Members & Departments"
            description="Monitor member learning progress, editor permissions, and club department structures."
          />
          {mainTab === "departments" && (
            <Button
              type="button"
              onClick={handleOpenCreateDept}
              className="gap-2 cursor-pointer shrink-0 self-start sm:self-auto font-medium"
            >
              <Plus className="size-4" />
              <span>Add Department</span>
            </Button>
          )}
        </div>

        {/* Tab Switcher: Members vs Departments */}
        <div className="border-b border-border">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setMainTab("members")}
              className={cn(
                "pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer",
                mainTab === "members"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="size-4" />
              <span>Members Directory</span>
              <Badge variant="secondary" className="text-[11px] h-5 px-1.5">
                {allUsers.length}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("departments")}
              className={cn(
                "pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer",
                mainTab === "departments"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="size-4" />
              <span>Departments Management</span>
              <Badge variant="secondary" className="text-[11px] h-5 px-1.5">
                {departmentList.length}
              </Badge>
            </button>
          </div>
        </div>

        {mainTab === "members" ? (
          <DataTable
            columns={columns}
            data={filteredMembers}
            loading={dataLoading}
            onRowClick={(m) => setSelectedUid(m.uid)}
            emptyTitle="No matching members found"
            emptyDescription="Try adjusting your search query or reset filters to view all club members."
            emptyAction={
              hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="cursor-pointer"
                >
                  <RotateCcw className="size-3.5 mr-1.5" />
                  <span>Reset Filters</span>
                </Button>
              ) : undefined
            }
            toolbar={
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1 max-w-sm">
                  <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by full name or email..."
                    className="pl-9 h-9 text-sm"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="h-9 w-[190px] text-sm cursor-pointer">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Departments</SelectItem>
                      {departmentNames.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="h-9 w-[150px] text-sm cursor-pointer">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Roles</SelectItem>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                      <SelectItem value="EDITOR">Department Editor</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[160px] text-sm cursor-pointer">
                      <SelectValue placeholder="Progress" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                    </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="h-9 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <RotateCcw className="size-3.5 mr-1.5" />
                      <span>Reset</span>
                    </Button>
                  )}
                </div>
              </div>
            }
          />
        ) : (
          /* Department Management Grid */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departmentList.map((dept) => {
                const memberCount = allUsers.filter(
                  (u) => u.department === dept.name
                ).length;
                const articleCount = articles.filter(
                  (a) => a.allowedGroups?.includes(dept.name)
                ).length;

                return (
                  <div
                    key={dept.id}
                    className="rounded-xl border border-border bg-card p-5 shadow-2xs flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="size-3.5 rounded-full shrink-0 ring-2 ring-background"
                            style={{ backgroundColor: dept.color || "#f97316" }}
                          />
                          <h3 className="font-bold text-base text-foreground leading-snug">
                            {dept.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleOpenEditDept(dept)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Edit department"
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
                              "cursor-pointer",
                              memberCount > 0
                                ? "opacity-40 cursor-not-allowed text-muted-foreground"
                                : "text-muted-foreground hover:text-destructive"
                            )}
                            title={
                              memberCount > 0
                                ? `Cannot delete department with ${memberCount} active members assigned.`
                                : "Delete this department"
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed min-h-[36px]">
                        {dept.description || "No description provided for this department yet."}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <Badge variant="outline" className="gap-1 bg-muted/40 font-normal">
                          <Users className="size-3 text-primary" />
                          <span>{memberCount} members</span>
                        </Badge>
                        <Badge variant="outline" className="gap-1 bg-muted/40 font-normal">
                          <FolderLock className="size-3 text-amber-500" />
                          <span>{articleCount} restricted lessons</span>
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeptFilter(dept.name);
                          setMainTab("members");
                        }}
                        className="text-xs h-8 cursor-pointer w-full"
                      >
                        <Users className="size-3.5 mr-1.5" />
                        <span>View Members ({memberCount})</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Member Detail & Permissions Slide-over Sheet */}
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
                      {selectedMember.email} · {selectedMember.department}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="px-4 pb-8">
                <Tabs defaultValue="progress" className="space-y-4">
                  <TabsList className="w-full grid grid-cols-2 h-9">
                    <TabsTrigger value="progress" className="text-xs">
                      <UserCheck className="size-3.5 mr-1.5" />
                      <span>Learning Progress</span>
                    </TabsTrigger>
                    <TabsTrigger value="permissions" className="text-xs">
                      <Shield className="size-3.5 mr-1.5" />
                      <span>Roles & Permissions</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Learning Progress & Quiz History */}
                  <TabsContent value="progress" className="space-y-5 mt-0">
                    {/* Stat Summary Strip */}
                    <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/20 p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Completed Lessons
                        </p>
                        <p className="text-base font-semibold font-mono tabular-nums mt-0.5">
                          {selectedMember.completedCount}/
                          {selectedMember.totalPublished}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Completion Rate
                        </p>
                        <p className="text-base font-semibold font-mono tabular-nums mt-0.5">
                          {selectedMember.completionRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Avg Quiz Score
                        </p>
                        <p className="text-base font-semibold font-mono tabular-nums mt-0.5">
                          {selectedMember.avgQuizScore !== null
                            ? `${selectedMember.avgQuizScore}%`
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Per-Article Breakdown */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Curriculum Breakdown ({publishedArticles.length})
                      </p>

                      <div className="rounded-lg border border-border divide-y divide-border">
                        {publishedArticles.map((art) => {
                          const prog = allProgress.find(
                            (p) =>
                              p.userId === selectedMember.uid &&
                              p.articleId === art.id
                          );
                          const hasQuiz =
                            (art.quizQuestions?.length || 0) > 0 &&
                            art.passScorePercent > 0;

                          return (
                            <div
                              key={art.id}
                              className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {art.title}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                  <span>
                                    Reading:{" "}
                                    {prog?.hasScrolledBottom ? "Read" : "Pending"}
                                  </span>
                                  {hasQuiz && (
                                    <span className="font-mono">
                                      Quiz:{" "}
                                      {prog && prog.highestQuizScore > 0
                                        ? `${prog.highestQuizScore}%`
                                        : "Not taken"}
                                    </span>
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
                                    <span>Completed</span>
                                  </Badge>
                                ) : prog ? (
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-primary/30 text-primary"
                                  >
                                    <Clock className="size-3 mr-1" />
                                    <span>Reading</span>
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    Not Started
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recent Quiz Attempts */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Assessment History
                      </p>
                      {(() => {
                        const memberAttempts = quizAttempts.filter(
                          (a) => a.userId === selectedMember.uid
                        );
                        if (memberAttempts.length === 0) {
                          return (
                            <p className="text-xs text-muted-foreground py-2">
                              This member has not submitted any assessments yet.
                            </p>
                          );
                        }
                        return (
                          <div className="rounded-lg border border-border divide-y divide-border">
                            {memberAttempts.map((att) => {
                              const art = articles.find(
                                (a) => a.id === att.articleId
                              );
                              return (
                                <div
                                  key={att.id}
                                  className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="font-medium text-foreground truncate">
                                      {art?.title || att.articleId}
                                    </p>
                                    <p className="text-muted-foreground font-mono">
                                      {formatDateTime(att.createdAt)}
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
                                    {att.isPassed ? "Passed" : "Failed"}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </TabsContent>

                  {/* Tab 2: Explicit Save Permissions Form */}
                  <TabsContent value="permissions" className="space-y-5 mt-0">
                    {(() => {
                      const adminEmails = ssoStatus?.superAdminEmails || ["trieukon1011@gmail.com"];
                      const isCurrentSuperAdmin = Boolean(currentUser?.email && adminEmails.includes(currentUser.email.toLowerCase()));
                      const isTargetSuperAdmin = Boolean(selectedMember?.email && adminEmails.includes(selectedMember.email.toLowerCase()));
                      const isTargetAdmin = selectedMember?.role === "ADMIN";
                      const canModifyTarget =
                        isCurrentSuperAdmin ||
                        (!isTargetSuperAdmin && !isTargetAdmin);

                      return (
                        <div className="space-y-4">
                          {isTargetSuperAdmin && (
                            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-700 dark:text-purple-300">
                              This is the system Super Admin account, protected via environment configuration.
                            </div>
                          )}

                          {!isCurrentSuperAdmin && isTargetAdmin && !isTargetSuperAdmin && (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                              Only the Super Admin has permission to modify roles for other Administrators.
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                              Department
                            </Label>
                            <Select
                              value={editDepartment}
                              onValueChange={setEditDepartment}
                              disabled={!canModifyTarget || currentUser?.role !== "ADMIN"}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Select Department" />
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
                              System Role
                            </Label>
                            <Select
                              value={editRole}
                              onValueChange={(val) => setEditRole(val as Role)}
                              disabled={!canModifyTarget || currentUser?.role !== "ADMIN"}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Select Role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MEMBER">
                                  Reader / Member (Read, like, and comment)
                                </SelectItem>
                                <SelectItem value="EDITOR">
                                  Department Editor (Draft and edit assigned categories)
                                </SelectItem>
                                {isCurrentSuperAdmin && (
                                  <SelectItem value="ADMIN">
                                    Administrator (Full publishing and governance access)
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Managed Groups (Audience Access) */}
                          <div className="space-y-2 pt-1">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-medium">
                                Audience Access Groups (Managed Groups)
                              </Label>
                              <p className="text-[11px] text-muted-foreground">
                                Select specific departments this member can access for internal restricted documents.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-border p-3">
                              {departmentNames.map((dept) => {
                                const isChecked = editManagedGroups.includes(dept);
                                return (
                                  <label
                                    key={dept}
                                    className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground"
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      disabled={!canModifyTarget || currentUser?.role !== "ADMIN"}
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

                          {editRole === "EDITOR" && (
                            <div className="space-y-2 pt-1">
                              <Label className="text-xs font-medium">
                                Assignable Editing Categories
                              </Label>
                              <div className="rounded-lg border border-border divide-y divide-border">
                                {categories.map((cat) => {
                                  const checked = editCategoryIds.includes(cat.id);
                                  return (
                                    <label
                                      key={cat.id}
                                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/30"
                                    >
                                      <span className="truncate">
                                        {cat.depth === 2
                                          ? `↳ ${cat.name}`
                                          : cat.name}
                                      </span>
                                      <Checkbox
                                        checked={checked}
                                        disabled={!canModifyTarget}
                                        onCheckedChange={() =>
                                          toggleManagedCategory(cat.id)
                                        }
                                      />
                                    </label>
                                  );
                                })}
                              </div>
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
                                {savingPerms ? "Saving..." : "Save Permissions"}
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

      {/* Dialog Add / Edit Department */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDept ? "Edit Department" : "Add New Department"}
            </DialogTitle>
            <DialogDescription>
              Create or update club departments to organize document audience restrictions and editorial permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDeptSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="deptNameInput" className="text-xs font-medium">
                Department Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="deptNameInput"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="e.g. Academic Team, Media & Events..."
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deptDescInput" className="text-xs font-medium">
                Mission & Description
              </Label>
              <Textarea
                id="deptDescInput"
                rows={3}
                value={deptDescription}
                onChange={(e) => setDeptDescription(e.target.value)}
                placeholder="Key responsibilities and organizational goals..."
                className="text-xs resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Brand / Accent Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={deptColor}
                  onChange={(e) => setDeptColor(e.target.value)}
                  className="size-8 rounded border border-border cursor-pointer p-0.5 bg-background"
                />
                <div className="flex items-center gap-1.5">
                  {["#8b5cf6", "#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#06b6d4"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDeptColor(c)}
                      className={cn(
                        "size-6 rounded-full cursor-pointer transition-transform",
                        deptColor === c ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"
                      )}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeptDialogOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingDept || !deptName.trim()}
                className="cursor-pointer font-medium"
              >
                {savingDept ? "Saving..." : "Save Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Department */}
      <ConfirmDialog
        open={Boolean(deleteDeptId)}
        onOpenChange={(open) => {
          if (!open) setDeleteDeptId(null);
        }}
        title="Confirm Delete Department"
        description="Are you sure you want to delete this department? This action is only permitted when no members are assigned to this department."
        confirmLabel="Delete Department"
        variant="destructive"
        onConfirm={handleConfirmDeleteDept}
      />
    </AdminLayout>
  );
}
