"use client";

import React, { useEffect, useState } from "react";
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
import type { UserProfile } from "@/types";

interface DeleteMemberDialogProps {
  member: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (uid: string) => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export function DeleteMemberDialog({
  member,
  open,
  onOpenChange,
  onConfirm,
  showToast,
}: DeleteMemberDialogProps) {
  const t = useTranslations("studioModeration.members.deleteDialog");
  const tc = useTranslations("common");

  const [emailInput, setEmailInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setEmailInput("");
    }
  }, [open, member]);

  if (!member) return null;

  const isEmailMatched =
    emailInput.trim().toLowerCase() === member.email.trim().toLowerCase();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailMatched) return;
    setDeleting(true);
    try {
      await onConfirm(member.uid);
      onOpenChange(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("failed"), "error");
    } finally {
      setDeleting(false);
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

        <form onSubmit={handleDelete} className="space-y-4 py-1">
          <ul className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground list-disc pl-7 leading-relaxed">
            <li>{t("consequenceProgress")}</li>
            <li>{t("consequenceOwnership")}</li>
            <li>{t("consequenceSso")}</li>
          </ul>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-member-email" className="text-xs font-medium">
              {t("confirmEmailLabel", { email: member.email })}
            </Label>
            <Input
              id="confirm-member-email"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={t("confirmEmailPlaceholder")}
              autoComplete="off"
              className="h-9 text-sm font-mono"
            />
          </div>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={deleting}
              className="cursor-pointer"
            >
              {tc("actions.cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={!isEmailMatched || deleting}
              className="cursor-pointer"
            >
              {deleting ? t("deleting") : t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
