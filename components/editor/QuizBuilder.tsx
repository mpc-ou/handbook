"use client";

import React, { useState, useEffect } from "react";
import { QuizQuestion, QuizQuestionType } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, getYoutubeEmbedUrl } from "@/lib/utils";
import { uploadToCloudinary, MAX_FILE_SIZE_BYTES } from "@/lib/cloudinary";
import {
  HelpCircle,
  Plus,
  Trash2,
  Clock,
  RotateCcw,
  Sliders,
  Upload,
  AlignLeft,
  Type,
  FileCheck2,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  Loader2,
  X,
  ChevronDown,
  ExternalLink,
} from "lucide-react";

interface QuizBuilderProps {
  questions: QuizQuestion[];
  passScorePercent: number;
  durationMinutes?: number;
  maxAttempts?: number;
  isExam?: boolean;
  onPassScoreChange: (score: number) => void;
  onDurationMinutesChange?: (minutes: number) => void;
  onMaxAttemptsChange?: (attempts: number) => void;
  onIsExamChange?: (isExam: boolean) => void;
  onChange: (questions: QuizQuestion[]) => void;
}

export function QuizBuilder({
  questions,
  passScorePercent,
  durationMinutes = 0,
  maxAttempts = 0,
  isExam = false,
  onPassScoreChange,
  onDurationMinutesChange,
  onMaxAttemptsChange,
  onIsExamChange,
  onChange,
}: QuizBuilderProps) {
  const [uploadingQId, setUploadingQId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Auto-sanitize existing questions: enforce single-choice has at most 1 correct option
  useEffect(() => {
    let changed = false;
    const sanitized = questions.map((q) => {
      const isSingle = q.type === "single" || !q.type;
      if (isSingle && q.correctOptionIds && q.correctOptionIds.length > 1) {
        changed = true;
        return {
          ...q,
          type: "single" as const,
          correctOptionIds: [q.correctOptionIds[0]],
        };
      }
      return q;
    });
    if (changed) {
      onChange(sanitized);
    }
  }, [questions, onChange]);

  const handleAddQuestion = (type: QuizQuestionType = "single") => {
    const qId = `q_${Date.now()}`;
    let newQ: QuizQuestion;

    if (type === "single") {
      newQ = {
        id: qId,
        questionText: "",
        type: "single",
        options: [
          { id: `${qId}_opt1`, text: "Option A" },
          { id: `${qId}_opt2`, text: "Option B" },
          { id: `${qId}_opt3`, text: "Option C" },
        ],
        correctOptionIds: [`${qId}_opt1`],
        explanation: "",
      };
    } else if (type === "multiple") {
      newQ = {
        id: qId,
        questionText: "",
        type: "multiple",
        options: [
          { id: `${qId}_opt1`, text: "Option A" },
          { id: `${qId}_opt2`, text: "Option B" },
          { id: `${qId}_opt3`, text: "Option C" },
        ],
        correctOptionIds: [`${qId}_opt1`],
        explanation: "",
      };
    } else if (type === "fill_blank") {
      newQ = {
        id: qId,
        questionText: "",
        type: "fill_blank",
        options: [],
        correctOptionIds: [],
        correctTextAnswer: "",
        explanation: "",
      };
    } else if (type === "essay") {
      newQ = {
        id: qId,
        questionText: "",
        type: "essay",
        options: [],
        correctOptionIds: [],
        explanation: "",
      };
    } else if (type === "scale") {
      newQ = {
        id: qId,
        questionText: "",
        type: "scale",
        options: [],
        correctOptionIds: [],
        scaleMax: 5,
        scaleMinLabel: "Strongly Disagree",
        scaleMaxLabel: "Strongly Agree",
        explanation: "",
      };
    } else if (type === "file_upload") {
      newQ = {
        id: qId,
        questionText: "",
        type: "file_upload",
        options: [],
        correctOptionIds: [],
        fileAcceptedTypes: ".pdf, .zip, .png, .jpg",
        explanation: "",
      };
    } else {
      newQ = {
        id: qId,
        questionText: "",
        type: "single",
        options: [
          { id: `${qId}_opt1`, text: "Option A" },
          { id: `${qId}_opt2`, text: "Option B" },
          { id: `${qId}_opt3`, text: "Option C" },
        ],
        correctOptionIds: [`${qId}_opt1`],
        explanation: "",
      };
    }

    onChange([...questions, newQ]);
    if (passScorePercent === 0) {
      onPassScoreChange(80);
    }
  };

  const updateQuestion = (qId: string, patch: Partial<QuizQuestion>) => {
    onChange(questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (qId: string) => {
    const next = questions.filter((q) => q.id !== qId);
    onChange(next);
    if (next.length === 0) {
      onPassScoreChange(0);
    }
  };

  const addOption = (q: QuizQuestion) => {
    const newOptId = `${q.id}_opt_${Date.now().toString().slice(-3)}`;
    updateQuestion(q.id, {
      options: [...(q.options || []), { id: newOptId, text: "New Option" }],
    });
  };

  const removeOption = (q: QuizQuestion, optId: string) => {
    if ((q.options || []).length <= 2) return;
    updateQuestion(q.id, {
      options: q.options.filter((o) => o.id !== optId),
      correctOptionIds: (q.correctOptionIds || []).filter((id) => id !== optId),
    });
  };

  const toggleCorrectOption = (q: QuizQuestion, optId: string) => {
    if (q.type === "single") {
      updateQuestion(q.id, { correctOptionIds: [optId] });
      return;
    }
    const current = q.correctOptionIds || [];
    const exists = current.includes(optId);
    const next = exists
      ? current.filter((id) => id !== optId)
      : [...current, optId];
    if (next.length > 0) {
      updateQuestion(q.id, { correctOptionIds: next });
    }
  };

  const handleUploadQuestionImage = async (
    qId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError("Uploaded image exceeds the 5MB size limit.");
      return;
    }

    try {
      setUploadingQId(qId);
      setUploadError(null);
      const url = await uploadToCloudinary(file);
      updateQuestion(qId, {
        attachmentType: "image",
        attachmentUrl: url,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingQId(null);
    }
  };

  return (
    <Card className="bg-muted/20 border-border">
      {/* Quiz Top Settings Header */}
      <CardHeader className="border-b border-border pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <HelpCircle className="size-5 text-primary" />
                <CardTitle className="text-base font-bold">
                  Lesson Assessment
                </CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure question banks, passing thresholds, timer limits, and roadmap unlock gates.
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 self-start sm:self-auto cursor-pointer font-semibold shadow-xs"
                >
                  <Plus className="size-4" />
                  <span>Add Question</span>
                  <ChevronDown className="size-3.5 opacity-70 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1">
                <DropdownMenuItem
                  onClick={() => handleAddQuestion("single")}
                  className="gap-2.5 cursor-pointer text-xs py-2"
                >
                  <span className="size-2 rounded-full bg-primary shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Single Choice</span>
                    <span className="text-[10px] text-muted-foreground">Select exactly 1 correct option</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleAddQuestion("multiple")}
                  className="gap-2.5 cursor-pointer text-xs py-2"
                >
                  <span className="size-2 rounded-xs border-2 border-primary shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Multiple Choice</span>
                    <span className="text-[10px] text-muted-foreground">Select one or more correct options</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleAddQuestion("fill_blank")}
                  className="gap-2.5 cursor-pointer text-xs py-2"
                >
                  <Type className="size-3.5 text-blue-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Fill in the Blank</span>
                    <span className="text-[10px] text-muted-foreground">Automated case-insensitive text matching</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleAddQuestion("essay")}
                  className="gap-2.5 cursor-pointer text-xs py-2"
                >
                  <AlignLeft className="size-3.5 text-purple-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Essay / Written Answer</span>
                    <span className="text-[10px] text-muted-foreground">Long-form text response graded by evaluators</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleAddQuestion("scale")}
                  className="gap-2.5 cursor-pointer text-xs py-2"
                >
                  <Sliders className="size-3.5 text-amber-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">Rating Scale (1 → X)</span>
                    <span className="text-[10px] text-muted-foreground">Likert rating scale from 1 to 5 or 10</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleAddQuestion("file_upload")}
                  className="gap-2.5 cursor-pointer text-xs py-2"
                >
                  <Upload className="size-3.5 text-emerald-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">File Upload Submission</span>
                    <span className="text-[10px] text-muted-foreground">Attach project files (PDF, ZIP, image, etc.)</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Quick Quiz Parameters Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-card rounded-xl border border-border/80">
            {/* 1. Pass Score */}
            <div className="space-y-1">
              <Label htmlFor="passScoreInput" className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <FileCheck2 className="size-3 text-primary" /> Passing Score (%)
              </Label>
              <Input
                id="passScoreInput"
                type="number"
                min={0}
                max={100}
                step={5}
                value={passScorePercent}
                onChange={(e) => onPassScoreChange(Number(e.target.value))}
                className="h-8 text-center font-mono tabular-nums text-xs font-semibold"
              />
            </div>

            {/* 2. Duration Countdown Timer (Minutes) */}
            <div className="space-y-1">
              <Label htmlFor="durationMinutesInput" className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <Clock className="size-3 text-amber-500" /> Time Limit (min)
              </Label>
              <Input
                id="durationMinutesInput"
                type="number"
                min={0}
                max={180}
                step={5}
                placeholder="0 = Unlimited"
                value={durationMinutes || ""}
                onChange={(e) => onDurationMinutesChange?.(Number(e.target.value) || 0)}
                className="h-8 text-center font-mono tabular-nums text-xs"
              />
            </div>

            {/* 3. Max Attempts */}
            <div className="space-y-1">
              <Label htmlFor="maxAttemptsInput" className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <RotateCcw className="size-3 text-blue-500" /> Max Attempts
              </Label>
              <Input
                id="maxAttemptsInput"
                type="number"
                min={0}
                max={10}
                placeholder="0 = Unlimited"
                value={maxAttempts || ""}
                onChange={(e) => onMaxAttemptsChange?.(Number(e.target.value) || 0)}
                className="h-8 text-center font-mono tabular-nums text-xs"
              />
            </div>

            {/* 4. Exam Mode Switch */}
            <div className="space-y-1 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-2 pt-1">
                <Label htmlFor="examSwitch" className="text-[11px] text-muted-foreground font-medium cursor-pointer">
                  Examination Mode
                </Label>
                <Switch
                  id="examSwitch"
                  checked={Boolean(isExam)}
                  onCheckedChange={(checked) => onIsExamChange?.(checked)}
                />
              </div>
              <span className="text-[10px] text-muted-foreground/70 line-clamp-1">
                {isExam ? "Timed & window blur guards" : "Open self-paced practice"}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {uploadError && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
            {uploadError}
          </div>
        )}

        {questions.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-card/40 space-y-2">
            <HelpCircle className="size-8 mx-auto text-muted-foreground/40" />
            <p className="font-medium text-foreground">No assessment questions added yet</p>
            <p className="max-w-md mx-auto text-[11px]">
              This lesson currently has no required quiz. Click &ldquo;Add Question&rdquo; to create review questions before unlocking subsequent lessons.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const youtubeEmbed =
                q.attachmentType === "youtube" && q.attachmentUrl
                  ? getYoutubeEmbedUrl(q.attachmentUrl)
                  : null;

              return (
                <Card key={q.id} className="p-4 gap-3 bg-card border-border shadow-2xs">
                  {/* Question Header: Number + Fixed Type Badge + Delete Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="info" className="text-xs px-2 py-0.5">
                        Question #{idx + 1}
                      </Badge>

                      {/* Question Fixed Type Badge */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-default select-none">
                            {q.type === "single" || !q.type ? (
                              <Badge variant="outline" className="text-xs py-0.5 px-2.5 gap-1.5 font-medium border-primary/30 bg-primary/5 text-foreground">
                                <span className="size-2 rounded-full bg-primary" />
                                <span>Single Choice</span>
                              </Badge>
                            ) : q.type === "multiple" ? (
                              <Badge variant="outline" className="text-xs py-0.5 px-2.5 gap-1.5 font-medium border-blue-500/30 bg-blue-500/5 text-foreground">
                                <span className="size-2 rounded-xs border-2 border-blue-500" />
                                <span>Multiple Choice</span>
                              </Badge>
                            ) : q.type === "fill_blank" ? (
                              <Badge variant="outline" className="text-xs py-0.5 px-2.5 gap-1.5 font-medium border-indigo-500/30 bg-indigo-500/5 text-foreground">
                                <Type className="size-3 text-indigo-500" />
                                <span>Fill in the Blank</span>
                              </Badge>
                            ) : q.type === "essay" ? (
                              <Badge variant="outline" className="text-xs py-0.5 px-2.5 gap-1.5 font-medium border-purple-500/30 bg-purple-500/5 text-foreground">
                                <AlignLeft className="size-3 text-purple-500" />
                                <span>Essay / Written Response (Evaluator Graded)</span>
                              </Badge>
                            ) : q.type === "scale" ? (
                              <Badge variant="outline" className="text-xs py-0.5 px-2.5 gap-1.5 font-medium border-amber-500/30 bg-amber-500/5 text-foreground">
                                <Sliders className="size-3 text-amber-500" />
                                <span>Rating Scale (1 → {q.scaleMax || 5})</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs py-0.5 px-2.5 gap-1.5 font-medium border-emerald-500/30 bg-emerald-500/5 text-foreground">
                                <Upload className="size-3 text-emerald-500" />
                                <span>File Upload</span>
                              </Badge>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs max-w-xs">
                          Question types are locked per block. To change question type, delete this item and click &ldquo;+ Add Question&rdquo;.
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeQuestion(q.id)}
                        className="text-muted-foreground hover:text-destructive cursor-pointer"
                        title="Delete question"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Question Prompt Title (Textarea) */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Question Text / Prompt (Multi-line supported):
                    </Label>
                    <Textarea
                      rows={2}
                      value={q.questionText}
                      onChange={(e) =>
                        updateQuestion(q.id, { questionText: e.target.value })
                      }
                      placeholder="Enter detailed question prompt, formatting or instructions..."
                      className="font-medium text-sm resize-y min-h-[56px] leading-relaxed"
                    />
                  </div>

                  {/* Question Attachment Tool (Image or YouTube Video) */}
                  <div className="space-y-2">
                    {q.attachmentUrl ? (
                      <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            {q.attachmentType === "image" ? (
                              <>
                                <ImageIcon className="size-3.5 text-blue-500" />
                                <span>Attached Question Image</span>
                              </>
                            ) : (
                              <>
                                <YoutubeIcon className="size-3.5 text-red-500" />
                                <span>Attached YouTube Video</span>
                              </>
                            )}
                          </span>

                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() =>
                              updateQuestion(q.id, {
                                attachmentUrl: undefined,
                                attachmentType: undefined,
                                attachmentCaption: undefined,
                              })
                            }
                            className="text-muted-foreground hover:text-destructive h-6 px-1.5 text-[11px] cursor-pointer"
                          >
                            <Trash2 className="size-3 mr-1" />
                            <span>Remove Media</span>
                          </Button>
                        </div>

                        {/* Image Preview / URL */}
                        {q.attachmentType === "image" && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={q.attachmentUrl}
                                onChange={(e) =>
                                   updateQuestion(q.id, { attachmentUrl: e.target.value })
                                }
                                placeholder="Paste image link or upload from your device..."
                                className="h-8 text-xs bg-background flex-1"
                              />
                              <label className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md bg-secondary text-secondary-foreground text-xs font-medium cursor-pointer hover:bg-secondary/80 shrink-0">
                                {uploadingQId === q.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Upload className="size-3.5" />
                                )}
                                <span>Upload (≤5MB)</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleUploadQuestionImage(q.id, e)}
                                />
                              </label>
                            </div>

                            {q.attachmentUrl && (
                              <div className="relative rounded-lg overflow-hidden border border-border/70 max-w-sm max-h-48 bg-black/5">
                                <img
                                  src={q.attachmentUrl}
                                  alt="Preview"
                                  className="w-full h-auto max-h-48 object-contain"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* YouTube Preview / URL */}
                        {q.attachmentType === "youtube" && (
                          <div className="space-y-2">
                            <Input
                              type="text"
                              value={q.attachmentUrl}
                              onChange={(e) =>
                                updateQuestion(q.id, { attachmentUrl: e.target.value })
                              }
                              placeholder="Paste YouTube link (e.g., https://www.youtube.com/watch?v=...)"
                              className="h-8 text-xs bg-background"
                            />

                            {youtubeEmbed ? (
                              <div className="aspect-video max-w-md rounded-lg overflow-hidden border border-border">
                                <iframe
                                  src={youtubeEmbed}
                                  title="YouTube preview"
                                  className="w-full h-full"
                                  allowFullScreen
                                />
                              </div>
                            ) : q.attachmentUrl ? (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                Please enter a valid YouTube link (youtube.com/watch?v=... or youtu.be/...)
                              </p>
                            ) : null}
                          </div>
                        )}

                        {/* Optional Media Caption */}
                        <Input
                          type="text"
                          value={q.attachmentCaption || ""}
                          onChange={(e) =>
                            updateQuestion(q.id, { attachmentCaption: e.target.value })
                          }
                          placeholder="Media caption (optional)..."
                          className="h-7 text-[11px] bg-background"
                        />
                      </div>
                    ) : (
                      /* Attachment Add Buttons */
                      <div className="flex items-center gap-2 pt-0.5">
                        <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors border border-dashed border-border/70">
                          {uploadingQId === q.id ? (
                            <Loader2 className="size-3 animate-spin text-primary" />
                          ) : (
                            <ImageIcon className="size-3 text-blue-500" />
                          )}
                          <span>+ Attach Image</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleUploadQuestionImage(q.id, e)}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuestion(q.id, {
                              attachmentType: "youtube",
                              attachmentUrl: "",
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors border border-dashed border-border/70"
                        >
                          <YoutubeIcon className="size-3 text-red-500" />
                          <span>+ Attach YouTube</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SPECIFIC CONFIGURATION BY QUESTION TYPE */}

                  {/* 1 & 2: Single / Multiple Choice Options */}
                  {(q.type === "single" || q.type === "multiple" || !q.type) && (() => {
                    const isSingle = q.type === "single" || !q.type;
                    const validCorrectIds = isSingle
                      ? ((q.correctOptionIds && q.correctOptionIds.length > 0)
                          ? [q.correctOptionIds[0]]
                          : (q.options && q.options.length > 0 ? [q.options[0].id] : []))
                      : (q.correctOptionIds || []);

                    return (
                      <div className="space-y-2 pl-1 pt-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">
                            {isSingle
                              ? "Answer Options (Click radio button to mark the single correct answer):"
                              : "Answer Options (Check boxes to mark all correct options):"}
                          </Label>
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {isSingle ? "Single correct option" : "Multiple correct options"}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {(q.options || []).map((opt) => {
                            const isCorrect = validCorrectIds.includes(opt.id);
                            return (
                              <div key={opt.id} className="flex items-start gap-2">
                                {isSingle ? (
                                  <button
                                    type="button"
                                    onClick={() => updateQuestion(q.id, { correctOptionIds: [opt.id] })}
                                    title="Mark as single correct answer"
                                    className={cn(
                                      "mt-2.5 size-4 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all",
                                      isCorrect
                                        ? "border-emerald-600 bg-emerald-600 ring-2 ring-emerald-500/20"
                                        : "border-muted-foreground/40 hover:border-emerald-500 bg-background"
                                    )}
                                  >
                                    {isCorrect && <span className="size-1.5 rounded-full bg-white" />}
                                  </button>
                                ) : (
                                  <Checkbox
                                    checked={isCorrect}
                                    onCheckedChange={() => toggleCorrectOption(q, opt.id)}
                                    title="Mark as correct answer"
                                    className="mt-2.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 cursor-pointer shrink-0"
                                  />
                                )}
                                <Textarea
                                  rows={1}
                                  value={opt.text}
                                  onChange={(e) =>
                                    updateQuestion(q.id, {
                                      options: (q.options || []).map((o) =>
                                        o.id === opt.id
                                          ? { ...o, text: e.target.value }
                                          : o
                                      ),
                                    })
                                  }
                                  placeholder="Enter answer option..."
                                  className={cn(
                                    "min-h-[38px] py-2 text-xs flex-1 transition-colors resize-y leading-snug font-sans",
                                    isCorrect &&
                                      "border-emerald-500 bg-emerald-500/10 font-medium"
                                  )}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => removeOption(q, opt.id)}
                                  disabled={(q.options || []).length <= 2}
                                  className="text-muted-foreground hover:text-destructive cursor-pointer h-8 px-2 mt-1 shrink-0"
                                >
                                  Delete
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          size="xs"
                          onClick={() => addOption(q)}
                          className="px-0 text-primary cursor-pointer"
                        >
                          + Add Option
                        </Button>
                      </div>
                    );
                  })()}

                  {/* 3: Fill Blank (Short answer) */}
                  {q.type === "fill_blank" && (
                    <div className="space-y-2 p-3 rounded-lg bg-muted/40 border border-border/60">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Type className="size-3.5 text-blue-500" />
                          Expected Answer (Text keyword / short phrase):
                        </Label>
                        <Textarea
                          rows={1}
                          value={q.correctTextAnswer || ""}
                          onChange={(e) =>
                            updateQuestion(q.id, { correctTextAnswer: e.target.value })
                          }
                          placeholder="Enter expected text answer (or comma-separated valid variations, e.g.: git, git version control)..."
                          className="min-h-[38px] text-xs bg-background resize-y"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          The system matches text automatically (case-insensitive) upon submission.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 4: Essay */}
                  {q.type === "essay" && (
                    <div className="space-y-2 p-3.5 rounded-lg bg-purple-500/5 border border-purple-500/20">
                      <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold text-xs">
                        <AlignLeft className="size-3.5" />
                        <span>Essay / Open-ended Written Response (Evaluator Graded)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Students submit written explanations or solutions. The submission enters <strong>&ldquo;Pending Review&rdquo;</strong> until an Administrator or Evaluator assigns a passing score.
                      </p>
                    </div>
                  )}

                  {/* 5: Scale */}
                  {q.type === "scale" && (
                    <div className="space-y-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <Sliders className="size-3.5" /> Rating Scale:
                        </span>
                        <Select
                          value={String(q.scaleMax || 5)}
                          onValueChange={(val) =>
                            updateQuestion(q.id, { scaleMax: Number(val) })
                          }
                        >
                          <SelectTrigger className="w-36 h-7 text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">Scale 1 to 5</SelectItem>
                            <SelectItem value="10">Scale 1 to 10</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Minimum Rating Label (1):
                          </Label>
                          <Input
                            type="text"
                            value={q.scaleMinLabel || ""}
                            onChange={(e) =>
                              updateQuestion(q.id, { scaleMinLabel: e.target.value })
                            }
                            placeholder="e.g. Strongly Disagree"
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Maximum Rating Label ({q.scaleMax || 5}):
                          </Label>
                          <Input
                            type="text"
                            value={q.scaleMaxLabel || ""}
                            onChange={(e) =>
                              updateQuestion(q.id, { scaleMaxLabel: e.target.value })
                            }
                            placeholder="e.g. Strongly Agree"
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6: File Upload */}
                  {q.type === "file_upload" && (
                    <div className="space-y-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                        <Upload className="size-3.5" />
                        <span>File Upload Requirement (Maximum 5MB)</span>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          Allowed / Recommended File Extensions:
                        </Label>
                        <Input
                          type="text"
                          value={q.fileAcceptedTypes || ""}
                          onChange={(e) =>
                            updateQuestion(q.id, { fileAcceptedTypes: e.target.value })
                          }
                          placeholder="e.g. .pdf, .zip, .png, .jpg, .docx"
                          className="h-8 text-xs bg-background"
                        />
                      </div>
                    </div>
                  )}

                  {/* Explanation / Grading Guideline */}
                  <div className="pt-1">
                    <Textarea
                      rows={2}
                      value={q.explanation || ""}
                      onChange={(e) =>
                        updateQuestion(q.id, { explanation: e.target.value })
                      }
                      placeholder="Answer explanation or evaluation rubric (displayed to students after completion)..."
                      className="min-h-[44px] text-xs bg-muted/30 resize-y"
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
