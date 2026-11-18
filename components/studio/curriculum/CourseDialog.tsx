"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CoverImagePicker } from "@/components/editor/CoverImagePicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CourseInput } from "@/context/HandbookContext";
import { slugify } from "@/lib/seed-data";
import type {
  CategoryRecord,
  ContentAudience,
  ContentStatus,
  CourseRecord,
  DepartmentRecord,
} from "@/types";
import { BookOpen, Globe, Lock, Shield, Users } from "lucide-react";

interface CourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCourse: CourseRecord | null;
  categories: CategoryRecord[];
  departments: DepartmentRecord[];
  isAdmin: boolean;
  onSave: (input: CourseInput) => Promise<CourseRecord>;
  showToast: (text: string, type?: "success" | "error" | "info") => void;
}

export function CourseDialog({
  open,
  onOpenChange,
  editingCourse,
  categories,
  departments,
  isAdmin,
  onSave,
  showToast,
}: CourseDialogProps) {
  const t = useTranslations("studio.curriculum.courseDialog");
  const tCommon = useTranslations("common");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [summary, setSummary] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [sequential, setSequential] = useState(true);
  const [audience, setAudience] = useState<ContentAudience>("FREE");
  const [allowedGroups, setAllowedGroups] = useState<string[]>([]);
  const [status, setStatus] = useState<ContentStatus>("DRAFT");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingCourse) {
      setTitle(editingCourse.title);
      setSlug(editingCourse.slug);
      setSlugTouched(true);
      setSummary(editingCourse.summary || "");
      setCoverImage(editingCourse.coverImage || "");
      setCategoryIds([...(editingCourse.categoryIds || [])]);
      setSequential(editingCourse.sequential);
      setAudience(editingCourse.audience || "FREE");
      setAllowedGroups([...(editingCourse.allowedGroups || [])]);
      setStatus(
        !isAdmin && editingCourse.status === "PUBLISHED"
          ? "PENDING_REVIEW"
          : editingCourse.status
      );
    } else {
      setTitle("");
      setSlug("");
      setSlugTouched(false);
      setSummary("");
      setCoverImage("");
      setCategoryIds([]);
      setSequential(true);
      setAudience("FREE");
      setAllowedGroups([]);
      setStatus("DRAFT");
    }
  }, [open, editingCourse, isAdmin]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugTouched) {
      setSlug(slugify(val));
    }
  };

  const toggleCategory = (catId: string) => {
    setCategoryIds((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId]
    );
  };

  const toggleDepartment = (deptName: string) => {
    setAllowedGroups((prev) =>
      prev.includes(deptName)
        ? prev.filter((name) => name !== deptName)
        : [...prev, deptName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast(t("titleRequired"), "error");
      return;
    }

    const finalSlug = slug.trim() || slugify(title.trim());
    if (!finalSlug) {
      showToast(t("invalidSlug"), "error");
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        id: editingCourse?.id,
        title: title.trim(),
        slug: finalSlug,
        summary: summary.trim(),
        coverImage: coverImage || "",
        categoryIds,
        sequential,
        audience,
        allowedGroups: audience === "INTERNAL" ? allowedGroups : [],
        status: !isAdmin && status === "PUBLISHED" ? "PENDING_REVIEW" : status,
      });
      onOpenChange(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("saveFailed"),
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-primary" />
            <span>
              {editingCourse ? t("editTitle") : t("createTitle")}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto space-y-4 pr-1 py-2"
        >
          {/* Ảnh bìa khóa học */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("coverField")}</Label>
            <CoverImagePicker
              value={coverImage}
              title={title || t("defaultCoverTitle")}
              onChange={setCoverImage}
            />
          </div>

          {/* Tên & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {t("titleField")} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={t("titlePlaceholder")}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">{t("slugField")}</Label>
                {slugTouched && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlugTouched(false);
                      setSlug(slugify(title));
                    }}
                    className="text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    {t("regenerateSlug")}
                  </button>
                )}
              </div>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder={t("slugPlaceholder")}
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>

          {/* Tóm tắt */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("summaryField")}</Label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t("summaryPlaceholder")}
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Chọn nhiều Danh mục */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                {t("categoriesField", { count: categoryIds.length })}
              </Label>
            </div>
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3">
                {t("categoriesEmpty")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/15 p-3">
                {categories.map((cat) => {
                  const selected = categoryIds.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer select-none ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      <span>{cat.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Thứ tự học & Trạng thái */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Lock className="size-3.5 text-primary shrink-0" />
                  <Label className="text-xs font-semibold cursor-pointer">
                    {t("sequentialField")}
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t("sequentialHint")}
                </p>
              </div>
              <Switch checked={sequential} onCheckedChange={setSequential} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("statusField")}</Label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as ContentStatus)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t("statusField")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">
                    {tCommon("status.DRAFT")}
                  </SelectItem>
                  <SelectItem value="PENDING_REVIEW">
                    {tCommon("status.PENDING_REVIEW")}
                  </SelectItem>
                  {isAdmin && (
                    <SelectItem value="PUBLISHED">
                      {tCommon("status.PUBLISHED")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Đối tượng xem & Phân quyền ban/nhóm */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  {audience === "FREE" ? (
                    <Globe className="size-3.5 text-emerald-500" />
                  ) : (
                    <Shield className="size-3.5 text-primary" />
                  )}
                  <span>{t("audienceField")}</span>
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {audience === "FREE"
                    ? t("audienceFreeHint")
                    : t("audienceInternalHint")}
                </p>
              </div>

              <Select
                value={audience}
                onValueChange={(val) => setAudience(val as ContentAudience)}
              >
                <SelectTrigger className="h-9 text-sm bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">{t("audienceFree")}</SelectItem>
                  <SelectItem value="INTERNAL">
                    {t("audienceInternal")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {audience === "INTERNAL" && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Users className="size-3.5 text-muted-foreground" />
                    <span>{t("allowedGroupsField")}</span>
                  </Label>
                  {allowedGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAllowedGroups([])}
                      className="text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      {t("clearGroups")}
                    </button>
                  )}
                </div>

                {departments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("departmentsEmpty")}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {departments.map((dept) => {
                      const checked = allowedGroups.includes(dept.name);
                      return (
                        <label
                          key={dept.id}
                          className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer select-none ${
                            checked
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-foreground hover:border-primary/40"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleDepartment(dept.name)}
                          />
                          <span>{dept.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="cursor-pointer"
            >
              {submitting
                ? tCommon("actions.loading")
                : editingCourse
                ? tCommon("actions.save")
                : t("createButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
