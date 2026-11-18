"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CoverImagePicker } from "@/components/editor/CoverImagePicker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { LessonInput } from "@/context/HandbookContext";
import { isSequential } from "@/lib/progression";
import { slugify } from "@/lib/seed-data";
import type { CourseRecord, LessonRecord } from "@/types";
import { FolderOpen, Lock, LockOpen } from "lucide-react";

type SequentialChoice = "inherit" | "true" | "false";

function toChoice(val: boolean | null | undefined): SequentialChoice {
  if (val === true) return "true";
  if (val === false) return "false";
  return "inherit";
}

function fromChoice(choice: SequentialChoice): boolean | null {
  if (choice === "true") return true;
  if (choice === "false") return false;
  return null;
}

interface LessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseRecord | null;
  editingLesson: LessonRecord | null;
  onSave: (input: LessonInput) => Promise<LessonRecord>;
  showToast: (text: string, type?: "success" | "error" | "info") => void;
}

export function LessonDialog({
  open,
  onOpenChange,
  course,
  editingLesson,
  onSave,
  showToast,
}: LessonDialogProps) {
  const t = useTranslations("studio.curriculum.lessonDialog");
  const tSeq = useTranslations("studio.curriculum.sequential");
  const tCommon = useTranslations("common");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [summary, setSummary] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [requirePrevChoice, setRequirePrevChoice] =
    useState<SequentialChoice>("inherit");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingLesson) {
      setTitle(editingLesson.title);
      setSlug(editingLesson.slug);
      setSlugTouched(true);
      setSummary(editingLesson.summary || "");
      setCoverImage(editingLesson.coverImage || "");
      setIsPublished(editingLesson.isPublished);
      setRequirePrevChoice(toChoice(editingLesson.requirePrevious));
    } else {
      setTitle("");
      setSlug("");
      setSlugTouched(false);
      setSummary("");
      setCoverImage("");
      setIsPublished(true);
      setRequirePrevChoice("inherit");
    }
  }, [open, editingLesson]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugTouched) {
      setSlug(slugify(val));
    }
  };

  const requirePreviousVal = fromChoice(requirePrevChoice);
  const effectiveSequential = course
    ? isSequential(
        course,
        { requirePrevious: requirePreviousVal },
        { requirePrevious: null }
      )
    : requirePreviousVal ?? true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCourseId = editingLesson?.courseId || course?.id;
    if (!targetCourseId) {
      showToast(t("courseMissing"), "error");
      return;
    }

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
        id: editingLesson?.id,
        courseId: targetCourseId,
        title: title.trim(),
        slug: finalSlug,
        summary: summary.trim(),
        coverImage: coverImage || "",
        isPublished,
        requirePrevious: requirePreviousVal,
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="size-4 text-primary" />
            <span>
              {editingLesson ? t("editTitle") : t("createTitle")}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            {course
              ? t("descriptionWithCourse", { courseTitle: course.title })
              : t("description")}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto space-y-4 pr-1 py-2"
        >
          {/* Ảnh bìa bài học */}
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
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Thứ tự học 3 trạng thái & Hiển thị */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {t("sequentialField")}
              </Label>
              <Select
                value={requirePrevChoice}
                onValueChange={(val) =>
                  setRequirePrevChoice(val as SequentialChoice)
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">{tSeq("inherit")}</SelectItem>
                  <SelectItem value="true">{tSeq("locked")}</SelectItem>
                  <SelectItem value="false">{tSeq("free")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                {effectiveSequential ? (
                  <>
                    <Lock className="size-3 text-primary shrink-0" />
                    <span>{tSeq("effectiveLocked")}</span>
                  </>
                ) : (
                  <>
                    <LockOpen className="size-3 text-muted-foreground shrink-0" />
                    <span>{tSeq("effectiveFree")}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-xs font-semibold cursor-pointer">
                  {t("publishField")}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {isPublished ? t("publishedHint") : t("hiddenHint")}
                </p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
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
                : editingLesson
                ? tCommon("actions.save")
                : t("createButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
