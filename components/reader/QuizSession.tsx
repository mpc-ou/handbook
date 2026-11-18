"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ClientQuizQuestion } from "@/types";
import { getYoutubeEmbedUrl } from "@/components/reader/ArticleRenderer";
import { ProgressBar } from "@/components/ui/animated-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { uploadToCloudinary, MAX_FILE_SIZE_BYTES } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Send,
  Timer,
  Upload,
} from "lucide-react";

interface QuizSessionProps {
  questions: ClientQuizQuestion[];
  durationMinutes?: number;
  selectedAnswers: Record<string, string[]>;
  onSelectAnswers: React.Dispatch<
    React.SetStateAction<Record<string, string[]>>
  >;
  onSubmit: () => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}

export function QuizSession({
  questions,
  durationMinutes = 0,
  selectedAnswers,
  onSelectAnswers,
  onSubmit,
  submitting,
  submitError,
}: QuizSessionProps) {
  const t = useTranslations("quiz.session");
  const reduceMotion = useReducedMotion();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const totalSeconds = durationMinutes > 0 ? durationMinutes * 60 : 0;
  const [secondsLeft, setSecondsLeft] = useState<number>(totalSeconds);

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    if (durationMinutes <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [durationMinutes]);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const goToIndex = (nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= questions.length || nextIdx === currentIndex)
      return;
    setDirection(nextIdx > currentIndex ? 1 : -1);
    setCurrentIndex(nextIdx);
  };

  const handleSingleSelect = (questionId: string, optionId: string) => {
    onSelectAnswers((prev) => ({
      ...prev,
      [questionId]: [optionId],
    }));
  };

  const handleMultiToggle = (questionId: string, optionId: string) => {
    onSelectAnswers((prev) => {
      const current = prev[questionId] || [];
      const exists = current.includes(optionId);
      const next = exists
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  };

  const handleTextAnswer = (questionId: string, value: string) => {
    onSelectAnswers((prev) => ({
      ...prev,
      [questionId]: value.trim().length > 0 ? [value] : [],
    }));
  };

  const handleScaleSelect = (questionId: string, val: number) => {
    onSelectAnswers((prev) => ({
      ...prev,
      [questionId]: [String(val)],
    }));
  };

  const handleFileUpload = async (
    questionId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(t("fileTooLarge"));
      return;
    }

    try {
      setUploadingQuestionId(questionId);
      setUploadError(null);
      const url = await uploadToCloudinary(file);
      onSelectAnswers((prev) => ({
        ...prev,
        [questionId]: [url, file.name],
      }));
    } catch (err) {
      setUploadError(
        err instanceof Error && err.message ? err.message : t("uploadFailed")
      );
    } finally {
      setUploadingQuestionId(null);
    }
  };

  // Keyboard navigation & option selection (1..9, Left, Right, Enter)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const q = questions[currentIndex];
      if (!q) return;

      if (e.key >= "1" && e.key <= "9") {
        const num = Number(e.key);
        const qType = q.type || "single";
        if (qType === "single") {
          const opt = (q.options || [])[num - 1];
          if (opt) {
            e.preventDefault();
            handleSingleSelect(q.id, opt.id);
          }
        } else if (qType === "multiple") {
          const opt = (q.options || [])[num - 1];
          if (opt) {
            e.preventDefault();
            handleMultiToggle(q.id, opt.id);
          }
        } else if (qType === "scale") {
          const max = q.scaleMax || 5;
          if (num >= 1 && num <= max) {
            e.preventDefault();
            handleScaleSelect(q.id, num);
          }
        }
        return;
      }

      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (currentIndex < questions.length - 1) {
          e.preventDefault();
          goToIndex(currentIndex + 1);
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        if (currentIndex > 0) {
          e.preventDefault();
          goToIndex(currentIndex - 1);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!currentQuestion) return null;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  const progressPct = ((currentIndex + 1) / questions.length) * 100;
  const currentSelected = selectedAnswers[currentQuestion.id] || [];
  const qType = currentQuestion.type || "single";

  const unansweredCount = questions.filter(
    (q) => !selectedAnswers[q.id] || selectedAnswers[q.id].length === 0
  ).length;

  const embedYoutubeUrl =
    currentQuestion.attachmentType === "youtube" &&
    currentQuestion.attachmentUrl
      ? getYoutubeEmbedUrl(currentQuestion.attachmentUrl)
      : null;

  const handleCopySampleCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Progress & Timer Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-mono font-semibold text-foreground">
            {t("questionProgress", {
              current: currentIndex + 1,
              total: questions.length,
            })}
          </span>

          {durationMinutes > 0 && (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums",
                secondsLeft <= 60
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-border bg-muted/40 text-foreground"
              )}
            >
              <Timer className="size-3.5" />
              <span>{t("timeLeft", { time: formatTimer(secondsLeft) })}</span>
            </div>
          )}
        </div>

        <ProgressBar value={progressPct} heightClassName="h-1.5" />

        {/* Question Step Dots */}
        {questions.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {questions.map((q, idx) => {
              const isAnswered =
                selectedAnswers[q.id] && selectedAnswers[q.id].length > 0;
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => goToIndex(idx)}
                  className={cn(
                    "size-7 rounded-md font-mono text-xs font-medium transition-colors cursor-pointer",
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isAnswered
                      ? "bg-primary/15 text-primary hover:bg-primary/25"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Animated Question Card */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentQuestion.id}
            initial={
              reduceMotion ? false : { opacity: 0, x: direction * 24 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={
              reduceMotion ? undefined : { opacity: 0, x: direction * -24 }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.2, ease: "easeOut" }
            }
            className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-5"
          >
            {/* Question Header */}
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="text-[11px] font-normal text-muted-foreground"
              >
                {t(`questionTypes.${qType}`)}
              </Badge>
              <h2 className="text-base sm:text-lg font-semibold text-foreground leading-relaxed">
                {currentQuestion.questionText}
              </h2>
            </div>

            {/* Question Attachment (Image or YouTube) */}
            {currentQuestion.attachmentType === "image" &&
              currentQuestion.attachmentUrl && (
                <figure className="space-y-1.5">
                  <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentQuestion.attachmentUrl}
                      alt={
                        currentQuestion.attachmentCaption ||
                        currentQuestion.questionText
                      }
                      referrerPolicy="no-referrer"
                      className="w-full max-h-80 object-contain"
                    />
                  </div>
                  {currentQuestion.attachmentCaption && (
                    <figcaption className="text-center text-xs text-muted-foreground">
                      {currentQuestion.attachmentCaption}
                    </figcaption>
                  )}
                </figure>
              )}

            {currentQuestion.attachmentType === "youtube" &&
              embedYoutubeUrl && (
                <div className="space-y-1.5">
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
                    <iframe
                      src={embedYoutubeUrl}
                      title={
                        currentQuestion.attachmentCaption ||
                        currentQuestion.questionText
                      }
                      className="size-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  {currentQuestion.attachmentCaption && (
                    <p className="text-center text-xs text-muted-foreground">
                      {currentQuestion.attachmentCaption}
                    </p>
                  )}
                </div>
              )}

            {/* Reference Sample Code if present */}
            {currentQuestion.sampleCode && (
              <div className="overflow-hidden rounded-xl border border-border bg-slate-950 text-slate-100">
                <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-1.5 text-xs text-slate-400">
                  <span className="font-mono">{t("sampleCode")}</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopySampleCode(
                        currentQuestion.id,
                        currentQuestion.sampleCode!
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    {copiedCodeId === currentQuestion.id ? (
                      <>
                        <Check className="size-3 text-emerald-400" />
                        <span>{t("copiedCode")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>{t("copyCode")}</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="overflow-x-auto p-3.5 text-xs font-mono leading-relaxed">
                  <code>{currentQuestion.sampleCode}</code>
                </pre>
              </div>
            )}

            {/* 1. SINGLE CHOICE */}
            {qType === "single" && (
              <div className="space-y-2.5">
                {(currentQuestion.options || []).map((opt, idx) => {
                  const isSelected = currentSelected[0] === opt.id;
                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                      animate={
                        reduceMotion
                          ? undefined
                          : { scale: isSelected ? 1.005 : 1 }
                      }
                      transition={{ duration: 0.15 }}
                      onClick={() =>
                        handleSingleSelect(currentQuestion.id, opt.id)
                      }
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground font-medium"
                          : "border-border/70 hover:border-border hover:bg-muted/30 text-foreground/90"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted/50 text-muted-foreground"
                        )}
                      >
                        {isSelected ? (
                          <Check className="size-3.5" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span className="flex-1 leading-snug">{opt.text}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* 2. MULTIPLE CHOICE */}
            {qType === "multiple" && (
              <div className="space-y-2.5">
                {(currentQuestion.options || []).map((opt, idx) => {
                  const isChecked = currentSelected.includes(opt.id);
                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                      animate={
                        reduceMotion
                          ? undefined
                          : { scale: isChecked ? 1.005 : 1 }
                      }
                      transition={{ duration: 0.15 }}
                      onClick={() =>
                        handleMultiToggle(currentQuestion.id, opt.id)
                      }
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors cursor-pointer",
                        isChecked
                          ? "border-primary bg-primary/5 text-foreground font-medium"
                          : "border-border/70 hover:border-border hover:bg-muted/30 text-foreground/90"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs transition-colors",
                          isChecked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted/50 text-muted-foreground"
                        )}
                      >
                        {isChecked ? (
                          <Check className="size-3.5" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span className="flex-1 leading-snug">{opt.text}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* 3. FILL BLANK */}
            {qType === "fill_blank" && (
              <Input
                type="text"
                placeholder={t("fillBlankPlaceholder")}
                value={currentSelected[0] || ""}
                onChange={(e) =>
                  handleTextAnswer(currentQuestion.id, e.target.value)
                }
                className="h-11 text-sm"
              />
            )}

            {/* 4. SCALE */}
            {qType === "scale" && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {currentQuestion.scaleMinLabel || t("scaleMinDefault")}
                  </span>
                  <span>
                    {currentQuestion.scaleMaxLabel ||
                      t("scaleMaxDefault", {
                        max: currentQuestion.scaleMax || 5,
                      })}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {Array.from(
                    { length: currentQuestion.scaleMax || 5 },
                    (_, i) => i + 1
                  ).map((val) => {
                    const isSelected = currentSelected[0] === String(val);
                    return (
                      <motion.button
                        key={val}
                        type="button"
                        whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                        onClick={() =>
                          handleScaleSelect(currentQuestion.id, val)
                        }
                        className={cn(
                          "flex-1 min-w-[40px] h-11 rounded-xl border font-mono text-sm font-semibold transition-colors cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/80 hover:bg-muted text-foreground"
                        )}
                      >
                        {val}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. ESSAY */}
            {qType === "essay" && (
              <Textarea
                placeholder={t("essayPlaceholder")}
                rows={6}
                value={currentSelected[0] || ""}
                onChange={(e) =>
                  handleTextAnswer(currentQuestion.id, e.target.value)
                }
                className="text-sm leading-relaxed"
              />
            )}

            {/* 6. CODE SUBMISSION */}
            {qType === "code_submission" && (
              <Textarea
                placeholder={t("codePlaceholder")}
                rows={10}
                value={currentSelected[0] || ""}
                onChange={(e) =>
                  handleTextAnswer(currentQuestion.id, e.target.value)
                }
                className="font-mono text-xs sm:text-sm leading-relaxed bg-slate-950 text-slate-100 border-slate-800"
              />
            )}

            {/* 7. FILE UPLOAD */}
            {qType === "file_upload" && (
              <div className="space-y-2">
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center space-y-2">
                  {uploadingQuestionId === currentQuestion.id ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <Loader2 className="size-5 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">
                        {t("uploading")}
                      </span>
                    </div>
                  ) : currentSelected[0] ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-card p-3 text-left">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        <div className="min-w-0 text-xs">
                          <p className="font-medium text-foreground truncate">
                            {currentSelected[1] || t("uploadedFile")}
                          </p>
                          <a
                            href={currentSelected[0]}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline truncate block"
                          >
                            {t("viewUploadedFile")}
                          </a>
                        </div>
                      </div>
                      <label className="text-xs text-primary font-medium hover:underline cursor-pointer shrink-0">
                        <span>{t("changeFile")}</span>
                        <input
                          type="file"
                          className="hidden"
                          accept={currentQuestion.fileAcceptedTypes || "*"}
                          onChange={(e) =>
                            handleFileUpload(currentQuestion.id, e)
                          }
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2 py-2">
                      <Upload className="size-5 mx-auto text-muted-foreground" />
                      <p className="text-xs text-foreground">
                        {t("uploadPrompt")}
                      </p>
                      {currentQuestion.fileAcceptedTypes && (
                        <p className="text-[11px] text-muted-foreground">
                          {t("uploadAccepted", {
                            types: currentQuestion.fileAcceptedTypes,
                          })}
                        </p>
                      )}
                      <label className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors">
                        <span>{t("uploadBtn")}</span>
                        <input
                          type="file"
                          className="hidden"
                          accept={currentQuestion.fileAcceptedTypes || "*"}
                          onChange={(e) =>
                            handleFileUpload(currentQuestion.id, e)
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <p className="text-xs text-destructive">{uploadError}</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Gentle Inline Unanswered Warning on Last Question */}
      {isLastQuestion && unansweredCount > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {t("unansweredNotice", { count: unansweredCount })}
        </p>
      )}

      {/* Submission Error Inline */}
      {submitError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/5 p-3.5 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">{t("submitErrorTitle")}</p>
            <p>{submitError}</p>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          disabled={currentIndex === 0 || submitting}
          onClick={() => goToIndex(currentIndex - 1)}
          className="gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>{t("prevQuestion")}</span>
        </Button>

        <span className="hidden md:inline text-[11px] text-muted-foreground">
          {t("shortcutHint")}
        </span>

        {!isLastQuestion ? (
          <Button
            type="button"
            onClick={() => goToIndex(currentIndex + 1)}
            className="gap-1.5 font-semibold cursor-pointer"
          >
            <span>{t("nextQuestion")}</span>
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            disabled={submitting}
            onClick={onSubmit}
            className="gap-2 font-semibold cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{t("submitting")}</span>
              </>
            ) : (
              <>
                <Send className="size-4" />
                <span>{t("submitBtn")}</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
