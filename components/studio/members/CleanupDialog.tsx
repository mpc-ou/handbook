"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CourseRecord, UserProfile } from "@/types";

export type CleanupActionType = "progress" | "attempts" | "comments";

interface CleanupDialogProps {
  member: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: CourseRecord[];
  onConfirm: (
    uid: string,
    actions: CleanupActionType[],
    courseId?: string | null
  ) => Promise<{ progress: number; attempts: number; comments: number }>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export function CleanupDialog({
  member,
  open,
  onOpenChange,
  courses,
  onConfirm,
  showToast,
}: CleanupDialogProps) {
  const t = useTranslations("studioModeration.members.cleanupDialog");
  const tc = useTranslations("common");

  const [scope, setScope] = useState<string>("ALL");
  const [selectedActions, setSelectedActions] = useState<CleanupActionType[]>([
    "progress",
    "attempts",
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setScope("ALL");
      setSelectedActions(["progress", "attempts"]);
    }
  }, [open, member]);

  if (!member) return null;

  const toggleAction = (action: CleanupActionType, checked: boolean) => {
    setSelectedActions((prev) =>
      checked
        ? prev.includes(action)
          ? prev
          : [...prev, action]
        : prev.filter((a) => a !== action)
    );
  };

  const handleConfirm = async () => {
    if (selectedActions.length === 0) return;
    setSubmitting(true);
    try {
      await onConfirm(
        member.uid,
        selectedActions,
        scope === "ALL" ? null : scope
      );
      onOpenChange(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("failed"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", {
              name: member.fullName,
              email: member.email,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("scopeLabel")}</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allCourses")}</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">{t("dataTypesLabel")}</Label>
            <div className="space-y-2.5 rounded-lg border border-border p-3">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <Checkbox
                  checked={selectedActions.includes("progress")}
                  onCheckedChange={(val) =>
                    toggleAction("progress", Boolean(val))
                  }
                />
                <span>{t("typeProgress")}</span>
              </label>

              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <Checkbox
                  checked={selectedActions.includes("attempts")}
                  onCheckedChange={(val) =>
                    toggleAction("attempts", Boolean(val))
                  }
                />
                <span>{t("typeAttempts")}</span>
              </label>

              <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                <Checkbox
                  checked={selectedActions.includes("comments")}
                  onCheckedChange={(val) =>
                    toggleAction("comments", Boolean(val))
                  }
                />
                <span>{t("typeComments")}</span>
              </label>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("consequenceNote")}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="cursor-pointer"
          >
            {tc("actions.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={selectedActions.length === 0 || submitting}
            onClick={handleConfirm}
            className="cursor-pointer"
          >
            {submitting ? t("deleting") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
