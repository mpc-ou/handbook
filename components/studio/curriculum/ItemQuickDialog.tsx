"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import type { ItemInput } from "@/context/HandbookContext";
import type {
  CourseRecord,
  ItemRecord,
  ItemType,
  LessonRecord,
} from "@/types";
import {
  ArrowRightLeft,
  BookOpen,
  ClipboardCheck,
  FileEdit,
  HelpCircle,
  Plus,
} from "lucide-react";

interface ItemQuickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: LessonRecord | null;
  courseTitle?: string;
  onSave: (input: ItemInput) => Promise<ItemRecord>;
  showToast: (text: string, type?: "success" | "error" | "info") => void;
}

const ITEM_TYPE_ICONS: Record<
  ItemType,
  React.ComponentType<{ className?: string }>
> = {
  CONTENT: BookOpen,
  QUIZ: HelpCircle,
  ASSIGNMENT: ClipboardCheck,
};

const ITEM_TYPES: ItemType[] = ["CONTENT", "QUIZ", "ASSIGNMENT"];

export function ItemQuickDialog({
  open,
  onOpenChange,
  lesson,
  courseTitle,
  onSave,
  showToast,
}: ItemQuickDialogProps) {
  const router = useRouter();
  const t = useTranslations("studio.curriculum.itemQuickDialog");
  const tCommon = useTranslations("common");

  const [title, setTitle] = useState("");
  const [type, setType] = useState<ItemType>("CONTENT");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setType("CONTENT");
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) {
      showToast(t("lessonMissing"), "error");
      return;
    }
    if (!title.trim()) {
      showToast(t("titleRequired"), "error");
      return;
    }

    setSubmitting(true);
    try {
      const created = await onSave({
        lessonId: lesson.id,
        title: title.trim(),
        type,
        status: "DRAFT",
      });
      onOpenChange(false);
      router.push(`/studio/items/${created.id}`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("createFailed"),
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4 text-primary" />
            <span>{t("title")}</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            {lesson
              ? courseTitle
                ? t("descriptionWithCourse", {
                    lessonTitle: lesson.title,
                    courseTitle,
                  })
                : t("descriptionWithLesson", { lessonTitle: lesson.title })
              : t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {t("typeField")} <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {ITEM_TYPES.map((itemType) => {
                const Icon = ITEM_TYPE_ICONS[itemType];
                const active = type === itemType;
                return (
                  <button
                    key={itemType}
                    type="button"
                    onClick={() => setType(itemType)}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {t(`types.${itemType}.label`)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(`types.${itemType}.description`)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              {t("titleField")} <span className="text-destructive">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t(`types.${type}.placeholder`)}
              autoFocus
              className="h-9 text-sm"
            />
          </div>

          <DialogFooter className="pt-1">
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
              <FileEdit className="size-3.5 mr-1.5" />
              <span>
                {submitting ? tCommon("actions.loading") : t("submitButton")}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MoveItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemRecord | null;
  courses: CourseRecord[];
  lessons: LessonRecord[];
  onMove: (item: ItemRecord, targetLessonId: string) => Promise<void>;
  showToast: (text: string, type?: "success" | "error" | "info") => void;
}

export function MoveItemDialog({
  open,
  onOpenChange,
  item,
  courses,
  lessons,
  onMove,
  showToast,
}: MoveItemDialogProps) {
  const t = useTranslations("studio.curriculum.moveItemDialog");
  const tCommon = useTranslations("common");

  const [targetLessonId, setTargetLessonId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setTargetLessonId(item.lessonId);
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!targetLessonId) {
      showToast(t("targetRequired"), "error");
      return;
    }
    if (targetLessonId === item.lessonId) {
      onOpenChange(false);
      return;
    }

    setSubmitting(true);
    try {
      await onMove(item, targetLessonId);
      onOpenChange(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("moveFailed"),
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="size-4 text-primary" />
            <span>{t("title")}</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            {item
              ? t("descriptionWithItem", { title: item.title })
              : t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("targetField")}</Label>
            <Select value={targetLessonId} onValueChange={setTargetLessonId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={t("targetPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => {
                  const courseLessons = lessons
                    .filter((l) => l.courseId === course.id)
                    .sort((a, b) => a.orderIndex - b.orderIndex);
                  if (courseLessons.length === 0) return null;

                  return courseLessons.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {course.title} › {l.title}
                      {l.id === item?.lessonId ? ` (${t("currentTag")})` : ""}
                    </SelectItem>
                  ));
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
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
              disabled={submitting || !targetLessonId}
              className="cursor-pointer"
            >
              {submitting ? tCommon("actions.loading") : t("submitButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
