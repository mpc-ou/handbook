"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import type {
  ClientQuizQuestion,
  EditorBlock,
  ItemAttachment,
  ItemType,
  QuizGradeResponse,
} from "@/types";
import { QuizIntro } from "@/components/reader/QuizIntro";
import { QuizSession } from "@/components/reader/QuizSession";
import { QuizResult } from "@/components/reader/QuizResult";

export interface QuizRunnerProps {
  itemId: string;
  title: string;
  summary?: string;
  type: ItemType;
  content: EditorBlock[];
  attachments: ItemAttachment[];
  passScorePercent: number;
  durationMinutes?: number;
  maxAttempts?: number;
  questions: ClientQuizQuestion[];
  attemptsUsed: number;
  highestQuizScore: number;
  hasPendingReview?: boolean;
  isGuest: boolean;
  nextItemHref: string | null;
  certificateHref: string | null;
  onSignIn: () => void;
  onSubmitQuiz: (
    userAnswers: Record<string, string[]>
  ) => Promise<QuizGradeResponse>;
}

type QuizStage = "intro" | "session" | "result";

export function QuizRunner({
  title,
  summary,
  type,
  content,
  attachments,
  passScorePercent,
  durationMinutes = 0,
  maxAttempts = 0,
  questions,
  attemptsUsed,
  highestQuizScore,
  hasPendingReview = false,
  isGuest,
  nextItemHref,
  certificateHref,
  onSignIn,
  onSubmitQuiz,
}: QuizRunnerProps) {
  const tEmpty = useTranslations("quiz.empty");
  const tSession = useTranslations("quiz.session");

  const [stage, setStage] = useState<QuizStage>("intro");
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string[]>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [gradeResult, setGradeResult] = useState<QuizGradeResponse | null>(
    null
  );
  const [localAttemptsCount, setLocalAttemptsCount] = useState(attemptsUsed);

  if (!questions || questions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 text-center space-y-1.5">
        <h2 className="text-base font-semibold text-foreground">
          {tEmpty("title")}
        </h2>
        <p className="text-xs text-muted-foreground">{tEmpty("description")}</p>
      </div>
    );
  }

  const effectiveAttemptsUsed = Math.max(attemptsUsed, localAttemptsCount);
  const canRetake =
    isGuest || maxAttempts <= 0 || effectiveAttemptsUsed < maxAttempts;

  const handleStart = () => {
    setSelectedAnswers({});
    setSubmitError(null);
    setGradeResult(null);
    setStage("session");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await onSubmitQuiz(selectedAnswers);
      setGradeResult(res);
      setLocalAttemptsCount((c) => c + 1);
      setStage("result");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : tSession("submitErrorTitle")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (stage === "session") {
    return (
      <QuizSession
        questions={questions}
        durationMinutes={durationMinutes}
        selectedAnswers={selectedAnswers}
        onSelectAnswers={setSelectedAnswers}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
      />
    );
  }

  if (stage === "result" && gradeResult) {
    return (
      <QuizResult
        questions={questions}
        userAnswers={selectedAnswers}
        result={gradeResult}
        canRetake={canRetake}
        isGuest={isGuest}
        nextItemHref={nextItemHref}
        certificateHref={certificateHref}
        onRetake={handleStart}
        onSignIn={onSignIn}
      />
    );
  }

  return (
    <QuizIntro
      title={title}
      summary={summary}
      type={type}
      content={content}
      attachments={attachments}
      questionsCount={questions.length}
      durationMinutes={durationMinutes}
      passScorePercent={passScorePercent}
      maxAttempts={maxAttempts}
      attemptsUsed={effectiveAttemptsUsed}
      highestScore={highestQuizScore}
      hasPendingReview={hasPendingReview}
      isGuest={isGuest}
      onSignIn={onSignIn}
      onStart={handleStart}
    />
  );
}
