"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  AlertTriangle,
  AlignLeft,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Copy,
  FileCheck2,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  Type,
  Upload,
  Youtube as YoutubeIcon,
} from "lucide-react";

const ALL_QUESTION_TYPES: readonly QuizQuestionType[] = [
  "single",
  "multiple",
  "fill_blank",
  "scale",
  "essay",
  "file_upload",
  "code_submission",
];

export interface QuizBuilderProps {
  questions: QuizQuestion[];
  passScorePercent: number;
  durationMinutes?: number;
  maxAttempts?: number;
  isExam?: boolean;
  allowedTypes?: readonly QuizQuestionType[];
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
  allowedTypes,
  onPassScoreChange,
  onDurationMinutesChange,
  onMaxAttemptsChange,
  onIsExamChange,
  onChange,
}: QuizBuilderProps) {
  const t = useTranslations("editor.quiz");
  const [uploadingQId, setUploadingQId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const availableTypes: readonly QuizQuestionType[] =
    allowedTypes && allowedTypes.length > 0 ? allowedTypes : ALL_QUESTION_TYPES;
  const defaultQuestionType: QuizQuestionType = availableTypes[0] ?? "single";

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

  const buildQuestionForType = (
    qId: string,
    type: QuizQuestionType,
    existing?: Partial<QuizQuestion>
  ): QuizQuestion => {
    const base: QuizQuestion = {
      id: qId,
      questionText: existing?.questionText ?? "",
      type,
      options: existing?.options ?? [],
      correctOptionIds: existing?.correctOptionIds ?? [],
      explanation: existing?.explanation ?? "",
      points: existing?.points,
      attachmentType: existing?.attachmentType,
      attachmentUrl: existing?.attachmentUrl,
      attachmentCaption: existing?.attachmentCaption,
    };

    if (type === "single" || type === "multiple") {
      const hasValidOptions = (existing?.options?.length ?? 0) >= 2;
      const options = hasValidOptions
        ? existing!.options!
        : [
            { id: `${qId}_opt1`, text: t("defaultOption", { label: "A" }) },
            { id: `${qId}_opt2`, text: t("defaultOption", { label: "B" }) },
            { id: `${qId}_opt3`, text: t("defaultOption", { label: "C" }) },
          ];
      const existingCorrect = (existing?.correctOptionIds ?? []).filter((id) =>
        options.some((o) => o.id === id)
      );
      const correctOptionIds =
        existingCorrect.length > 0
          ? type === "single"
            ? [existingCorrect[0]]
            : existingCorrect
          : [options[0].id];

      return {
        ...base,
        options,
        correctOptionIds,
      };
    }

    if (type === "fill_blank") {
      return {
        ...base,
        options: [],
        correctOptionIds: [],
        correctTextAnswer: existing?.correctTextAnswer ?? "",
      };
    }

    if (type === "scale") {
      return {
        ...base,
        options: [],
        correctOptionIds: [],
        scaleMax: existing?.scaleMax ?? 5,
        scaleMinLabel: existing?.scaleMinLabel ?? t("scaleMinDefault"),
        scaleMaxLabel: existing?.scaleMaxLabel ?? t("scaleMaxDefault"),
      };
    }

    if (type === "file_upload") {
      return {
        ...base,
        options: [],
        correctOptionIds: [],
        fileAcceptedTypes:
          existing?.fileAcceptedTypes ?? ".pdf, .zip, .png, .jpg",
      };
    }

    if (type === "code_submission") {
      return {
        ...base,
        options: [],
        correctOptionIds: [],
        sampleCode: existing?.sampleCode ?? "",
      };
    }

    // essay
    return {
      ...base,
      options: [],
      correctOptionIds: [],
    };
  };

  const handleAddQuestion = (type: QuizQuestionType = defaultQuestionType) => {
    const targetType = availableTypes.includes(type)
      ? type
      : defaultQuestionType;
    const qId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const newQ = buildQuestionForType(qId, targetType);

    onChange([...questions, newQ]);
    if (passScorePercent === 0) {
      onPassScoreChange(80);
    }
  };

  const updateQuestion = (qId: string, patch: Partial<QuizQuestion>) => {
    onChange(questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)));
  };

  const handleChangeQuestionType = (
    q: QuizQuestion,
    nextType: QuizQuestionType
  ) => {
    if ((q.type || "single") === nextType) return;
    const converted = buildQuestionForType(q.id, nextType, q);
    onChange(questions.map((item) => (item.id === q.id ? converted : item)));
  };

  const removeQuestion = (qId: string) => {
    const next = questions.filter((q) => q.id !== qId);
    onChange(next);
    if (next.length === 0) {
      onPassScoreChange(0);
    }
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const next = [...questions];
    const [removed] = next.splice(index, 1);
    next.splice(targetIdx, 0, removed);
    onChange(next);
  };

  const duplicateQuestion = (index: number) => {
    const source = questions[index];
    const newId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const oldToNewOptId = new Map<string, string>();
    const duplicatedOptions = (source.options || []).map((opt, oIdx) => {
      const nextOptId = `${newId}_opt_${oIdx + 1}`;
      oldToNewOptId.set(opt.id, nextOptId);
      return { ...opt, id: nextOptId };
    });
    const duplicatedCorrect = (source.correctOptionIds || []).map(
      (id) => oldToNewOptId.get(id) ?? id
    );
    const clone: QuizQuestion = {
      ...source,
      id: newId,
      options: duplicatedOptions,
      correctOptionIds: duplicatedCorrect,
    };
    const next = [...questions];
    next.splice(index + 1, 0, clone);
    onChange(next);
  };

  const toggleCollapse = (qId: string) => {
    setCollapsedMap((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const allCollapsed =
    questions.length > 0 && questions.every((q) => Boolean(collapsedMap[q.id]));

  const toggleAllCollapsed = () => {
    if (allCollapsed) {
      setCollapsedMap({});
    } else {
      const next: Record<string, boolean> = {};
      questions.forEach((q) => {
        next[q.id] = true;
      });
      setCollapsedMap(next);
    }
  };

  const addOption = (q: QuizQuestion) => {
    const newOptId = `${q.id}_opt_${Date.now().toString().slice(-3)}`;
    updateQuestion(q.id, {
      options: [...(q.options || []), { id: newOptId, text: t("newOption") }],
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
    if (q.type === "single" || !q.type) {
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
      setUploadError(t("imageSizeError"));
      e.target.value = "";
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
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error && err.message
          ? err.message
          : t("imageUploadError")
      );
    } finally {
      setUploadingQId(null);
      e.target.value = "";
    }
  };

  const renderTypeIcon = (type: QuizQuestionType) => {
    switch (type) {
      case "single":
        return <span className="size-2 rounded-full bg-primary shrink-0" />;
      case "multiple":
        return (
          <span className="size-2 rounded-xs border-2 border-primary shrink-0" />
        );
      case "fill_blank":
        return <Type className="size-3.5 text-primary shrink-0" />;
      case "scale":
        return <Sliders className="size-3.5 text-primary shrink-0" />;
      case "essay":
        return <AlignLeft className="size-3.5 text-primary shrink-0" />;
      case "file_upload":
        return <Upload className="size-3.5 text-primary shrink-0" />;
      case "code_submission":
        return <Code className="size-3.5 text-primary shrink-0" />;
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
                  {t("title")}
                </CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {questions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllCollapsed}
                  className="text-xs cursor-pointer"
                >
                  {allCollapsed ? t("expandAll") : t("collapseAll")}
                </Button>
              )}

              {availableTypes.length === 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAddQuestion(availableTypes[0])}
                  className="gap-1.5 cursor-pointer font-semibold shadow-xs"
                >
                  <Plus className="size-4" />
                  <span>{t("addQuestion")}</span>
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 cursor-pointer font-semibold shadow-xs"
                    >
                      <Plus className="size-4" />
                      <span>{t("addQuestion")}</span>
                      <ChevronDown className="size-3.5 opacity-70 ml-0.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-1">
                    {availableTypes.map((qType) => (
                      <DropdownMenuItem
                        key={qType}
                        onClick={() => handleAddQuestion(qType)}
                        className="gap-2.5 cursor-pointer text-xs py-2"
                      >
                        {renderTypeIcon(qType)}
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {t(`types.${qType}.label`)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {t(`types.${qType}.description`)}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Quick Quiz Parameters Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-card rounded-xl border border-border/80">
            {/* 1. Pass Score */}
            <div className="space-y-1">
              <Label
                htmlFor="passScoreInput"
                className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium"
              >
                <FileCheck2 className="size-3 text-primary" />
                <span>{t("passScore")}</span>
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
              <Label
                htmlFor="durationMinutesInput"
                className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium"
              >
                <Clock className="size-3 text-muted-foreground" />
                <span>{t("durationMinutes")}</span>
              </Label>
              <Input
                id="durationMinutesInput"
                type="number"
                min={0}
                max={180}
                step={5}
                placeholder={t("unlimitedPlaceholder")}
                value={durationMinutes || ""}
                onChange={(e) =>
                  onDurationMinutesChange?.(Number(e.target.value) || 0)
                }
                className="h-8 text-center font-mono tabular-nums text-xs"
              />
            </div>

            {/* 3. Max Attempts */}
            <div className="space-y-1">
              <Label
                htmlFor="maxAttemptsInput"
                className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium"
              >
                <RotateCcw className="size-3 text-muted-foreground" />
                <span>{t("maxAttempts")}</span>
              </Label>
              <Input
                id="maxAttemptsInput"
                type="number"
                min={0}
                max={10}
                placeholder={t("unlimitedPlaceholder")}
                value={maxAttempts || ""}
                onChange={(e) =>
                  onMaxAttemptsChange?.(Number(e.target.value) || 0)
                }
                className="h-8 text-center font-mono tabular-nums text-xs"
              />
            </div>

            {/* 4. Exam Mode Switch */}
            <div className="space-y-1 flex flex-col justify-center">
              <div className="flex items-center justify-between gap-2 pt-1">
                <Label
                  htmlFor="examSwitch"
                  className="text-[11px] text-muted-foreground font-medium cursor-pointer"
                >
                  {t("examMode")}
                </Label>
                <Switch
                  id="examSwitch"
                  checked={Boolean(isExam)}
                  onCheckedChange={(checked) => onIsExamChange?.(checked)}
                />
              </div>
              <span className="text-[10px] text-muted-foreground/70 line-clamp-1">
                {isExam ? t("examModeOnHint") : t("examModeOffHint")}
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
            <p className="font-medium text-foreground">{t("emptyTitle")}</p>
            <p className="max-w-md mx-auto text-[11px]">
              {t("emptyDescription")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const qType: QuizQuestionType = q.type || "single";
              const isDisallowed = Boolean(
                allowedTypes &&
                  allowedTypes.length > 0 &&
                  !allowedTypes.includes(qType)
              );
              const isCollapsed = Boolean(collapsedMap[q.id]);
              const youtubeEmbed =
                q.attachmentType === "youtube" && q.attachmentUrl
                  ? getYoutubeEmbedUrl(q.attachmentUrl)
                  : null;

              return (
                <Card
                  key={q.id}
                  className={cn(
                    "p-3.5 gap-3 bg-card border-border shadow-2xs transition-colors",
                    isDisallowed && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  {/* Collapsible Question Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleCollapse(q.id)}
                        title={t("toggleCollapse")}
                        aria-label={t("toggleCollapse")}
                        className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </button>

                      <span
                        onClick={() => toggleCollapse(q.id)}
                        className="text-xs font-semibold text-foreground shrink-0 cursor-pointer select-none"
                      >
                        {t("questionIndex", { index: idx + 1 })}
                      </span>

                      {/* Question Type Selector (only shows availableTypes) */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer shrink-0",
                              isDisallowed
                                ? "border-destructive/50 bg-destructive/10 text-destructive"
                                : "border-border bg-muted/40 text-foreground hover:bg-muted"
                            )}
                            title={t("changeType")}
                          >
                            {isDisallowed ? (
                              <AlertTriangle className="size-3 text-destructive shrink-0" />
                            ) : (
                              renderTypeIcon(qType)
                            )}
                            <span>{t(`types.${qType}.label`)}</span>
                            <ChevronDown className="size-3 opacity-60" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-60 p-1">
                          <DropdownMenuLabel className="text-[11px] text-muted-foreground px-2 py-1">
                            {t("changeType")}
                          </DropdownMenuLabel>
                          {availableTypes.map((allowedType) => (
                            <DropdownMenuItem
                              key={allowedType}
                              onClick={() =>
                                handleChangeQuestionType(q, allowedType)
                              }
                              className="gap-2 cursor-pointer text-xs py-1.5"
                            >
                              {renderTypeIcon(allowedType)}
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  {t(`types.${allowedType}.label`)}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {t(`types.${allowedType}.description`)}
                                </span>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {isDisallowed && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0 shrink-0"
                        >
                          {t("disallowedTypeBadge")}
                        </Badge>
                      )}

                      {/* Collapsed question text preview */}
                      {isCollapsed && (
                        <span
                          onClick={() => toggleCollapse(q.id)}
                          className="text-xs text-muted-foreground truncate cursor-pointer flex-1"
                        >
                          {q.questionText.trim() || t("untitledQuestion")}
                        </span>
                      )}
                    </div>

                    {/* Right Controls: Points + More menu (⋯) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                        <Label
                          htmlFor={`points_${q.id}`}
                          className="text-[11px] text-muted-foreground"
                        >
                          {t("pointsLabel")}:
                        </Label>
                        <Input
                          id={`points_${q.id}`}
                          type="number"
                          min={0}
                          max={100}
                          value={q.points ?? 1}
                          onChange={(e) =>
                            updateQuestion(q.id, {
                              points: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="h-7 w-14 text-center font-mono text-xs px-1.5"
                        />
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                            title={t("moreActions")}
                            aria-label={t("moreActions")}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuItem
                            disabled={idx === 0}
                            onClick={() => moveQuestion(idx, "up")}
                            className="gap-2 cursor-pointer"
                          >
                            <ArrowUp className="size-3.5" />
                            <span>{t("moveUp")}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={idx === questions.length - 1}
                            onClick={() => moveQuestion(idx, "down")}
                            className="gap-2 cursor-pointer"
                          >
                            <ArrowDown className="size-3.5" />
                            <span>{t("moveDown")}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => duplicateQuestion(idx)}
                            className="gap-2 cursor-pointer"
                          >
                            <Copy className="size-3.5" />
                            <span>{t("duplicate")}</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => removeQuestion(q.id)}
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                            <span>{t("deleteQuestion")}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Warning Banner for Disallowed Question Type */}
                  {isDisallowed && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 space-y-2 text-xs">
                      <div className="flex items-start gap-2 text-destructive">
                        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                        <span>
                          {t("disallowedTypeWarning", {
                            type: t(`types.${qType}.label`),
                          })}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-6">
                        {availableTypes.map((allowedType) => (
                          <Button
                            key={allowedType}
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() =>
                              handleChangeQuestionType(q, allowedType)
                            }
                            className="h-7 text-xs bg-background cursor-pointer"
                          >
                            {t("switchToType", {
                              type: t(`types.${allowedType}.label`),
                            })}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expanded Question Body */}
                  {!isCollapsed && (
                    <div className="space-y-3 pt-2 border-t border-border/50">
                      {/* Question Prompt Title (Textarea) */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {t("promptLabel")}
                        </Label>
                        <Textarea
                          rows={2}
                          value={q.questionText}
                          onChange={(e) =>
                            updateQuestion(q.id, {
                              questionText: e.target.value,
                            })
                          }
                          placeholder={t("promptPlaceholder")}
                          className="font-medium text-sm resize-y min-h-[56px] leading-relaxed"
                        />
                      </div>

                      {/* Question Attachment Tool (Image or YouTube Video) */}
                      <div className="space-y-2">
                        {q.attachmentUrl !== undefined && q.attachmentType ? (
                          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                {q.attachmentType === "image" ? (
                                  <>
                                    <ImageIcon className="size-3.5 text-primary" />
                                    <span>{t("attachedImage")}</span>
                                  </>
                                ) : (
                                  <>
                                    <YoutubeIcon className="size-3.5 text-red-500" />
                                    <span>{t("attachedYoutube")}</span>
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
                                <span>{t("removeMedia")}</span>
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
                                      updateQuestion(q.id, {
                                        attachmentUrl: e.target.value,
                                      })
                                    }
                                    placeholder={t("imageUrlPlaceholder")}
                                    className="h-8 text-xs bg-background flex-1"
                                  />
                                  <label className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md bg-secondary text-secondary-foreground text-xs font-medium cursor-pointer hover:bg-secondary/80 shrink-0">
                                    {uploadingQId === q.id ? (
                                      <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                      <Upload className="size-3.5" />
                                    )}
                                    <span>{t("uploadImageBtn")}</span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="image/*"
                                      onChange={(e) =>
                                        handleUploadQuestionImage(q.id, e)
                                      }
                                    />
                                  </label>
                                </div>

                                {q.attachmentUrl && (
                                  <div className="relative rounded-lg overflow-hidden border border-border/70 max-w-sm max-h-48 bg-black/5">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={q.attachmentUrl}
                                      alt={t("imagePreviewAlt")}
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
                                    updateQuestion(q.id, {
                                      attachmentUrl: e.target.value,
                                    })
                                  }
                                  placeholder={t("youtubeUrlPlaceholder")}
                                  className="h-8 text-xs bg-background"
                                />

                                {youtubeEmbed ? (
                                  <div className="aspect-video max-w-md rounded-lg overflow-hidden border border-border">
                                    <iframe
                                      src={youtubeEmbed}
                                      title={t("youtubePreviewTitle")}
                                      className="w-full h-full"
                                      allowFullScreen
                                    />
                                  </div>
                                ) : q.attachmentUrl ? (
                                  <p className="text-[11px] text-destructive">
                                    {t("youtubeInvalidHint")}
                                  </p>
                                ) : null}
                              </div>
                            )}

                            {/* Optional Media Caption */}
                            <Input
                              type="text"
                              value={q.attachmentCaption || ""}
                              onChange={(e) =>
                                updateQuestion(q.id, {
                                  attachmentCaption: e.target.value,
                                })
                              }
                              placeholder={t("mediaCaptionPlaceholder")}
                              className="h-7 text-[11px] bg-background"
                            />
                          </div>
                        ) : (
                          /* Attachment Add Buttons */
                          <div className="flex items-center gap-2 pt-0.5">
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors border border-dashed border-border/70">
                              {uploadingQId === q.id ? (
                                <Loader2 className="size-3 animate-spin text-primary" />
                              ) : (
                                <ImageIcon className="size-3 text-primary" />
                              )}
                              <span>{t("attachImage")}</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) =>
                                  handleUploadQuestionImage(q.id, e)
                                }
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
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors border border-dashed border-border/70"
                            >
                              <YoutubeIcon className="size-3 text-red-500" />
                              <span>{t("attachYoutube")}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* SPECIFIC CONFIGURATION BY QUESTION TYPE */}

                      {/* 1 & 2: Single / Multiple Choice Options */}
                      {(qType === "single" || qType === "multiple") &&
                        (() => {
                          const isSingle = qType === "single";
                          const validCorrectIds = isSingle
                            ? q.correctOptionIds &&
                              q.correctOptionIds.length > 0
                              ? [q.correctOptionIds[0]]
                              : q.options && q.options.length > 0
                              ? [q.options[0].id]
                              : []
                            : q.correctOptionIds || [];

                          return (
                            <div className="space-y-2 pl-1 pt-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground">
                                  {isSingle
                                    ? t("singleOptionsLabel")
                                    : t("multipleOptionsLabel")}
                                </Label>
                                <span className="text-[11px] font-mono text-muted-foreground">
                                  {isSingle
                                    ? t("singleOptionsHint")
                                    : t("multipleOptionsHint")}
                                </span>
                              </div>

                              <div className="space-y-2">
                                {(q.options || []).map((opt) => {
                                  const isCorrect = validCorrectIds.includes(
                                    opt.id
                                  );
                                  return (
                                    <div
                                      key={opt.id}
                                      className="flex items-start gap-2"
                                    >
                                      {isSingle ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateQuestion(q.id, {
                                              correctOptionIds: [opt.id],
                                            })
                                          }
                                          title={t("markCorrectSingle")}
                                          aria-label={t("markCorrectSingle")}
                                          className={cn(
                                            "mt-2.5 size-4 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all",
                                            isCorrect
                                              ? "border-emerald-600 bg-emerald-600 ring-2 ring-emerald-500/20"
                                              : "border-muted-foreground/40 hover:border-emerald-500 bg-background"
                                          )}
                                        >
                                          {isCorrect && (
                                            <span className="size-1.5 rounded-full bg-white" />
                                          )}
                                        </button>
                                      ) : (
                                        <Checkbox
                                          checked={isCorrect}
                                          onCheckedChange={() =>
                                            toggleCorrectOption(q, opt.id)
                                          }
                                          title={t("markCorrectMultiple")}
                                          aria-label={t("markCorrectMultiple")}
                                          className="mt-2.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 cursor-pointer shrink-0"
                                        />
                                      )}
                                      <Textarea
                                        rows={1}
                                        value={opt.text}
                                        onChange={(e) =>
                                          updateQuestion(q.id, {
                                            options: (q.options || []).map(
                                              (o) =>
                                                o.id === opt.id
                                                  ? {
                                                      ...o,
                                                      text: e.target.value,
                                                    }
                                                  : o
                                            ),
                                          })
                                        }
                                        placeholder={t("optionPlaceholder")}
                                        className={cn(
                                          "min-h-[36px] py-1.5 text-xs flex-1 transition-colors resize-y leading-snug font-sans",
                                          isCorrect &&
                                            "border-emerald-500 bg-emerald-500/10 font-medium"
                                        )}
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => removeOption(q, opt.id)}
                                        disabled={(q.options || []).length <= 2}
                                        title={t("deleteOption")}
                                        aria-label={t("deleteOption")}
                                        className="text-muted-foreground hover:text-destructive cursor-pointer mt-0.5 shrink-0"
                                      >
                                        <Trash2 className="size-3.5" />
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
                                <Plus className="size-3.5 mr-1" />
                                <span>{t("addOption")}</span>
                              </Button>
                            </div>
                          );
                        })()}

                      {/* 3: Fill Blank (Short answer) */}
                      {qType === "fill_blank" && (
                        <div className="space-y-2 p-3 rounded-lg bg-muted/40 border border-border/60">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <Type className="size-3.5 text-primary" />
                              <span>{t("fillBlankLabel")}</span>
                            </Label>
                            <Textarea
                              rows={1}
                              value={q.correctTextAnswer || ""}
                              onChange={(e) =>
                                updateQuestion(q.id, {
                                  correctTextAnswer: e.target.value,
                                })
                              }
                              placeholder={t("fillBlankPlaceholder")}
                              className="min-h-[38px] text-xs bg-background resize-y"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              {t("fillBlankHint")}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 4: Essay */}
                      {qType === "essay" && (
                        <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border/60">
                          <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
                            <AlignLeft className="size-3.5 text-primary" />
                            <span>{t("essayTitle")}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {t("essayHint")}
                          </p>
                        </div>
                      )}

                      {/* 5: Scale */}
                      {qType === "scale" && (
                        <div className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <Sliders className="size-3.5 text-primary" />
                              <span>{t("scaleTitle")}</span>
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
                                <SelectItem value="5">
                                  {t("scale1To5")}
                                </SelectItem>
                                <SelectItem value="10">
                                  {t("scale1To10")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">
                                {t("scaleMinLabel")}
                              </Label>
                              <Input
                                type="text"
                                value={q.scaleMinLabel || ""}
                                onChange={(e) =>
                                  updateQuestion(q.id, {
                                    scaleMinLabel: e.target.value,
                                  })
                                }
                                placeholder={t("scaleMinDefault")}
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">
                                {t("scaleMaxLabel", { max: q.scaleMax || 5 })}
                              </Label>
                              <Input
                                type="text"
                                value={q.scaleMaxLabel || ""}
                                onChange={(e) =>
                                  updateQuestion(q.id, {
                                    scaleMaxLabel: e.target.value,
                                  })
                                }
                                placeholder={t("scaleMaxDefault")}
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 6: File Upload */}
                      {qType === "file_upload" && (
                        <div className="space-y-2 p-3 rounded-lg bg-muted/40 border border-border/60">
                          <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
                            <Upload className="size-3.5 text-primary" />
                            <span>{t("fileUploadTitle")}</span>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              {t("fileAcceptedLabel")}
                            </Label>
                            <Input
                              type="text"
                              value={q.fileAcceptedTypes || ""}
                              onChange={(e) =>
                                updateQuestion(q.id, {
                                  fileAcceptedTypes: e.target.value,
                                })
                              }
                              placeholder={t("fileAcceptedPlaceholder")}
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                        </div>
                      )}

                      {/* 7: Code Submission */}
                      {qType === "code_submission" && (
                        <div className="space-y-2 p-3 rounded-lg bg-muted/40 border border-border/60">
                          <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
                            <Code className="size-3.5 text-primary" />
                            <span>{t("codeSubmissionTitle")}</span>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">
                              {t("sampleCodeLabel")}
                            </Label>
                            <Textarea
                              rows={4}
                              value={q.sampleCode || ""}
                              onChange={(e) =>
                                updateQuestion(q.id, {
                                  sampleCode: e.target.value,
                                })
                              }
                              placeholder={t("sampleCodePlaceholder")}
                              className="min-h-[84px] font-mono text-xs bg-background resize-y"
                            />
                          </div>
                        </div>
                      )}

                      {/* Explanation / Grading Guideline */}
                      <div className="space-y-1 pt-1">
                        <Label className="text-[11px] text-muted-foreground">
                          {t("explanationLabel")}
                        </Label>
                        <Textarea
                          rows={2}
                          value={q.explanation || ""}
                          onChange={(e) =>
                            updateQuestion(q.id, {
                              explanation: e.target.value,
                            })
                          }
                          placeholder={t("explanationPlaceholder")}
                          className="min-h-[44px] text-xs bg-muted/30 resize-y"
                        />
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
