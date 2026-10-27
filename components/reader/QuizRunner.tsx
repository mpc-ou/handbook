"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useHandbook } from "@/context/HandbookContext";
import { ClientQuizQuestion, QuizGradeResponse } from "@/types";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { uploadToCloudinary, MAX_FILE_SIZE_BYTES } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FileQuestion,
  HelpCircle,
  Loader2,
  Lock,
  RotateCcw,
  Send,
  Sliders,
  Timer,
  Trophy,
  Type,
  Upload,
  XCircle,
} from "lucide-react";

interface QuizRunnerProps {
  articleId: string;
  passScorePercent: number;
  durationMinutes?: number;
  maxAttempts?: number;
  isExam?: boolean;
  questions: ClientQuizQuestion[];
  isUnlockedByScroll: boolean;
  highestQuizScore: number;
  onSubmitQuiz: (
    userAnswers: Record<string, string[]>,
    timeSpentSec?: number
  ) => Promise<QuizGradeResponse>;
}

export function QuizRunner({
  passScorePercent,
  durationMinutes = 0,
  maxAttempts = 0,
  isExam = false,
  questions,
  isUnlockedByScroll,
  highestQuizScore,
  onSubmitQuiz,
}: QuizRunnerProps) {
  const { user } = useHandbook();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string[]>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [gradeResult, setGradeResult] = useState<QuizGradeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File uploading states
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Timer states
  const totalSeconds = durationMinutes > 0 ? durationMinutes * 60 : 0;
  const [secondsLeft, setSecondsLeft] = useState<number>(totalSeconds);
  const startTimeRef = useRef<number>(0);

  // Reset timer whenever modal opens
  useEffect(() => {
    if (modalOpen && !gradeResult) {
      startTimeRef.current = Date.now();
      if (durationMinutes > 0) {
        setSecondsLeft(durationMinutes * 60);
      }
    }
  }, [modalOpen, durationMinutes, gradeResult]);

  // Countdown Interval
  useEffect(() => {
    if (!modalOpen || durationMinutes <= 0 || gradeResult) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Trigger auto-submit when timer expires
          handleSubmitRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [modalOpen, durationMinutes, gradeResult]);

  if (!questions || questions.length === 0 || passScorePercent <= 0) {
    return null;
  }

  const isPassedAlready = highestQuizScore >= passScorePercent;

  // Single select (radio)
  const handleSingleSelect = (questionId: string, optionId: string) => {
    if (gradeResult?.isPassed) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: [optionId],
    }));
  };

  // Multiple toggle (checkbox)
  const handleMultiToggle = (questionId: string, optionId: string) => {
    if (gradeResult?.isPassed) return;
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      const exists = current.includes(optionId);
      const next = exists
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  };

  // Text inputs (fill_blank, essay)
  const handleTextAnswer = (questionId: string, value: string) => {
    if (gradeResult?.isPassed) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: value ? [value] : [],
    }));
  };

  // Scale rating select (1 to X)
  const handleScaleSelect = (questionId: string, val: number) => {
    if (gradeResult?.isPassed) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: [String(val)],
    }));
  };

  // File upload handler
  const handleFileUpload = async (
    questionId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError("File size exceeds 5MB limit. Please choose a smaller file.");
      return;
    }

    try {
      setUploadingQuestionId(questionId);
      setUploadError(null);
      const url = await uploadToCloudinary(file);
      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: [url, file.name],
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "File upload failed.");
    } finally {
      setUploadingQuestionId(null);
    }
  };

  // Submit Handler
  const doSubmit = async () => {
    setErrorMsg(null);

    const unanswered = questions.filter(
      (q) => !selectedAnswers[q.id] || selectedAnswers[q.id].length === 0
    );
    if (unanswered.length > 0) {
      setErrorMsg(
        `Please answer all ${questions.length} questions before submitting.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const timeSpentSec = Math.round((Date.now() - startTimeRef.current) / 1000);
      const res = await onSubmitQuiz(selectedAnswers, timeSpentSec);
      setGradeResult(res);
      if (res.isPassed) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#F97316", "#FBBF24", "#34D399", "#60A5FA"],
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred while submitting.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRef = useRef(doSubmit);
  handleSubmitRef.current = doSubmit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSubmit();
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setGradeResult(null);
    setErrorMsg(null);
    setUploadError(null);
    if (durationMinutes > 0) {
      setSecondsLeft(durationMinutes * 60);
    }
    startTimeRef.current = Date.now();
  };

  const answeredCount = questions.filter(
    (q) => selectedAnswers[q.id] && selectedAnswers[q.id].length > 0
  ).length;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* Assessment Milestone Card (In-article Entry Point) */}
      <Card
        className={cn(
          "my-8 overflow-hidden border transition-all",
          isPassedAlready
            ? "border-emerald-500/30 bg-emerald-500/[0.03]"
            : "border-border/80 bg-card hover:border-primary/50 shadow-sm"
        )}
      >
        <CardHeader className="p-5 sm:p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  isPassedAlready
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    : "bg-primary/10 text-primary border border-primary/20"
                )}
              >
                {isPassedAlready ? (
                  <Trophy className="size-5" />
                ) : (
                  <ClipboardCheck className="size-5" />
                )}
              </span>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>Knowledge Check Assessment</span>
                  {isPassedAlready && (
                    <Badge variant="success" className="text-[10px] gap-1">
                      <CheckCircle2 className="size-3" /> Passed
                    </Badge>
                  )}
                  {isExam && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 bg-amber-500/10">
                      Timed Exam Mode
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-0.5">
                  Assess your comprehension to confirm lesson completion and unlock subsequent content.
                </CardDescription>
              </div>
            </div>

            {/* Score pills */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs py-1 px-2.5">
                Standard: &ge; {passScorePercent}%
              </Badge>
              {durationMinutes > 0 && (
                <Badge variant="secondary" className="font-mono text-xs py-1 px-2.5 gap-1">
                  <Clock className="size-3 text-amber-500" />
                  <span>{durationMinutes} min</span>
                </Badge>
              )}
              {highestQuizScore > 0 && (
                <Badge
                  variant={isPassedAlready ? "success" : "warning"}
                  className="font-mono text-xs py-1 px-2.5"
                >
                  Highest score: {highestQuizScore}%
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardFooter className="border-t border-border/60 bg-muted/20 px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <FileQuestion className="size-4 text-primary" />
            <span>
              Question set: <strong>{questions.length} questions</strong>
            </span>
            {maxAttempts > 0 && (
              <>
                <span>•</span>
                <span>
                  Limit: <strong>{maxAttempts} attempts</strong>
                </span>
              </>
            )}
            {!user && (
              <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 font-normal">
                Guest: Practice & view results
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isUnlockedByScroll ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button disabled size="sm" variant="outline" className="gap-1.5 opacity-60">
                    <Lock className="size-3.5" />
                    <span>Read full article to unlock Quiz</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  You must scroll through the entire article before taking the assessment
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                size="sm"
                onClick={() => setModalOpen(true)}
                className="font-semibold gap-1.5 shadow-sm cursor-pointer"
              >
                <span>
                  {isPassedAlready
                    ? "Retake Assessment"
                    : highestQuizScore > 0
                    ? "Improve Quiz Score"
                    : "Start Assessment"}
                </span>
                <ChevronRight className="size-3.5" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Dedicated Quiz Modal Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {/* Dialog Header */}
          <DialogHeader className="p-6 border-b border-border bg-card shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                    Assessment
                  </Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {answeredCount}/{questions.length} completed
                  </Badge>
                </div>
                <DialogTitle className=" sm:text-xl font-bold">
                  ASSESSMENT QUIZ
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Passing score required: <strong>{passScorePercent}%</strong> · Answer correctly to record your learning progress.
                </DialogDescription>
              </div>

              {/* Countdown Timer or Highest Record */}
              <div className="flex items-center gap-3 shrink-0">
                {durationMinutes > 0 && !gradeResult && (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm tabular-nums shadow-xs",
                      secondsLeft <= 60
                        ? "border-red-500/50 bg-red-500/10 text-red-600 animate-pulse"
                        : "border-primary/40 bg-primary/10 text-primary"
                    )}
                  >
                    <Timer className="size-4" />
                    <span>{formatTimer(secondsLeft)}</span>
                  </div>
                )}
                {highestQuizScore > 0 && (
                  <div className="text-right hidden sm:block">
                    <span className="text-[11px] text-muted-foreground block">
                      Your Record
                    </span>
                    <span className="font-mono text-base font-bold text-foreground">
                      {highestQuizScore}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Answered Progress bar */}
            <Progress
              value={(answeredCount / questions.length) * 100}
              className="h-1 bg-muted mt-3"
              indicatorClassName="bg-primary"
            />
          </DialogHeader>

          {/* Dialog Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {errorMsg && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Cannot Submit Yet</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>File Upload Error</AlertTitle>
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {gradeResult ? (
              /* Grade Result Banner inside Modal */
              <div className="space-y-6">
                <div
                  className={cn(
                    "rounded-2xl border p-6 text-center space-y-3",
                    gradeResult.isPassed
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-red-500/40 bg-red-500/10"
                  )}
                >
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-background shadow-xs">
                    {gradeResult.isPassed ? (
                      <CheckCircle2 className="size-8 text-emerald-500" />
                    ) : (
                      <XCircle className="size-8 text-red-500" />
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-foreground">
                    {gradeResult.isPassed
                      ? "Excellent! You passed the assessment"
                      : "Passing score not reached"}
                  </h3>

                  <p className="text-3xl font-extrabold font-mono tabular-nums text-foreground">
                    {gradeResult.scorePercent}%
                  </p>

                  <div className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto space-y-1.5">
                    {!user ? (
                      <div className="space-y-1">
                        <p>You completed the assessment with a score of {gradeResult.scorePercent}% as a Guest.</p>
                        <p className="text-amber-500 font-medium">
                          ⚠️ This result is not saved to your profile. Please sign in to record your score and unlock the next lesson.
                        </p>
                      </div>
                    ) : gradeResult.isPassed ? (
                      <p>
                        You scored {gradeResult.scorePercent}% (exceeding the required {passScorePercent}%). Your progress has been updated!
                      </p>
                    ) : (
                      <p>
                        You scored {gradeResult.scorePercent}%, below the required {passScorePercent}%. Please review the lesson and try again!
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRetake}
                      className="gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>Retake Quiz</span>
                    </Button>
                    {!user ? (
                      <Button asChild size="sm" className="cursor-pointer bg-primary text-primary-foreground font-semibold">
                        <Link href="/login">Sign in to save results</Link>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setModalOpen(false)}
                        className="cursor-pointer"
                      >
                        <span>Finish</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Question Feedback Breakdown */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-foreground">
                    Question breakdown & feedback:
                  </h4>
                  {questions.map((q, idx) => {
                    const detail = gradeResult.feedback?.[q.id];
                    const isCorrect = detail?.isCorrect;

                    return (
                      <div
                        key={q.id}
                        className={cn(
                          "rounded-xl border p-4 space-y-2 text-sm",
                          isCorrect
                            ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                            : "border-red-500/30 bg-red-500/[0.02]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-foreground">
                            Question {idx + 1}: {q.questionText}
                          </span>
                          {isCorrect ? (
                            <Badge variant="success" className="text-[10px] shrink-0">
                              Correct
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] shrink-0">
                              Incorrect
                            </Badge>
                          )}
                        </div>

                        {detail?.explanation && (
                          <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
                            <strong>Explanation:</strong> {detail.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Questions Form */
              <form id="quiz-form" onSubmit={handleSubmit} className="space-y-6">
                {questions.map((q, idx) => {
                  const currentSelected = selectedAnswers[q.id] || [];
                  const isMultipleChoice = q.type === "multiple";
                  const isFillBlank = q.type === "fill_blank";
                  const isEssay = q.type === "essay";
                  const isScale = q.type === "scale";
                  const isFileUpload = q.type === "file_upload";

                  return (
                    <div
                      key={q.id}
                      className="rounded-xl border border-border/80 bg-card p-5 space-y-4 shadow-2xs"
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="font-mono text-xs font-semibold text-primary">
                            Question {idx + 1}/{questions.length}
                          </span>
                          <h4 className="text-sm sm:text-base font-medium text-foreground leading-snug">
                            {q.questionText}
                          </h4>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                          {isMultipleChoice
                            ? "Multiple Choice"
                            : isFillBlank
                            ? "Fill in the blank"
                            : isEssay
                            ? "Essay Response"
                            : isScale
                            ? "Rating Scale"
                            : isFileUpload
                            ? "File Submission"
                            : "Single Choice"}
                        </Badge>
                      </div>

                      {/* 1. MULTIPLE CHOICE */}
                      {isMultipleChoice && (
                        <div className="space-y-2.5">
                          {(q.options || []).map((opt) => {
                            const isChecked = currentSelected.includes(opt.id);
                            return (
                              <label
                                key={opt.id}
                                className={cn(
                                  "flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer transition-colors",
                                  isChecked
                                    ? "border-primary bg-primary/5 text-foreground font-medium"
                                    : "border-border/70 hover:bg-muted/40 text-foreground/90"
                                )}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() =>
                                    handleMultiToggle(q.id, opt.id)
                                  }
                                />
                                <span className="flex-1 leading-snug">
                                  {opt.text}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. SINGLE CHOICE */}
                      {(q.type === "single" || !q.type) && (
                        <RadioGroup
                          value={currentSelected[0] || ""}
                          onValueChange={(val) => handleSingleSelect(q.id, val)}
                          className="space-y-2.5"
                        >
                          {(q.options || []).map((opt) => {
                            const isSelected = currentSelected[0] === opt.id;
                            return (
                              <label
                                key={opt.id}
                                className={cn(
                                  "flex items-center gap-3 rounded-lg border p-3 text-sm cursor-pointer transition-colors",
                                  isSelected
                                    ? "border-primary bg-primary/5 text-foreground font-medium"
                                    : "border-border/70 hover:bg-muted/40 text-foreground/90"
                                )}
                              >
                                <RadioGroupItem value={opt.id} id={opt.id} />
                                <Label
                                  htmlFor={opt.id}
                                  className="flex-1 cursor-pointer font-normal leading-snug"
                                >
                                  {opt.text}
                                </Label>
                              </label>
                            );
                          })}
                        </RadioGroup>
                      )}

                      {/* 3. FILL IN THE BLANK */}
                      {isFillBlank && (
                        <div className="space-y-2">
                          <Input
                            type="text"
                            placeholder="Enter your answer here..."
                            value={currentSelected[0] || ""}
                            onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                            className="h-10 text-sm"
                          />
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Type className="size-3 text-blue-500" />
                            Hint: Enter the exact keyword or term according to the lesson.
                          </p>
                        </div>
                      )}

                      {/* 4. ESSAY / LONG ANSWER */}
                      {isEssay && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Type your essay answer or explanation here..."
                            rows={4}
                            value={currentSelected[0] || ""}
                            onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                            className="text-sm leading-relaxed"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Essay responses will be reviewed and scored by department leaders.
                          </p>
                        </div>
                      )}

                      {/* 5. LINEAR SCALE (1 to X) */}
                      {isScale && (
                        <div className="space-y-3 pt-1">
                          {/* Min and Max Labels */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                            <span>{q.scaleMinLabel || "1: Strongly Disagree"}</span>
                            <span>{q.scaleMaxLabel || `${q.scaleMax || 5}: Strongly Agree`}</span>
                          </div>

                          {/* Pill Options */}
                          <div className="flex items-center gap-2 flex-wrap justify-between">
                            {Array.from({ length: q.scaleMax || 5 }, (_, i) => i + 1).map((val) => {
                              const isSelected = currentSelected[0] === String(val);
                              return (
                                <button
                                  type="button"
                                  key={val}
                                  onClick={() => handleScaleSelect(q.id, val)}
                                  className={cn(
                                    "flex-1 min-w-[36px] h-10 rounded-lg border font-mono text-sm font-semibold transition-all cursor-pointer flex items-center justify-center",
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground shadow-sm scale-105"
                                      : "border-border hover:bg-muted text-foreground/80"
                                  )}
                                >
                                  {val}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 6. FILE UPLOAD */}
                      {isFileUpload && (
                        <div className="space-y-3">
                          <div className="p-4 border border-dashed border-border rounded-xl bg-muted/20 text-center space-y-2">
                            {uploadingQuestionId === q.id ? (
                              <div className="flex flex-col items-center justify-center gap-2 py-4">
                                <Loader2 className="size-6 animate-spin text-primary" />
                                <span className="text-xs text-muted-foreground">
                                  Uploading file...
                                </span>
                              </div>
                            ) : currentSelected[0] ? (
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-card border border-emerald-500/30 rounded-lg text-left">
                                <div className="flex items-center gap-2 min-w-0">
                                  <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                                  <div className="truncate text-xs">
                                    <p className="font-semibold text-foreground truncate">
                                      {currentSelected[1] || "Uploaded file"}
                                    </p>
                                    <a
                                      href={currentSelected[0]}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary hover:underline text-[11px] truncate block"
                                    >
                                      View submitted file
                                    </a>
                                  </div>
                                </div>
                                <label className="text-xs text-primary font-semibold hover:underline cursor-pointer shrink-0">
                                  <span>Choose another file</span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept={q.fileAcceptedTypes || "*"}
                                    onChange={(e) => handleFileUpload(q.id, e)}
                                  />
                                </label>
                              </div>
                            ) : (
                              <div className="py-3">
                                <Upload className="size-6 mx-auto text-muted-foreground mb-1" />
                                <p className="text-xs font-semibold text-foreground">
                                  Choose a file from your computer to submit
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {q.fileAcceptedTypes
                                    ? `Accepted: ${q.fileAcceptedTypes} `
                                    : ""}
                                  (Maximum size 5MB)
                                </p>
                                <label className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer hover:bg-primary/90 transition-colors shadow-xs">
                                  <span>Upload file</span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept={q.fileAcceptedTypes || "*"}
                                    onChange={(e) => handleFileUpload(q.id, e)}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Submit bar */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground font-mono">
                    Answered {answeredCount}/{questions.length} questions
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="gap-2 font-semibold shadow-sm cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Grading quiz...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        <span>Submit Assessment</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
