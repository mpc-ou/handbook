"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { Flame } from "lucide-react";
import { useHandbook } from "@/context/HandbookContext";
import { computeStreak } from "@/lib/gamification";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function StreakChip() {
  const { user, progressMap } = useHandbook();
  const t = useTranslations("profile.streak");
  const reduceMotion = useReducedMotion();

  const streak = useMemo(
    () => computeStreak(Object.values(progressMap)),
    [progressMap]
  );

  const prevCountRef = useRef<number>(streak.current);
  const [bumpKey, setBumpKey] = useState(0);

  useEffect(() => {
    if (streak.current > prevCountRef.current) {
      setBumpKey((k) => k + 1);
    }
    prevCountRef.current = streak.current;
  }, [streak.current]);

  if (!user) return null;
  if (streak.current === 0 && streak.activeDays.length === 0) return null;

  const isActive = streak.activeToday;
  const tooltipText = isActive
    ? t("activeTooltip", { count: streak.current })
    : t("keepStreakTooltip");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/profile"
          aria-label={t("chipAriaLabel", { count: streak.current })}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold tabular-nums transition-colors",
            isActive
              ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
              : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
          )}
        >
          <Flame
            className={cn(
              "size-3.5 shrink-0 transition-colors",
              isActive
                ? "text-primary fill-primary/25"
                : "text-muted-foreground"
            )}
          />
          <motion.span
            key={bumpKey}
            initial={
              reduceMotion || bumpKey === 0 ? false : { scale: 1.3, y: -2 }
            }
            animate={{ scale: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 360, damping: 16 }
            }
          >
            {streak.current}
          </motion.span>
        </Link>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
