"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import confetti from "canvas-confetti";
import type { ClientQuizQuestion, QuizGradeResponse } from "@/types";
import { CountUp, ProgressRing } from "@/components/ui/animated-progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  LogIn,
  RotateCcw,
} from "lucide-react";

interface QuizResultProps {
  questions: ClientQuizQuestion[];
  userAnswers: Record<string, string[]>;
  result: QuizGradeResponse;
  canRetake: boolean;
  isGuest: boolean;
  nextItemHref: string | null;
  certificateHref: string | null;
  onRetake: () => void;
  onSignIn: () => void;
}

export function QuizResult({
  questions,
  userAnswers,
  result,
  canRetake,
  isGuest,
  nextItemHref,
  certificateHref,
  onRetake,
  onSignIn,
}: QuizResultProps) {
  const t = useTranslations("quiz.result");
  const tIntro = useTranslations("quiz.intro");
  const reduceMotion = useReducedMotion();
  const firedRef = useRef(false);

  const isPendingReview =
    Boolean(result.requiresReview) || result.status === "PENDING_REVIEW";

  useEffect(() => {
    if (
      !isPendingReview &&
      result.isPassed &&
      !firedRef.current &&
      !reduceMotion
    ) {
      firedRef.current = true;
      try {
        confetti({
          particleCount: 60,
          spread: 65,
          origin: { y: 0.65 },
        });
      } catch {}
    }
  }, [isPendingReview, result.isPassed, reduceMotion]);

  const formatAnswerText = (q: ClientQuizQuestion, ansIds: string[]) => {
    if (!ansIds || ansIds.length === 0) return t("noAnswer");
    if (q.options && q.options.length > 0) {
      const labels = ansIds.map(
        (id) => q.options.find((o) => o.id === id)?.text || id
      );
      return labels.join(", ");
    }
    if (q.type === "file_upload") {
      return ansIds[1] || ansIds[0];
    }
    return ansIds.join(", ");
  };

  return (
    <div className="space-y-8">
      {/* Summary Header Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 text-center space-y-5">
        {isPendingReview ? (
          <>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock className="size-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {t("pendingReviewTitle")}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("pendingReviewDesc")}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <ProgressRing
                value={result.scorePercent}
                size={112}
                strokeWidth={8}
              >
                <CountUp
                  value={result.scorePercent}
                  suffix="%"
                  className="text-2xl font-bold text-foreground"
                />
              </ProgressRing>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-center">
                <Badge
                  variant={result.isPassed ? "success" : "destructive"}
                  className="gap-1 text-xs px-2.5 py-0.5"
                >
                  {result.isPassed && <CheckCircle2 className="size-3.5" />}
                  <span>
                    {result.isPassed ? t("passedTitle") : t("failedTitle")}
                  </span>
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("scoreSummary", {
                  correct: result.correctCount,
                  total: result.totalQuestions,
                  required: result.requiredScore,
                })}
              </p>
            </div>
          </>
        )}

        {isGuest && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
            <span>{t("guestWarning")}</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onSignIn}
              className="gap-1 text-primary hover:text-primary cursor-pointer"
            >
              <LogIn className="size-3.5" />
              <span>{tIntro("signInBtn")}</span>
            </Button>
          </div>
        )}

        {/* Action Buttons (One primary CTA + secondary ghost/outline) */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {(result.isPassed || isPendingReview) && certificateHref ? (
            <>
              <Button asChild className="gap-2 font-semibold cursor-pointer">
                <Link href={certificateHref}>
                  <Award className="size-4" />
                  <span>{t("viewCertificateBtn")}</span>
                </Link>
              </Button>
              {canRetake && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onRetake}
                  className="gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>{t("retakeBtn")}</span>
                </Button>
              )}
            </>
          ) : (result.isPassed || isPendingReview) && nextItemHref ? (
            <>
              <Button asChild className="gap-2 font-semibold cursor-pointer">
                <Link href={nextItemHref}>
                  <span>{t("nextChapterBtn")}</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {canRetake && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onRetake}
                  className="gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>{t("retakeBtn")}</span>
                </Button>
              )}
            </>
          ) : (
            <>
              {canRetake && (
                <Button
                  type="button"
                  onClick={onRetake}
                  className="gap-2 font-semibold cursor-pointer"
                >
                  <RotateCcw className="size-4" />
                  <span>{t("retakeBtn")}</span>
                </Button>
              )}
              {nextItemHref && (
                <Button
                  asChild
                  variant="ghost"
                  className="gap-1.5 cursor-pointer"
                >
                  <Link href={nextItemHref}>
                    <span>{t("nextChapterBtn")}</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Question Breakdown List */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("breakdownTitle")}
        </h3>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const fb = result.feedback?.[q.id];
            const isCorrect = Boolean(fb?.isCorrect);
            const userAns = userAnswers[q.id] || [];
            const correctAnsIds = fb?.correctOptionIds || [];

            return (
              <div
                key={q.id}
                className={cn(
                  "rounded-xl border p-4 space-y-2.5 text-sm",
                  isPendingReview
                    ? "border-border/70 bg-card/50"
                    : isCorrect
                    ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                    : "border-destructive/30 bg-destructive/[0.03]"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-foreground">
                    <span className="font-mono text-xs text-muted-foreground mr-1.5">
                      {t("questionLabel", { index: idx + 1 })}.
                    </span>
                    {q.questionText}
                  </p>
                  <Badge
                    variant={
                      isPendingReview
                        ? "secondary"
                        : isCorrect
                        ? "success"
                        : "destructive"
                    }
                    className="text-[10px] shrink-0"
                  >
                    {isPendingReview
                      ? t("submittedBadge")
                      : isCorrect
                      ? t("correctBadge")
                      : t("incorrectBadge")}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground/80">
                      {t("yourAnswer")}
                    </span>{" "}
                    <span>{formatAnswerText(q, userAns)}</span>
                  </p>

                  {!isPendingReview &&
                    !isCorrect &&
                    correctAnsIds.length > 0 && (
                      <p className="text-emerald-600 dark:text-emerald-400">
                        <span className="font-medium">
                          {t("correctAnswer")}
                        </span>{" "}
                        <span>{formatAnswerText(q, correctAnsIds)}</span>
                      </p>
                    )}

                  {fb?.explanation && (
                    <p className="pt-1 text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        {t("explanation")}
                      </span>{" "}
                      <span>{fb.explanation}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
