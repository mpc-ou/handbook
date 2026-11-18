"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SlidersHorizontal } from "lucide-react";

export type ReaderFontSize = "sm" | "md" | "lg";
export type ReaderColumnWidth = "sm" | "md" | "lg";

export interface ReaderPrefs {
  fontSize: ReaderFontSize;
  columnWidth: ReaderColumnWidth;
}

export const READER_PREFS_STORAGE_KEY = "mpc_reader_prefs";
export const FOCUS_MODE_STORAGE_KEY = "mpc_focus_mode";

export const DEFAULT_READER_PREFS: ReaderPrefs = {
  fontSize: "md",
  columnWidth: "md",
};

interface ReadingSettingsProps {
  prefs: ReaderPrefs;
  onChange: (next: ReaderPrefs) => void;
}

export function ReadingSettings({ prefs, onChange }: ReadingSettingsProps) {
  const t = useTranslations("reader.settings");

  const fontSizes: { value: ReaderFontSize; label: string }[] = [
    { value: "sm", label: t("fontSizeSm") },
    { value: "md", label: t("fontSizeMd") },
    { value: "lg", label: t("fontSizeLg") },
  ];

  const columnWidths: { value: ReaderColumnWidth; label: string }[] = [
    { value: "sm", label: t("widthSm") },
    { value: "md", label: t("widthMd") },
    { value: "lg", label: t("widthLg") },
  ];

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-label={t("tooltip")}
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden sm:inline">{t("trigger")}</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("tooltip")}</TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-60 space-y-4 p-3.5">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {t("fontSize")}
          </span>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
            {fontSizes.map((opt) => {
              const active = prefs.fontSize === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...prefs, fontSize: opt.value })}
                  className={cn(
                    "h-7 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    active
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {t("columnWidth")}
          </span>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
            {columnWidths.map((opt) => {
              const active = prefs.columnWidth === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...prefs, columnWidth: opt.value })}
                  className={cn(
                    "h-7 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    active
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
