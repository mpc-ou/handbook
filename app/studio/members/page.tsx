"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { MembersTable } from "@/components/studio/members/MembersTable";
import { MemberEditSheet } from "@/components/studio/members/MemberEditSheet";
import { CleanupDialog } from "@/components/studio/members/CleanupDialog";
import { DeleteMemberDialog } from "@/components/studio/members/DeleteMemberDialog";
import { DepartmentsSheet } from "@/components/studio/members/DepartmentsSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserProfile } from "@/types";
import {
  Building2,
  RotateCcw,
  Search,
  Shield,
  TrendingUp,
} from "lucide-react";

const UNASSIGNED_FILTER = "__UNASSIGNED__";

export default function StudioMembersPage() {
  const {
    user: currentUser,
    allUsers,
    courses,
    departments,
    dataLoading,
    ssoStatus,
    updateUserRoleAndPermissions,
    saveDepartment,
    deleteDepartment,
    deleteMember,
    cleanupMemberData,
    showToast,
  } = useHandbook();

  const t = useTranslations("studioModeration.members");
  const tRoles = useTranslations("studioModeration.roles");
  const tc = useTranslations("common");

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");

  const [editingMemberUid, setEditingMemberUid] = useState<string | null>(null);
  const [cleanupMemberUid, setCleanupMemberUid] = useState<string | null>(null);
  const [deletingMemberUid, setDeletingMemberUid] = useState<string | null>(
    null
  );
  const [departmentsOpen, setDepartmentsOpen] = useState(false);

  const superAdminEmails = ssoStatus?.superAdminEmails;

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allUsers.filter((m) => {
      if (roleFilter !== "ALL" && m.role !== roleFilter) return false;
      if (deptFilter !== "ALL") {
        if (deptFilter === UNASSIGNED_FILTER) {
          if (m.department) return false;
        } else if (m.department !== deptFilter) {
          return false;
        }
      }
      if (q) {
        return (
          m.fullName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allUsers, roleFilter, deptFilter, searchQuery]);

  const editingMember: UserProfile | null = useMemo(
    () => allUsers.find((u) => u.uid === editingMemberUid) || null,
    [allUsers, editingMemberUid]
  );

  const cleanupTarget: UserProfile | null = useMemo(
    () => allUsers.find((u) => u.uid === cleanupMemberUid) || null,
    [allUsers, cleanupMemberUid]
  );

  const deletingTarget: UserProfile | null = useMemo(
    () => allUsers.find((u) => u.uid === deletingMemberUid) || null,
    [allUsers, deletingMemberUid]
  );

  const hasActiveFilters =
    searchQuery.trim() !== "" || roleFilter !== "ALL" || deptFilter !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setRoleFilter("ALL");
    setDeptFilter("ALL");
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
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Link href="/studio/progress">
                  <TrendingUp className="size-3.5" />
                  <span>{t("viewProgressLink")}</span>
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDepartmentsOpen(true)}
                className="text-xs cursor-pointer"
              >
                <Building2 className="size-3.5" />
                <span>
                  {t("departmentsButton", { count: departments.length })}
                </span>
              </Button>
            </>
          }
        />

        {/* Bộ lọc một dòng */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("filters.searchPlaceholder")}
                className="pl-8 h-8 text-xs"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs cursor-pointer">
                <SelectValue placeholder={t("filters.allRoles")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("filters.allRoles")}</SelectItem>
                <SelectItem value="ADMIN">{tRoles("ADMIN")}</SelectItem>
                <SelectItem value="EDITOR">{tRoles("EDITOR")}</SelectItem>
                <SelectItem value="MEMBER">{tRoles("MEMBER")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-8 w-[170px] text-xs cursor-pointer">
                <SelectValue placeholder={t("filters.allDepartments")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t("filters.allDepartments")}
                </SelectItem>
                <SelectItem value={UNASSIGNED_FILTER}>
                  {t("filters.unassignedDepartment")}
                </SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </SelectItem>
                ))}
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
                <RotateCcw className="size-3.5" />
                <span>{t("filters.reset")}</span>
              </Button>
            )}
          </div>

          <span className="text-xs text-muted-foreground tabular-nums">
            {t("filters.showingCount", {
              shown: filteredMembers.length,
              total: allUsers.length,
            })}
          </span>
        </div>

        {/* Nội dung bảng */}
        {dataLoading ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-xs text-muted-foreground">
            {tc("actions.loading")}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center space-y-2.5">
            <p className="text-sm font-medium text-foreground">
              {t("empty.title")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("empty.description")}
            </p>
            {hasActiveFilters && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="text-xs cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>{t("empty.resetFilters")}</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <MembersTable
            key={`${roleFilter}-${deptFilter}-${searchQuery}`}
            members={filteredMembers}
            currentUser={currentUser}
            superAdminEmails={superAdminEmails}
            onEdit={(member) => setEditingMemberUid(member.uid)}
            onCleanup={(member) => setCleanupMemberUid(member.uid)}
            onDelete={(member) => setDeletingMemberUid(member.uid)}
          />
        )}
      </div>

      {/* Ngăn chỉnh sửa thành viên */}
      <MemberEditSheet
        member={editingMember}
        open={Boolean(editingMember)}
        onOpenChange={(open) => {
          if (!open) setEditingMemberUid(null);
        }}
        currentUser={currentUser}
        superAdminEmails={superAdminEmails}
        departments={departments}
        courses={courses}
        onSave={updateUserRoleAndPermissions}
        showToast={showToast}
      />

      {/* Hộp thoại xóa dữ liệu học tập */}
      <CleanupDialog
        member={cleanupTarget}
        open={Boolean(cleanupTarget)}
        onOpenChange={(open) => {
          if (!open) setCleanupMemberUid(null);
        }}
        courses={courses}
        onConfirm={cleanupMemberData}
        showToast={showToast}
      />

      {/* Hộp thoại xóa thành viên */}
      <DeleteMemberDialog
        member={deletingTarget}
        open={Boolean(deletingTarget)}
        onOpenChange={(open) => {
          if (!open) setDeletingMemberUid(null);
        }}
        onConfirm={async (uid) => {
          await deleteMember(uid);
          if (editingMemberUid === uid) {
            setEditingMemberUid(null);
          }
        }}
        showToast={showToast}
      />

      {/* Ngăn quản lý phòng ban */}
      <DepartmentsSheet
        open={departmentsOpen}
        onOpenChange={setDepartmentsOpen}
        departments={departments}
        allUsers={allUsers}
        onSaveDepartment={saveDepartment}
        onDeleteDepartment={deleteDepartment}
        showToast={showToast}
      />
    </AdminLayout>
  );
}
