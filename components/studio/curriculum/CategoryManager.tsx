"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/seed-data";
import type { CategoryRecord, CourseRecord } from "@/types";
import { Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryRecord[];
  courses: CourseRecord[];
  isAdmin: boolean;
  onCreate: (input: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
  }) => Promise<CategoryRecord>;
  onUpdate: (id: string, patch: Partial<CategoryRecord>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showToast: (text: string, type?: "success" | "error" | "info") => void;
}

export function CategoryManager({
  open,
  onOpenChange,
  categories,
  courses,
  isAdmin,
  onCreate,
  onUpdate,
  onDelete,
  showToast,
}: CategoryManagerProps) {
  const t = useTranslations("studio.curriculum.categoryManager");
  const tCommon = useTranslations("common");

  const [editingCat, setEditingCat] = useState<CategoryRecord | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRecord | null>(null);

  const courseCountByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of courses) {
      for (const catId of c.categoryIds || []) {
        map.set(catId, (map.get(catId) || 0) + 1);
      }
    }
    return map;
  }, [courses]);

  const resetForm = () => {
    setEditingCat(null);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
  };

  const handleStartEdit = (cat: CategoryRecord) => {
    setEditingCat(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setSlugTouched(true);
    setDescription(cat.description || "");
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugTouched) {
      setSlug(slugify(val));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(t("nameRequired"), "error");
      return;
    }

    const finalSlug = slug.trim() || slugify(name.trim());
    setSubmitting(true);
    try {
      if (editingCat) {
        await onUpdate(editingCat.id, {
          name: name.trim(),
          slug: finalSlug,
          description: description.trim(),
        });
      } else {
        await onCreate({
          name: name.trim(),
          slug: finalSlug,
          description: description.trim(),
        });
      }
      resetForm();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("saveFailed"),
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.orderIndex - b.orderIndex),
    [categories]
  );

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (!val) resetForm();
          onOpenChange(val);
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Tag className="size-4 text-primary" />
              <span>{t("title")}</span>
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t("description")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
            {isAdmin ? (
              <form
                onSubmit={handleSave}
                className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {editingCat
                      ? t("editingLabel", { name: editingCat.name })
                      : t("addLabel")}
                  </span>
                  {editingCat && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={resetForm}
                      className="cursor-pointer h-6 px-2 text-xs"
                    >
                      <X className="size-3 mr-1" />
                      <span>{tCommon("actions.cancel")}</span>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">
                      {t("nameField")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder={t("namePlaceholder")}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">{t("slugField")}</Label>
                    <Input
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(slugify(e.target.value));
                      }}
                      placeholder={t("slugPlaceholder")}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    {t("descriptionField")}
                  </Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="xs"
                    disabled={submitting}
                    className="cursor-pointer"
                  >
                    {editingCat ? (
                      <>
                        <Check className="size-3.5 mr-1" />
                        <span>{tCommon("actions.save")}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5 mr-1" />
                        <span>{t("createButton")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {t("adminOnlyHint")}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("listHeading", { count: sortedCategories.length })}
                </span>
              </div>

              {sortedCategories.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                  {t("empty")}
                </div>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
                  {sortedCategories.map((cat) => {
                    const count = courseCountByCat.get(cat.id) || 0;
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-muted/20 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">
                              {cat.name}
                            </span>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              #{cat.slug}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[11px] font-mono px-1.5 py-0 h-4"
                            >
                              {t("courseCount", { count })}
                            </Badge>
                          </div>
                          {cat.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {cat.description}
                            </p>
                          )}
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleStartEdit(cat)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                              title={tCommon("actions.edit")}
                              aria-label={tCommon("actions.edit")}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteTarget(cat)}
                              className="text-muted-foreground hover:text-destructive cursor-pointer"
                              title={tCommon("actions.delete")}
                              aria-label={tCommon("actions.delete")}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              {tCommon("actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(val) => {
          if (!val) setDeleteTarget(null);
        }}
        title={t("deleteTitle")}
        description={
          deleteTarget
            ? t("deleteDescription", {
                name: deleteTarget.name,
                count: courseCountByCat.get(deleteTarget.id) || 0,
              })
            : ""
        }
        confirmLabel={tCommon("actions.delete")}
        cancelLabel={tCommon("actions.cancel")}
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await onDelete(deleteTarget.id);
            if (editingCat?.id === deleteTarget.id) {
              resetForm();
            }
          } catch (err) {
            showToast(
              err instanceof Error ? err.message : t("deleteFailed"),
              "error"
            );
          } finally {
            setDeleteTarget(null);
          }
        }}
      />
    </>
  );
}
