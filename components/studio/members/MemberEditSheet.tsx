"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  canAssignAdminRole,
  canEditMember,
  isSuperAdminEmail,
} from "./permissions";
import type {
  CourseRecord,
  DepartmentRecord,
  Role,
  UserProfile,
} from "@/types";
import { Search } from "lucide-react";

const UNASSIGNED_DEPT_VALUE = "__UNASSIGNED__";

interface MemberEditSheetProps {
  member: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: UserProfile | null;
  superAdminEmails?: string[];
  departments: DepartmentRecord[];
  courses: CourseRecord[];
  onSave: (
    uid: string,
    role: Role,
    department: string,
    managedCourseIds: string[],
    managedGroups: string[]
  ) => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export function MemberEditSheet({
  member,
  open,
  onOpenChange,
  currentUser,
  superAdminEmails,
  departments,
  courses,
  onSave,
  showToast,
}: MemberEditSheetProps) {
  const t = useTranslations("studioModeration.members.editSheet");
  const tRoles = useTranslations("studioModeration.roles");
  const tc = useTranslations("common");

  const [role, setRole] = useState<Role>("MEMBER");
  const [department, setDepartment] = useState<string>(UNASSIGNED_DEPT_VALUE);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [managedGroups, setManagedGroups] = useState<string[]>([]);
  const [courseSearch, setCourseSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const departmentNames = useMemo(
    () => departments.map((d) => d.name),
    [departments]
  );

  useEffect(() => {
    if (member) {
      setRole(member.role);
      setDepartment(member.department || UNASSIGNED_DEPT_VALUE);
      setCourseIds(member.managedCourseIds || []);
      setManagedGroups(member.managedGroups || []);
      setCourseSearch("");
    }
  }, [member]);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => a.orderIndex - b.orderIndex),
    [courses]
  );

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return sortedCourses;
    return sortedCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    );
  }, [sortedCourses, courseSearch]);

  if (!member) return null;

  const isTargetSuper = isSuperAdminEmail(member.email, superAdminEmails);
  const canEdit = canEditMember(currentUser, member, superAdminEmails);
  const canPickAdmin =
    canAssignAdminRole(currentUser, superAdminEmails) ||
    member.role === "ADMIN";

  const toggleCourse = (id: string) => {
    setCourseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleManagedGroup = (groupName: string, checked: boolean) => {
    setManagedGroups((prev) =>
      checked
        ? prev.includes(groupName)
          ? prev
          : [...prev, groupName]
        : prev.filter((g) => g !== groupName)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      const resolvedDept =
        department === UNASSIGNED_DEPT_VALUE ? "" : department;
      await onSave(
        member.uid,
        role,
        resolvedDept,
        role === "EDITOR" ? courseIds : [],
        managedGroups
      );
      onOpenChange(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("saveFailed"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0"
      >
        <SheetHeader className="p-5 border-b border-border">
          <div className="flex items-center gap-3 pr-6">
            <Avatar className="size-10 shrink-0">
              {member.avatarUrl && (
                <AvatarImage
                  src={member.avatarUrl}
                  alt={member.fullName}
                  referrerPolicy="no-referrer"
                />
              )}
              <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                {member.fullName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <SheetTitle className="text-base truncate">
                {member.fullName}
              </SheetTitle>
              <SheetDescription className="text-xs truncate">
                {member.email}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col justify-between"
        >
          <div className="p-5 space-y-5">
            {isTargetSuper && (
              <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                {t("superAdminNotice")}
              </div>
            )}

            {!canEdit && !isTargetSuper && (
              <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                {t("adminProtectedNotice")}
              </div>
            )}

            {/* Vai trò */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("roleLabel")}</Label>
              <Select
                value={role}
                onValueChange={(val) => setRole(val as Role)}
                disabled={!canEdit || isTargetSuper}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t("rolePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">
                    {tRoles("MEMBER_DESC")}
                  </SelectItem>
                  <SelectItem value="EDITOR">
                    {tRoles("EDITOR_DESC")}
                  </SelectItem>
                  {canPickAdmin && (
                    <SelectItem value="ADMIN">
                      {tRoles("ADMIN_DESC")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Phòng ban */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {t("departmentLabel")}
              </Label>
              <Select
                value={department}
                onValueChange={setDepartment}
                disabled={!canEdit}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t("departmentPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_DEPT_VALUE}>
                    {t("noDepartment")}
                  </SelectItem>
                  {departmentNames.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nhóm được quản lý / xem nội dung nội bộ */}
            {departmentNames.length > 0 && (
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">
                    {t("managedGroupsLabel")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("managedGroupsHint")}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-border p-3">
                  {departmentNames.map((dept) => {
                    const checked = managedGroups.includes(dept);
                    return (
                      <label
                        key={dept}
                        className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={!canEdit}
                          onCheckedChange={(val) =>
                            toggleManagedGroup(dept, Boolean(val))
                          }
                        />
                        <span className="truncate">{dept}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Khóa học được giao (chỉ khi vai trò là EDITOR) */}
            {role === "EDITOR" && (
              <div className="space-y-2.5">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">
                    {t("assignedCoursesLabel", { count: courseIds.length })}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("assignedCoursesHint")}
                  </p>
                </div>

                {sortedCourses.length > 0 ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        placeholder={t("searchCoursesPlaceholder")}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>

                    {filteredCourses.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                        {filteredCourses.map((course) => {
                          const checked = courseIds.includes(course.id);
                          return (
                            <label
                              key={course.id}
                              className="flex items-center justify-between gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/30"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {course.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground font-mono truncate">
                                  /learn/{course.slug}
                                </p>
                              </div>
                              <Checkbox
                                checked={checked}
                                disabled={!canEdit}
                                onCheckedChange={() => toggleCourse(course.id)}
                              />
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-2">
                        {t("noCoursesMatch")}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    {t("noCourses")}
                  </p>
                )}
              </div>
            )}
          </div>

          <SheetFooter className="p-4 border-t border-border flex-row justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="cursor-pointer"
            >
              {tc("actions.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!canEdit || saving}
              className="cursor-pointer"
            >
              {saving ? t("saving") : tc("actions.save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
