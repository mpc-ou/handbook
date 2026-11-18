"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ProgressBar } from "@/components/ui/animated-progress";

interface ReadingProgressBarProps {
  value: number;
}

export function ReadingProgressBar({ value }: ReadingProgressBarProps) {
  const t = useTranslations("reader");

  return (
    <div className="sticky top-14 z-30 w-full">
      <ProgressBar
        value={value}
        label={t("progressBarLabel")}
        heightClassName="h-0.5"
        className="rounded-none bg-border/40"
        barClassName="rounded-none"
      />
    </div>
  );
}
