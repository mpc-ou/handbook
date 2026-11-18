"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { DepartmentRecord, UserProfile } from "@/types";
import { Edit, Plus, Trash2 } from "lucide-react";

const COLOR_PRESETS = [
  "#f97316",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
];

interface DepartmentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: DepartmentRecord[];
  allUsers: UserProfile[];
  onSaveDepartment: (input: {
    id?: string;
    name: string;
    description?: string | null;
    color?: string | null;
  }) => Promise<DepartmentRecord>;
  onDeleteDepartment: (id: string) => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export function DepartmentsSheet({
  open,
  onOpenChange,
  departments,
  allUsers,
  onSaveDepartment,
  onDeleteDepartment,
  showToast,
}: DepartmentsSheetProps) {
  const t = useTranslations("studioModeration.members.departmentsSheet");
  const tc = useTranslations("common");

  const [formOpen, setFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#f97316");
  const [saving, setSaving] = useState(false);
  const [deletingDept, setDeletingDept] = useState<DepartmentRecord | null>(
    null
  );

  const openCreateForm = () => {
    setEditingDept(null);
    setName("");
    setDescription("");
    setColor("#f97316");
    setFormOpen(true);
  };

  const openEditForm = (dept: DepartmentRecord) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || "");
    setColor(dept.color || "#f97316");
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(t("nameRequired"), "error");
      return;
    }
    setSaving(true);
    try {
      await onSaveDepartment({
        id: editingDept?.id,
        name: name.trim(),
        description: description.trim() || null,
        color,
      });
      setFormOpen(false);
      setEditingDept(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDept) return;
    try {
      await onDeleteDepartment(deletingDept.id);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("deleteFailed"),
        "error"
      );
    } finally {
      setDeletingDept(null);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto flex flex-col gap-0 p-0"
        >
          <SheetHeader className="p-5 border-b border-border">
            <div className="flex items-center justify-between gap-2 pr-6">
              <div>
                <SheetTitle className="text-base">{t("title")}</SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  {t("description")}
                </SheetDescription>
              </div>
              {!formOpen && (
                <Button
                  type="button"
                  size="xs"
                  onClick={openCreateForm}
                  className="cursor-pointer shrink-0"
                >
                  <Plus className="size-3.5" />
                  <span>{t("addButton")}</span>
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="p-5 space-y-4 flex-1">
            {formOpen && (
              <form
                onSubmit={handleSubmit}
                className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3"
              >
                <p className="text-xs font-semibold text-foreground">
                  {editingDept ? t("editTitle") : t("createTitle")}
                </p>

                <div className="space-y-1">
                  <Label className="text-xs">{t("nameLabel")}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{t("descLabel")}</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("descPlaceholder")}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t("colorLabel")}</Label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="size-7 rounded border border-border cursor-pointer p-0.5 bg-background"
                    />
                    <div className="flex items-center gap-1.5">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setColor(preset)}
                          className={cn(
                            "size-5 rounded-full cursor-pointer transition-transform",
                            color === preset
                              ? "ring-2 ring-primary ring-offset-2 scale-110"
                              : "hover:scale-105"
                          )}
                          style={{ backgroundColor: preset }}
                          title={preset}
                          aria-label={preset}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setFormOpen(false);
                      setEditingDept(null);
                    }}
                    disabled={saving}
                    className="cursor-pointer"
                  >
                    {tc("actions.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    size="xs"
                    disabled={saving || !name.trim()}
                    className="cursor-pointer"
                  >
                    {saving ? t("saving") : tc("actions.save")}
                  </Button>
                </div>
              </form>
            )}

            {departments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {t("empty")}
              </p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border bg-card">
                {departments.map((dept) => {
                  const memberCount = allUsers.filter(
                    (u) => u.department === dept.name
                  ).length;

                  return (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: dept.color || "#f97316",
                            }}
                          />
                          <p className="text-sm font-medium text-foreground truncate">
                            {dept.name}
                          </p>
                          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                            · {t("memberCount", { count: memberCount })}
                          </span>
                        </div>
                        {dept.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5 pl-4">
                            {dept.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditForm(dept)}
                          title={t("editAria")}
                          aria-label={t("editAria")}
                          className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          disabled={memberCount > 0}
                          onClick={() => setDeletingDept(dept)}
                          title={
                            memberCount > 0
                              ? t("deleteDisabledHint", { count: memberCount })
                              : t("deleteAria")
                          }
                          aria-label={t("deleteAria")}
                          className={cn(
                            "size-7 cursor-pointer",
                            memberCount > 0
                              ? "opacity-40 cursor-not-allowed text-muted-foreground"
                              : "text-muted-foreground hover:text-destructive"
                          )}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(deletingDept)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeletingDept(null);
        }}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription", {
          name: deletingDept?.name || "",
        })}
        confirmLabel={tc("actions.delete")}
        cancelLabel={tc("actions.cancel")}
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
