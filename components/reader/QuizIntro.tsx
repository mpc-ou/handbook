"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { ContentBlock, ItemAttachment, ItemType } from "@/types";
import { ArticleRenderer } from "@/components/reader/ArticleRenderer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Clock,
  FileUp,
  ClipboardCheck,
  LogIn,
} from "lucide-react";

interface QuizIntroProps {
  title: string;
  summary?: string;
  type: ItemType;
  content: ContentBlock[];
  attachments: ItemAttachment[];
  questionsCount: number;
  durationMinutes?: number;
  passScorePercent: number;
  maxAttempts?: number;
  attemptsUsed: number;
  highestScore: number;
  hasPendingReview?: boolean;
  isGuest: boolean;
  onSignIn: () => void;
  onStart: () => void;
}

export function QuizIntro({
  title,
  summary,
  type,
  content,
  attachments,
  questionsCount,
  durationMinutes = 0,
  passScorePercent,
  maxAttempts = 0,
  attemptsUsed,
  highestScore,
  hasPendingReview = false,
  isGuest,
  onSignIn,
  onStart,
}: QuizIntroProps) {
  const t = useTranslations("quiz.intro");
  const tCommon = useTranslations("common");

  const hasInstructions =
    (content && content.length > 0) || (attachments && attachments.length > 0);
  const attemptsRemaining =
    maxAttempts > 0 ? Math.max(0, maxAttempts - attemptsUsed) : null;
  const isOutOfAttempts =
    !isGuest && maxAttempts > 0 && attemptsUsed >= maxAttempts;

  const TypeIcon = type === "ASSIGNMENT" ? FileUp : ClipboardCheck;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-3 border-b border-border/60 pb-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 text-xs font-medium">
            <TypeIcon className="size-3.5 text-primary" />
            <span>{tCommon(`itemType.${type}`)}</span>
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-balance">
          {title}
        </h1>

        {summary && (
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {summary}
          </p>
        )}
      </header>

      {/* Instructions / Content if present */}
      {hasInstructions && (
        <div className="pb-2">
          <ArticleRenderer blocks={content} attachments={attachments} />
        </div>
      )}

      {/* Compact Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">
            {t("questionsLabel")}
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {t("questionsValue", { count: questionsCount })}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">
            {t("durationLabel")}
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums inline-flex items-center gap-1">
            {durationMinutes > 0 ? (
              <>
                <Clock className="size-3.5 text-primary" />
                <span>{t("durationValue", { minutes: durationMinutes })}</span>
              </>
            ) : (
              <span>{t("noTimeLimit")}</span>
            )}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">
            {t("passScoreLabel")}
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {passScorePercent}%
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">
            {maxAttempts > 0 ? t("attemptsLabel") : t("bestScoreLabel")}
          </span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {maxAttempts > 0
              ? t("attemptsLimited", {
                  remaining: attemptsRemaining ?? 0,
                  max: maxAttempts,
                })
              : highestScore > 0
              ? `${highestScore}%`
              : t("noScoreYet")}
          </span>
        </div>
      </div>

      {/* Secondary Best Score if maxAttempts > 0 and user has a score */}
      {maxAttempts > 0 && highestScore > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("bestScoreLabel")}:{" "}
          <strong className="font-mono text-foreground">{highestScore}%</strong>
        </p>
      )}

      {/* Pending review notice */}
      {hasPendingReview && (
        <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          {t("pendingReviewNotice")}
        </div>
      )}

      {/* Guest prompt */}
      {isGuest && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <span>{t("guestNotice")}</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onSignIn}
            className="gap-1.5 text-primary hover:text-primary shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <LogIn className="size-3.5" />
            <span>{t("signInBtn")}</span>
          </Button>
        </div>
      )}

      {/* Primary Action */}
      <div className="space-y-2 pt-2">
        <Button
          type="button"
          size="lg"
          disabled={isOutOfAttempts}
          onClick={onStart}
          className="gap-2 font-semibold cursor-pointer"
        >
          <span>{attemptsUsed > 0 ? t("retakeBtn") : t("startBtn")}</span>
          <ArrowRight className="size-4" />
        </Button>

        {isOutOfAttempts && (
          <p className="text-xs text-destructive">
            {t("outOfAttempts", { max: maxAttempts })}
          </p>
        )}
      </div>
    </div>
  );
}
