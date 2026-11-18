"use client";

import React, { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canDeleteMember, isSuperAdminEmail } from "./permissions";
import type { UserProfile } from "@/types";
import { Edit, Eraser, MoreHorizontal, Trash2 } from "lucide-react";

const PAGE_SIZE = 25;

interface MembersTableProps {
  members: UserProfile[];
  currentUser: UserProfile | null;
  superAdminEmails?: string[];
  onEdit: (member: UserProfile) => void;
  onCleanup: (member: UserProfile) => void;
  onDelete: (member: UserProfile) => void;
}

export function MembersTable({
  members,
  currentUser,
  superAdminEmails,
  onEdit,
  onCleanup,
  onDelete,
}: MembersTableProps) {
  const t = useTranslations("studioModeration.members");
  const tRoles = useTranslations("studioModeration.roles");
  const format = useFormatter();
  const shouldReduceMotion = useReducedMotion();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visibleMembers = useMemo(
    () => members.slice(0, visibleCount),
    [members, visibleCount]
  );

  const remaining = Math.max(0, members.length - visibleMembers.length);

  const formatJoinedDate = (iso?: string) => {
    if (!iso) return t("table.unassigned");
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return t("table.unassigned");
    return format.dateTime(date, { dateStyle: "medium" });
  };

  const renderRoleCell = (member: UserProfile) => {
    if (isSuperAdminEmail(member.email, superAdminEmails)) {
      return (
        <Badge variant="default" className="text-xs font-medium">
          {tRoles("SUPER_ADMIN")}
        </Badge>
      );
    }
    if (member.role === "ADMIN") {
      return (
        <Badge variant="default" className="text-xs font-medium">
          {tRoles("ADMIN")}
        </Badge>
      );
    }
    if (member.role === "EDITOR") {
      return (
        <Badge variant="secondary" className="text-xs font-medium">
          {tRoles("EDITOR")}
        </Badge>
      );
    }
    return (
      <span className="text-xs text-muted-foreground">{tRoles("MEMBER")}</span>
    );
  };

  const renderActionsMenu = (member: UserProfile) => {
    const deletable = canDeleteMember(currentUser, member, superAdminEmails);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={(e) => e.stopPropagation()}
            aria-label={t("rowActions.openMenu")}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuItem onSelect={() => onEdit(member)}>
            <Edit className="size-3.5" />
            <span>{t("rowActions.edit")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onCleanup(member)}>
            <Eraser className="size-3.5" />
            <span>{t("rowActions.cleanup")}</span>
          </DropdownMenuItem>
          {deletable && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onDelete(member)}
              >
                <Trash2 className="size-3.5" />
                <span>{t("rowActions.delete")}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="space-y-3"
    >
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.member")}</TableHead>
              <TableHead>{t("table.role")}</TableHead>
              <TableHead>{t("table.department")}</TableHead>
              <TableHead>{t("table.assignedCourses")}</TableHead>
              <TableHead>{t("table.joinedAt")}</TableHead>
              <TableHead className="w-12 text-right">
                <span className="sr-only">{t("table.actionsSr")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleMembers.map((member) => {
              const isSelf = currentUser?.uid === member.uid;
              const assignedCount = member.managedCourseIds?.length || 0;

              return (
                <TableRow
                  key={member.uid}
                  onClick={() => onEdit(member)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <Avatar className="size-8 shrink-0">
                        {member.avatarUrl && (
                          <AvatarImage
                            src={member.avatarUrl}
                            alt={member.fullName}
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {member.fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-foreground truncate">
                            {member.fullName}
                          </p>
                          {isSelf && (
                            <span className="text-[11px] text-muted-foreground">
                              ({t("table.youBadge")})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{renderRoleCell(member)}</TableCell>
                  <TableCell>
                    <span className="text-xs text-foreground">
                      {member.department || t("table.unassigned")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {member.role === "EDITOR" ? (
                      <span className="text-xs font-mono tabular-nums text-foreground">
                        {t("table.coursesCount", { count: assignedCount })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("table.unassigned")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatJoinedDate(member.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {renderActionsMenu(member)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-2">
        {visibleMembers.map((member) => {
          const isSelf = currentUser?.uid === member.uid;
          const assignedCount = member.managedCourseIds?.length || 0;

          return (
            <div
              key={member.uid}
              onClick={() => onEdit(member)}
              className="rounded-xl border border-border bg-card p-3.5 flex items-start justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <Avatar className="size-9 shrink-0 mt-0.5">
                  {member.avatarUrl && (
                    <AvatarImage
                      src={member.avatarUrl}
                      alt={member.fullName}
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {member.fullName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.fullName}
                    </p>
                    {isSelf && (
                      <span className="text-[11px] text-muted-foreground">
                        ({t("table.youBadge")})
                      </span>
                    )}
                    {renderRoleCell(member)}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.email}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground pt-0.5">
                    <span>{member.department || t("table.unassigned")}</span>
                    {member.role === "EDITOR" && (
                      <>
                        <span>·</span>
                        <span className="font-mono tabular-nums">
                          {t("table.coursesCount", { count: assignedCount })}
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span className="tabular-nums">
                      {formatJoinedDate(member.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="shrink-0">{renderActionsMenu(member)}</div>
            </div>
          );
        })}
      </div>

      {/* Pagination / Show More */}
      {remaining > 0 && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="cursor-pointer text-xs"
          >
            {t("table.loadMore", { remaining })}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
