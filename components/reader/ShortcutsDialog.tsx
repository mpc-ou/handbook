"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const t = useTranslations("reader.shortcuts");

  const shortcuts = [
    { keys: ["←", "→"], label: t("prevNext") },
    { keys: ["F"], label: t("focusMode") },
    { keys: ["/", "Ctrl+K"], label: t("search") },
    { keys: ["?"], label: t("help") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-border/60 text-sm">
          {shortcuts.map((row, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-4 py-2.5"
            >
              <span className="text-foreground/90">{row.label}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {row.keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex min-w-[26px] items-center justify-center rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
