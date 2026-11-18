"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useHandbook } from "@/context/HandbookContext";
import { ApiError } from "@/lib/api-client";
import BlockNoteEditor from "@/components/editor/BlockNoteEditor";
import { AttachmentManager } from "@/components/editor/AttachmentManager";
import { QuizBuilder } from "@/components/editor/QuizBuilder";
import { ArticleRenderer } from "@/components/reader/ArticleRenderer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SearchableCombobox } from "@/components/ui/SearchableCombobox";
import { canUserManageCourse } from "@/lib/progression";
import {
  ALLOWED_QUESTION_TYPES,
  findInvalidQuestionTypes,
  hasQuiz,
} from "@/lib/quiz-rules";
import { cn } from "@/lib/utils";
import {
  estimateReadingTime,
  extractPlainTextFromBlocks,
  slugify,
} from "@/lib/seed-data";
import type {
  ContentStatus,
  EditorBlock,
  ItemAttachment,
  ItemType,
  QuizQuestion,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Eye,
  FileQuestion,
  FileText,
  FolderTree,
  HelpCircle,
  Info,
  Loader2,
  Lock,
  MoreHorizontal,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Share2,
  ShieldAlert,
} from "lucide-react";

const ITEM_TYPE_ICONS: Record<
  ItemType,
  React.ComponentType<{ className?: string }>
> = {
  CONTENT: FileText,
  QUIZ: HelpCircle,
  ASSIGNMENT: ClipboardList,
};

export default function StudioItemEditorPage() {
  const params = useParams<{ id?: string }>();
  const itemIdParam = params?.id || "new";
  const isNew = itemIdParam === "new";
  const router = useRouter();
  const searchParams = useSearchParams();
  const format = useFormatter();
  const t = useTranslations("studioItems.editor");
  const tc = useTranslations("common");

  const {
    user,
    dataLoading,
    courses,
    lessons,
    items,
    saveItem,
    showToast,
  } = useHandbook();

  const existingItem = !isNew
    ? items.find((i) => i.id === itemIdParam)
    : undefined;

  const queryLessonId = searchParams?.get("lessonId") || "";
  const queryType = searchParams?.get("type") as ItemType | null;

  const [type, setType] = useState<ItemType>(() => {
    if (existingItem?.type) return existingItem.type;
    if (
      queryType &&
      (["CONTENT", "QUIZ", "ASSIGNMENT"] as string[]).includes(queryType)
    ) {
      return queryType;
    }
    return "CONTENT";
  });

  // Lưu loại ban đầu để hiển thị cảnh báo inline khi đổi CONTENT ↔ QUIZ/ASSIGNMENT

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [rollbackConfirmOpen, setRollbackConfirmOpen] = useState(false);

  const [title, setTitle] = useState(existingItem?.title || "");
  const [slug, setSlug] = useState(existingItem?.slug || "");
  const [summary, setSummary] = useState(existingItem?.summary || "");
  const [lessonId, setLessonId] = useState<string>(
    existingItem?.lessonId || queryLessonId || ""
  );
  const [pickerCourseId, setPickerCourseId] = useState<string>("");
  const [orderIndex, setOrderIndex] = useState<number>(
    existingItem?.orderIndex ?? 0
  );

  const [status, setStatus] = useState<ContentStatus>(
    existingItem?.status || "DRAFT"
  );
  const [isRequired, setIsRequired] = useState<boolean>(
    existingItem ? existingItem.isRequired !== false : true
  );
  const [requirePrevious, setRequirePrevious] = useState<boolean | null>(
    existingItem ? existingItem.requirePrevious : null
  );
  const [requireScrollToBottom, setRequireScrollToBottom] = useState<boolean>(
    existingItem ? existingItem.requireScrollToBottom : true
  );
  const [passScorePercent, setPassScorePercent] = useState<number>(
    existingItem && existingItem.passScorePercent > 0
      ? existingItem.passScorePercent
      : 80
  );

  const [blocks, setBlocks] = useState<EditorBlock[]>(() => {
    if (existingItem?.content) return existingItem.content;
    const initType = existingItem?.type || queryType || "CONTENT";
    if (initType === "CONTENT") {
      return [
        {
          id: "blk_init_1",
          type: "heading_2",
          content: t("canvas.defaultHeading"),
        },
        {
          id: "blk_init_2",
          type: "paragraph",
          content: t("canvas.defaultParagraph"),
        },
      ];
    }
    return [];
  });

  const [showInstructions, setShowInstructions] = useState<boolean>(() =>
    Boolean(existingItem?.content && existingItem.content.length > 0)
  );

  const [attachments, setAttachments] = useState<ItemAttachment[]>(
    existingItem?.attachments || []
  );
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    existingItem?.quizQuestions || []
  );
  const [quizDurationMinutes, setQuizDurationMinutes] = useState<number>(
    existingItem?.quizDurationMinutes || 0
  );
  const [quizMaxAttempts, setQuizMaxAttempts] = useState<number>(
    existingItem?.quizMaxAttempts || 0
  );
  const [quizIsExam, setQuizIsExam] = useState<boolean>(
    Boolean(existingItem?.quizIsExam)
  );

  const [isDirty, setIsDirty] = useState(false);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasRestorableDraft, setHasRestorableDraft] = useState(false);

  const isLocked = !isNew && status === "PUBLISHED";
  const isAdmin = user?.role === "ADMIN";

  const currentLesson = useMemo(
    () => lessons.find((l) => l.id === lessonId),
    [lessons, lessonId]
  );
  const currentCourse = useMemo(
    () =>
      currentLesson
        ? courses.find((c) => c.id === currentLesson.courseId)
        : undefined,
    [courses, currentLesson]
  );

  const manageableCourses = useMemo(
    () =>
      courses
        .filter((c) => canUserManageCourse(user, c.id))
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [courses, user]
  );

  useEffect(() => {
    if (isNew && queryLessonId) {
      setLessonId(queryLessonId);
    }
  }, [isNew, queryLessonId]);

  useEffect(() => {
    if (currentLesson) {
      setPickerCourseId(currentLesson.courseId);
    } else if (!pickerCourseId && manageableCourses.length > 0) {
      setPickerCourseId(manageableCourses[0].id);
    }
  }, [currentLesson, pickerCourseId, manageableCourses]);

  useEffect(() => {
    if (isNew && lessonId) {
      const siblings = items.filter((i) => i.lessonId === lessonId);
      if (siblings.length > 0) {
        const maxOrder = Math.max(...siblings.map((i) => i.orderIndex));
        setOrderIndex(maxOrder + 1);
      } else {
        setOrderIndex(0);
      }
    }
  }, [isNew, lessonId, items]);

  const canEditCurrentCourse = currentCourse
    ? canUserManageCourse(user, currentCourse.id)
    : user?.role === "ADMIN" || user?.role === "EDITOR";
  const noPerm =
    Boolean(user) && Boolean(currentCourse) && !canEditCurrentCourse;
  const noPermReason =
    user?.role === "MEMBER"
      ? t("noPermission.memberReason")
      : t("noPermission.unassignedReason");

  const plainText = useMemo(() => extractPlainTextFromBlocks(blocks), [blocks]);
  const estimatedReadingTime = useMemo(
    () => estimateReadingTime(plainText, blocks.length),
    [plainText, blocks.length]
  );

  const draftStorageKey = isNew
    ? `mpc_studio_item_draft_new_${queryLessonId || "default"}`
    : `mpc_studio_item_draft_${itemIdParam}`;
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (existingItem) {
      setTitle(existingItem.title);
      setSlug(existingItem.slug);
      setSummary(existingItem.summary);
      setLessonId(existingItem.lessonId);
      setType(existingItem.type);
      setOrderIndex(existingItem.orderIndex);
      setStatus(existingItem.status);
      setIsRequired(existingItem.isRequired !== false);
      setRequirePrevious(existingItem.requirePrevious);
      setRequireScrollToBottom(existingItem.requireScrollToBottom);
      setBlocks(existingItem.content || []);
      setShowInstructions(
        Boolean(existingItem.content && existingItem.content.length > 0)
      );
      setAttachments(existingItem.attachments || []);
      if (hasQuiz(existingItem.type)) {
        setPassScorePercent(
          existingItem.passScorePercent > 0
            ? existingItem.passScorePercent
            : 80
        );
        setQuizQuestions(existingItem.quizQuestions || []);
        setQuizDurationMinutes(existingItem.quizDurationMinutes || 0);
        setQuizMaxAttempts(existingItem.quizMaxAttempts || 0);
        setQuizIsExam(Boolean(existingItem.quizIsExam));
      }
      setIsDirty(false);
    }
  }, [existingItem]);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftStorageKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && parsed.title) {
          setHasRestorableDraft(true);
        }
      }
    } catch {}
  }, [draftStorageKey]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isDirty) return;

    const timer = setTimeout(() => {
      try {
        const savedAt = format.dateTime(new Date(), {
          hour: "2-digit",
          minute: "2-digit",
        });
        const payload = {
          title,
          slug,
          summary,
          lessonId,
          type,
          orderIndex,
          isRequired,
          requirePrevious,
          requireScrollToBottom,
          blocks,
          attachments,
          ...(hasQuiz(type)
            ? {
                passScorePercent,
                quizQuestions,
                quizDurationMinutes,
                quizMaxAttempts,
                quizIsExam,
              }
            : {}),
          savedAt,
        };
        localStorage.setItem(draftStorageKey, JSON.stringify(payload));
        setLastDraftSavedAt(savedAt);
      } catch {}
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    isDirty,
    title,
    slug,
    summary,
    lessonId,
    type,
    orderIndex,
    isRequired,
    requirePrevious,
    requireScrollToBottom,
    passScorePercent,
    blocks,
    attachments,
    quizQuestions,
    quizDurationMinutes,
    quizMaxAttempts,
    quizIsExam,
    draftStorageKey,
    format,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Loại chỉ được chọn lúc tạo; sau khi lưu lần đầu thì khóa cứng
  const hasValidQueryType = Boolean(
    queryType && (["CONTENT", "QUIZ", "ASSIGNMENT"] as string[]).includes(queryType)
  );
  const [typeChosen, setTypeChosen] = useState(!isNew || hasValidQueryType);
  const [confirmRechoose, setConfirmRechoose] = useState(false);

  const chooseType = (next: ItemType) => {
    setType(next);
    if (hasQuiz(next) && passScorePercent <= 0) setPassScorePercent(80);
    setConfirmRechoose(false);
    setTypeChosen(true);
  };

  const requestRechoose = () => {
    if (isDirty) {
      setConfirmRechoose(true);
      return;
    }
    setTypeChosen(false);
  };

  const confirmRechooseType = () => {
    setQuizQuestions([]);
    setConfirmRechoose(false);
    setTypeChosen(false);
  };

  const handleMoveToLesson = async (nextLessonId: string) => {
    if (!nextLessonId || nextLessonId === lessonId) return;
    setLessonId(nextLessonId);

    if (!isNew && existingItem && !isLocked) {
      setSaving(true);
      try {
        await saveItem({
          id: existingItem.id,
          lessonId: nextLessonId,
          title: title.trim() || existingItem.title,
        });
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : t("toast.moveFailed"),
          "error"
        );
      } finally {
        setSaving(false);
      }
    } else {
      markDirty();
    }
  };

  const restoreLocalDraft = () => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.title !== undefined) setTitle(d.title);
      if (d.slug !== undefined) setSlug(d.slug);
      if (d.summary !== undefined) setSummary(d.summary);
      if (d.lessonId !== undefined && !queryLessonId) setLessonId(d.lessonId);
      if (isNew && d.type !== undefined) setType(d.type);
      if (d.orderIndex !== undefined) setOrderIndex(d.orderIndex);
      if (d.isRequired !== undefined) setIsRequired(d.isRequired);
      if (d.requirePrevious !== undefined)
        setRequirePrevious(d.requirePrevious);
      if (d.requireScrollToBottom !== undefined)
        setRequireScrollToBottom(d.requireScrollToBottom);
      if (Array.isArray(d.blocks)) {
        setBlocks(d.blocks);
        if (d.blocks.length > 0) setShowInstructions(true);
      }
      if (Array.isArray(d.attachments)) setAttachments(d.attachments);
      if (hasQuiz(isNew ? (d.type ?? type) : type)) {
        if (d.passScorePercent !== undefined)
          setPassScorePercent(d.passScorePercent);
        if (Array.isArray(d.quizQuestions)) setQuizQuestions(d.quizQuestions);
        if (d.quizDurationMinutes !== undefined)
          setQuizDurationMinutes(d.quizDurationMinutes);
        if (d.quizMaxAttempts !== undefined)
          setQuizMaxAttempts(d.quizMaxAttempts);
        if (d.quizIsExam !== undefined) setQuizIsExam(Boolean(d.quizIsExam));
      }
      setHasRestorableDraft(false);
      setIsDirty(true);
      showToast(t("toast.restoredDraft"), "info");
    } catch {}
  };

  const discardLocalDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {}
    setHasRestorableDraft(false);
  };

  const handleRollbackToReview = () => {
    if (!isAdmin) {
      showToast(t("toast.adminOnlyUnlock"), "error");
      return;
    }
    setRollbackConfirmOpen(true);
  };

  const executeRollbackToReview = async () => {
    if (!existingItem || !isAdmin) return;
    setSaving(true);
    try {
      await saveItem({
        id: existingItem.id,
        lessonId: lessonId || existingItem.lessonId,
        type,
        title: title.trim() || existingItem.title,
        slug: slug.trim() || existingItem.slug,
        summary,
        content: blocks,
        attachments,
        orderIndex,
        status: "PENDING_REVIEW",
        isRequired,
        requirePrevious,
        requireScrollToBottom:
          type === "CONTENT" ? requireScrollToBottom : false,
        ...(hasQuiz(type)
          ? {
              passScorePercent,
              quizQuestions,
              quizDurationMinutes,
              quizMaxAttempts,
              quizIsExam,
            }
          : {}),
      });

      setStatus("PENDING_REVIEW");
      setIsDirty(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showToast(t("toast.conflictHasAttempts"), "error");
      } else {
        showToast(
          err instanceof Error ? err.message : t("toast.rollbackFailed"),
          "error"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (targetStatus: ContentStatus) => {
    if (!lessonId) {
      showToast(t("toast.lessonRequired"), "error");
      return;
    }
    if (!title.trim()) {
      showToast(t("toast.titleRequired"), "error");
      return;
    }
    if (targetStatus === "PUBLISHED" && !isAdmin) {
      showToast(t("toast.adminOnlyPublish"), "error");
      return;
    }

    setSaving(true);
    try {
      const allowedForCurrentType = ALLOWED_QUESTION_TYPES[type];
      const sanitizedQuizQuestions = hasQuiz(type)
        ? quizQuestions
            .filter((q) => allowedForCurrentType.includes(q.type ?? "single"))
            .map((q) => {
              if (q.type === "single" || !q.type) {
                const validIds =
                  q.correctOptionIds && q.correctOptionIds.length > 0
                    ? [q.correctOptionIds[0]]
                    : q.options && q.options.length > 0
                    ? [q.options[0].id]
                    : [];
                return {
                  ...q,
                  type: "single" as const,
                  correctOptionIds: validIds,
                };
              }
              return q;
            })
        : undefined;

      const saved = await saveItem({
        id: isNew ? undefined : itemIdParam,
        lessonId,
        type,
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        summary: summary.trim(),
        content:
          type === "CONTENT" || showInstructions ? blocks : [],
        attachments,
        orderIndex,
        status: targetStatus,
        isRequired,
        requirePrevious,
        requireScrollToBottom:
          type === "CONTENT" ? requireScrollToBottom : false,
        ...(hasQuiz(type)
          ? {
              passScorePercent,
              quizQuestions: sanitizedQuizQuestions,
              quizDurationMinutes,
              quizMaxAttempts,
              quizIsExam,
            }
          : {}),
      });

      setStatus(targetStatus);
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {}
      setIsDirty(false);
      setHasRestorableDraft(false);

      if (isNew) {
        router.replace(`/studio/items/${saved.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showToast(t("toast.conflictHasAttempts"), "error");
      } else {
        showToast(
          err instanceof Error ? err.message : t("toast.saveFailed"),
          "error"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBackClick = () => {
    if (isDirty) {
      setLeaveConfirmOpen(true);
    } else {
      router.push("/studio/items");
    }
  };

  const lessonComboboxOptions = useMemo(() => {
    const sortedCourses = [...courses].sort(
      (a, b) => a.orderIndex - b.orderIndex
    );
    return sortedCourses.flatMap((course) => {
      const allowed = canUserManageCourse(user, course.id);
      const courseLessons = lessons
        .filter((l) => l.courseId === course.id)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      return courseLessons.map((lesson) => ({
        value: lesson.id,
        label: `${course.title} › ${lesson.title}`,
        description: course.title,
        disabled: !allowed,
        disabledReason: allowed
          ? undefined
          : t("settings.lessonDisabledReason"),
      }));
    });
  }, [courses, lessons, user, t]);

  const pickerCourseLessons = useMemo(() => {
    if (!pickerCourseId) return [];
    return lessons
      .filter((l) => l.courseId === pickerCourseId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [lessons, pickerCourseId]);

  const readerPath =
    currentCourse && currentLesson && (slug || existingItem?.slug)
      ? `/learn/${currentCourse.slug}/${currentLesson.slug}/${
          slug || existingItem?.slug
        }`
      : null;

  const canAccess = user?.role === "ADMIN" || user?.role === "EDITOR";
  if (!canAccess && !dataLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldAlert className="size-8 text-destructive mb-3" />
        <h1 className="text-xl font-semibold">{t("noPermission.pageTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">
          {t("noPermission.pageDescription")}
        </p>
        <Button onClick={() => router.push("/")} size="sm">
          {t("noPermission.backHome")}
        </Button>
      </div>
    );
  }

  if (dataLoading && !existingItem && !isNew) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <Loader2 className="size-7 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">{tc("actions.loading")}</p>
      </div>
    );
  }

  if (!dataLoading && !isNew && !existingItem) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <FileQuestion className="size-10 text-muted-foreground mb-3" />
        <h1 className="text-xl font-semibold text-foreground">
          {t("notFound.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 mb-5 max-w-md">
          {t("notFound.description", { id: itemIdParam })}
        </p>
        <Button asChild size="sm" className="cursor-pointer">
          <Link href="/studio/items">
            <ArrowLeft className="size-4 mr-1.5" />
            <span>{t("notFound.backButton")}</span>
          </Link>
        </Button>
      </div>
    );
  }

  if (isNew && !typeChosen) {
    const options: ItemType[] = ["CONTENT", "QUIZ", "ASSIGNMENT"];
    const where = currentCourse && currentLesson ? `${currentCourse.title} › ${currentLesson.title}` : null;
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <div className="px-4 sm:px-6 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/studio/curriculum">
              <ArrowLeft className="size-4 mr-1.5" />
              <span>{tc("actions.back")}</span>
            </Link>
          </Button>
        </div>
        <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{t("typeChooser.title")}</h1>
            {where && <p className="text-sm text-muted-foreground">{where}</p>}
            <p className="text-sm text-muted-foreground">{t("typeChooser.subtitle")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {options.map((opt) => {
              const Icon = ITEM_TYPE_ICONS[opt];
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => chooseType(opt)}
                  className="group flex flex-col items-start gap-3 rounded-xl border border-border p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  <span className="rounded-lg bg-muted p-2 text-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="space-y-1">
                    <span className="block font-semibold">{t(`typeChooser.options.${opt}.title`)}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {t(`typeChooser.options.${opt}.description`)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  const inheritedSequential =
    currentLesson && currentCourse
      ? currentLesson.requirePrevious ?? currentCourse.sequential
      : true;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header gọn: Quay lại + Ngữ cảnh bài học + Trạng thái (nếu khác PUBLISHED) + 1 nút chính "Lưu" + Menu phụ */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/95 px-3 sm:px-6 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="gap-1.5 text-xs font-medium cursor-pointer shrink-0 px-2 h-8"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{t("backToList")}</span>
          </Button>

          <Separator orientation="vertical" className="h-4 hidden sm:block" />

          {currentCourse && currentLesson ? (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-xs cursor-pointer"
              title={t("newLessonPicker.changeLesson")}
            >
              <span className="truncate">{currentCourse.title}</span>
              <ChevronRight className="size-3 shrink-0" />
              <span className="font-medium text-foreground truncate">
                {currentLesson.title}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <span>{t("newLessonPicker.unselectedHint")}</span>
            </button>
          )}

          {status === "PUBLISHED" ? (
            <Badge
              variant="outline"
              className="text-xs font-normal shrink-0 gap-1"
            >
              <Lock className="size-3" />
              <span>{t("lockedBadge")}</span>
            </Badge>
          ) : (
            <Badge
              variant={status === "PENDING_REVIEW" ? "secondary" : "outline"}
              className="text-xs font-normal shrink-0"
            >
              {tc(`status.${status}`)}
            </Badge>
          )}

          {type === "CONTENT" && (
            <span className="hidden xl:inline text-xs text-muted-foreground font-mono">
              {t("readingTime", { minutes: estimatedReadingTime })}
            </span>
          )}

          <span className="hidden lg:inline-flex items-center gap-1 text-xs text-muted-foreground truncate">
            {isDirty ? (
              <span>
                {lastDraftSavedAt
                  ? t("draftSavedAt", { time: lastDraftSavedAt })
                  : t("unsavedChanges")}
              </span>
            ) : (
              <>
                <Check className="size-3 text-emerald-500 shrink-0" />
                <span>{t("saved")}</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            className="gap-1.5 text-xs cursor-pointer h-8 px-2.5"
          >
            <Eye className="size-3.5" />
            <span className="hidden sm:inline">{t("actions.preview")}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="gap-1.5 text-xs cursor-pointer h-8 px-2.5"
          >
            <Settings2 className="size-3.5" />
            <span className="hidden sm:inline">{t("actions.settings")}</span>
          </Button>

          {/* Menu phụ cho trạng thái / gửi duyệt / xuất bản / chia sẻ */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 cursor-pointer"
                aria-label={t("actions.moreActions")}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-xs">
              {!isLocked && (
                <>
                  <DropdownMenuItem
                    disabled={saving || noPerm}
                    onClick={() => handleSave("DRAFT")}
                    className="cursor-pointer gap-2"
                  >
                    <Save className="size-3.5" />
                    <span>{t("actions.saveDraft")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={saving || noPerm}
                    onClick={() => handleSave("PENDING_REVIEW")}
                    className="cursor-pointer gap-2"
                  >
                    <Clock className="size-3.5" />
                    <span>{t("actions.submitReview")}</span>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem
                      disabled={saving || noPerm}
                      onClick={() => handleSave("PUBLISHED")}
                      className="cursor-pointer gap-2 font-medium text-emerald-600 dark:text-emerald-400"
                    >
                      <Send className="size-3.5" />
                      <span>{t("actions.publish")}</span>
                    </DropdownMenuItem>
                  )}
                </>
              )}

              {isLocked && isAdmin && (
                <DropdownMenuItem
                  disabled={saving || noPerm}
                  onClick={handleRollbackToReview}
                  className="cursor-pointer gap-2"
                >
                  <RotateCcw className="size-3.5" />
                  <span>{t("actions.rollbackReview")}</span>
                </DropdownMenuItem>
              )}

              {!isNew && readerPath && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      const url = `${window.location.origin}${readerPath}`;
                      navigator.clipboard.writeText(url);
                      showToast(t("toast.linkCopied", { url: readerPath }), "success");
                    }}
                    className="cursor-pointer gap-2"
                  >
                    <Share2 className="size-3.5" />
                    <span>{t("actions.copyReaderLink")}</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Nút chính duy nhất: Lưu (hoặc Mở khóa khi đang khóa & là ADMIN) */}
          {!isLocked ? (
            <Button
              type="button"
              size="sm"
              disabled={saving || noPerm}
              onClick={() =>
                handleSave(status === "PUBLISHED" ? "DRAFT" : status)
              }
              className="gap-1.5 text-xs font-medium cursor-pointer h-8 px-3"
            >
              <Save className="size-3.5" />
              <span>{saving ? t("saving") : tc("actions.save")}</span>
            </Button>
          ) : (
            isAdmin && (
              <Button
                type="button"
                size="sm"
                onClick={handleRollbackToReview}
                disabled={saving || noPerm}
                className="gap-1.5 text-xs font-medium cursor-pointer h-8 px-3"
              >
                <RotateCcw className="size-3.5" />
                <span>{t("lockedBanner.unlockButton")}</span>
              </Button>
            )
          )}
        </div>
      </header>

      {/* Thanh thông báo khi đang khóa chỉnh sửa */}
      {isLocked && (
        <div className="border-b border-border bg-muted/40 px-4 sm:px-6 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="size-3.5 shrink-0" />
              <span>
                {isAdmin
                  ? t("lockedBanner.adminText")
                  : t("lockedBanner.editorText")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Khôi phục bản nháp tự động từ trình duyệt */}
      {hasRestorableDraft && (
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {t("localDraftBanner.message")}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={restoreLocalDraft}
                className="cursor-pointer"
              >
                <RotateCcw className="size-3 mr-1" />
                <span>{t("localDraftBanner.restore")}</span>
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={discardLocalDraft}
                className="cursor-pointer"
              >
                {t("localDraftBanner.discard")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cảnh báo không có quyền quản lý khóa học */}
      {noPerm && (
        <div className="border-b border-destructive/30 bg-destructive/5 px-4 sm:px-8 py-2.5">
          <div className="mx-auto max-w-3xl flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <ShieldAlert className="size-4 text-destructive shrink-0" />
            <span className="font-semibold text-destructive">
              {t("noPermission.readOnlyPrefix")} {noPermReason}
            </span>
            <span className="text-muted-foreground">
              {manageableCourses.length > 0
                ? t("noPermission.assignedCourses", {
                    courses: manageableCourses.map((c) => c.title).join(", "),
                  })
                : t("noPermission.noAssignedCourses")}
            </span>
          </div>
        </div>
      )}

      {/* Chọn Khóa học → Bài học khi tạo mới mà thiếu lessonId */}
      {isNew && !lessonId && (
        <div className="border-b border-border bg-muted/20 px-4 sm:px-8 py-4">
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <BookOpen className="size-4 text-primary" />
              <span>{t("newLessonPicker.title")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">
                  {t("newLessonPicker.courseLabel")}
                </Label>
                <Select
                  value={pickerCourseId}
                  onValueChange={(val) => {
                    setPickerCourseId(val);
                    const firstLes = lessons
                      .filter((l) => l.courseId === val)
                      .sort((a, b) => a.orderIndex - b.orderIndex)[0];
                    if (firstLes) setLessonId(firstLes.id);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue
                      placeholder={t("newLessonPicker.coursePlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {manageableCourses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  {t("newLessonPicker.lessonLabel")}
                </Label>
                <Select
                  value={lessonId}
                  onValueChange={(val) => setLessonId(val)}
                  disabled={pickerCourseLessons.length === 0}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue
                      placeholder={
                        pickerCourseLessons.length > 0
                          ? t("newLessonPicker.lessonPlaceholder")
                          : t("newLessonPicker.noLessons")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {pickerCourseLessons.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                {pickerCourseLessons.length === 0 && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs cursor-pointer"
                  >
                    <Link href="/studio/curriculum">
                      <FolderTree className="size-3.5 mr-1.5" />
                      <span>{t("newLessonPicker.createLessonLink")}</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cột soạn thảo rộng ở giữa */}
      <main
        className={cn(
          "flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 transition-opacity",
          isLocked && "pointer-events-none opacity-85 select-text"
        )}
      >
        {/* Loại item: chọn lúc tạo, khóa cứng khi sửa (chỉ sửa nội dung) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 font-medium"
              title={isNew ? undefined : t("typeBadge.locked")}
            >
              {React.createElement(ITEM_TYPE_ICONS[type], { className: "size-3.5" })}
              <span>{tc(`itemType.${type}`)}</span>
              {!isNew && <Lock className="size-3 text-muted-foreground" aria-label={t("typeBadge.locked")} />}
            </span>

            {isNew &&
              (confirmRechoose ? (
                <span className="inline-flex flex-wrap items-center gap-2 text-muted-foreground">
                  <span>{t("typeChooser.changeConfirm")}</span>
                  <button type="button" onClick={confirmRechooseType} className="font-medium text-destructive hover:underline cursor-pointer">
                    {t("typeChooser.changeConfirmAction")}
                  </button>
                  <button type="button" onClick={() => setConfirmRechoose(false)} className="hover:underline cursor-pointer">
                    {tc("actions.cancel")}
                  </button>
                </span>
              ) : (
                <button type="button" onClick={requestRechoose} className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer">
                  {t("typeChooser.change")}
                </button>
              ))}
          </div>

          <span className="text-xs text-muted-foreground">{t(`typeBadge.descriptions.${type}`)}</span>
        </div>

        {/* Tiêu đề & Tóm tắt */}
        <div className="space-y-2">
          <textarea
            value={title}
            rows={1}
            disabled={isLocked}
            onChange={(e) => {
              const val = e.target.value;
              setTitle(val);
              if (isNew) {
                setSlug(slugify(val));
              }
              markDirty();
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            placeholder={t("canvas.titlePlaceholder")}
            className="w-full resize-none overflow-hidden bg-transparent text-2xl sm:text-3xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-1 leading-snug break-words disabled:opacity-90"
          />

          <Textarea
            value={summary}
            disabled={isLocked}
            onChange={(e) => {
              setSummary(e.target.value);
              markDirty();
            }}
            placeholder={t("canvas.summaryPlaceholder")}
            rows={2}
            className="resize-none border-none bg-transparent px-0 py-1 text-sm text-muted-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 disabled:opacity-90"
          />
        </div>

        <Separator />

        {/* Phân biệt theo loại: CONTENT vs QUIZ / ASSIGNMENT */}
        {type === "CONTENT" ? (
          <div className="space-y-8">
            <BlockNoteEditor
              blocks={blocks}
              onChange={(nextBlocks) => {
                setBlocks(nextBlocks);
                markDirty();
              }}
            />

            <div className="pt-6 border-t border-border space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>{t("canvas.attachmentsTitle")}</span>
                  {attachments.length > 0 && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      {attachments.length}
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("canvas.attachmentsDescription")}
                </p>
              </div>
              <AttachmentManager
                attachments={attachments}
                onChange={(nextAtt) => {
                  setAttachments(nextAtt);
                  markDirty();
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Ghi chú chấm tay cho ASSIGNMENT */}
            {type === "ASSIGNMENT" && (
              <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <Info className="size-4 shrink-0 text-primary mt-0.5" />
                <span>{t("canvas.assignmentManualGradeNote")}</span>
              </div>
            )}

            {/* Khung nhập hướng dẫn ngắn (BlockNote, tuỳ chọn) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("canvas.instructionsTitle")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    const next = !showInstructions;
                    setShowInstructions(next);
                    if (next && blocks.length === 0) {
                      setBlocks([
                        {
                          id: `blk_${Date.now()}`,
                          type: "paragraph",
                          content: "",
                        },
                      ]);
                    }
                  }}
                  className="text-xs cursor-pointer gap-1"
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      showInstructions && "rotate-180"
                    )}
                  />
                  <span>
                    {showInstructions
                      ? t("canvas.instructionsToggleHide")
                      : t("canvas.instructionsToggleShow")}
                  </span>
                </Button>
              </div>

              {showInstructions && (
                <div className="rounded-xl border border-border p-4 bg-card/40">
                  <BlockNoteEditor
                    blocks={blocks}
                    onChange={(nextBlocks) => {
                      setBlocks(nextBlocks);
                      markDirty();
                    }}
                  />
                </div>
              )}
            </div>

            {/* Trình tạo câu hỏi theo loại được phép */}
            <QuizBuilder
              questions={quizQuestions}
              allowedTypes={ALLOWED_QUESTION_TYPES[type]}
              passScorePercent={passScorePercent}
              durationMinutes={quizDurationMinutes}
              maxAttempts={quizMaxAttempts}
              isExam={quizIsExam}
              onChange={(nextQ) => {
                setQuizQuestions(nextQ);
                markDirty();
              }}
              onPassScoreChange={(score) => {
                setPassScorePercent(score);
                markDirty();
              }}
              onDurationMinutesChange={(mins) => {
                setQuizDurationMinutes(mins);
                markDirty();
              }}
              onMaxAttemptsChange={(attempts) => {
                setQuizMaxAttempts(attempts);
                markDirty();
              }}
              onIsExamChange={(exam) => {
                setQuizIsExam(exam);
                markDirty();
              }}
            />
          </div>
        )}
      </main>

      {/* Panel cài đặt bên phải (Sheet gọn) */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-base">{t("settings.title")}</SheetTitle>
            <SheetDescription className="text-sm">
              {t("settings.description")}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-8">
            <div className="space-y-4">
              {/* Tiêu đề & Tóm tắt trong cài đặt */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {t("settings.titleLabel")}
                </Label>
                <Input
                  value={title}
                  disabled={isLocked}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTitle(val);
                    if (isNew) setSlug(slugify(val));
                    markDirty();
                  }}
                  placeholder={t("canvas.titlePlaceholder")}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {t("settings.summaryLabel")}
                </Label>
                <Textarea
                  value={summary}
                  disabled={isLocked}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    markDirty();
                  }}
                  placeholder={t("canvas.summaryPlaceholder")}
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {t("settings.lessonLabel")}
                </Label>
                <SearchableCombobox
                  value={lessonId}
                  onValueChange={(val) => {
                    if (val) {
                      handleMoveToLesson(val);
                    }
                  }}
                  options={lessonComboboxOptions}
                  placeholder={t("settings.lessonPlaceholder")}
                  searchPlaceholder={t("settings.lessonSearchPlaceholder")}
                  emptyText={t("settings.lessonEmpty")}
                  defaultLimit={10}
                  triggerClassName="h-9 text-xs"
                  disabled={isLocked}
                />
                {!isNew && (
                  <p className="text-[11px] text-muted-foreground">
                    {t("settings.lessonMoveHint")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium">
                    {t("settings.slugLabel")}
                  </Label>
                  <Input
                    value={slug}
                    disabled={isLocked}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      markDirty();
                    }}
                    placeholder={t("settings.slugPlaceholder")}
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {t("settings.orderLabel")}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={999}
                    disabled={isLocked}
                    value={orderIndex}
                    onChange={(e) => {
                      setOrderIndex(Math.max(0, Number(e.target.value) || 0));
                      markDirty();
                    }}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Điều kiện mở khóa & hoàn thành */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("settings.completionSection")}
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {t("settings.sequentialLabel")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("settings.sequentialDescription")}
                </p>
                <Select
                  value={
                    requirePrevious === null
                      ? "inherit"
                      : requirePrevious
                      ? "true"
                      : "false"
                  }
                  onValueChange={(val) => {
                    const nextVal =
                      val === "inherit" ? null : val === "true" ? true : false;
                    setRequirePrevious(nextVal);
                    markDirty();
                  }}
                  disabled={isLocked}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">
                      {t("settings.sequentialInherit", {
                        mode: inheritedSequential
                          ? t("settings.sequentialInheritTrue")
                          : t("settings.sequentialInheritFalse"),
                      })}
                    </SelectItem>
                    <SelectItem value="true">
                      {t("settings.sequentialTrue")}
                    </SelectItem>
                    <SelectItem value="false">
                      {t("settings.sequentialFalse")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CONTENT: chỉ hiện requireScrollToBottom, KHÔNG có passScorePercent */}
              {type === "CONTENT" && (
                <div className="flex items-center justify-between gap-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {t("settings.scrollLabel")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("settings.scrollDescription")}
                    </p>
                  </div>
                  <Switch
                    checked={requireScrollToBottom}
                    disabled={isLocked}
                    onCheckedChange={(val) => {
                      setRequireScrollToBottom(val);
                      markDirty();
                    }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-3 py-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {t("settings.requiredLabel")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.requiredDescription")}
                  </p>
                </div>
                <Switch
                  checked={isRequired}
                  disabled={isLocked}
                  onCheckedChange={(val) => {
                    setIsRequired(val);
                    markDirty();
                  }}
                />
              </div>
            </div>

            {/* Cài đặt riêng cho QUIZ / ASSIGNMENT */}
            {hasQuiz(type) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("settings.quizSection")}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        {t("settings.passScoreLabel")}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        step={5}
                        disabled={isLocked}
                        value={passScorePercent}
                        onChange={(e) => {
                          setPassScorePercent(
                            Math.max(
                              1,
                              Math.min(100, Number(e.target.value) || 80)
                            )
                          );
                          markDirty();
                        }}
                        className="h-9 font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        {t("settings.durationLabel")}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={300}
                        disabled={isLocked}
                        value={quizDurationMinutes}
                        onChange={(e) => {
                          setQuizDurationMinutes(
                            Math.max(0, Number(e.target.value) || 0)
                          );
                          markDirty();
                        }}
                        className="h-9 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      {t("settings.maxAttemptsLabel")}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      disabled={isLocked}
                      value={quizMaxAttempts}
                      onChange={(e) => {
                        setQuizMaxAttempts(
                          Math.max(0, Number(e.target.value) || 0)
                        );
                        markDirty();
                      }}
                      className="h-9 font-mono text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 py-2">
                    <Label className="text-xs font-medium">
                      {t("settings.isExamLabel")}
                    </Label>
                    <Switch
                      checked={quizIsExam}
                      disabled={isLocked}
                      onCheckedChange={(val) => {
                        setQuizIsExam(val);
                        markDirty();
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Xem trước */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-base">{t("preview.title")}</SheetTitle>
            <SheetDescription className="text-sm">
              {t("preview.description")}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-10">
            <div className="space-y-2 border-b border-border pb-4">
              {currentCourse && currentLesson && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>{currentCourse.title}</span>
                  <ChevronRight className="size-3" />
                  <span>{currentLesson.title}</span>
                </p>
              )}
              <h1 className="text-2xl font-bold text-foreground">
                {title || t("untitled")}
              </h1>
              {summary && (
                <p className="text-sm text-muted-foreground">{summary}</p>
              )}
            </div>

            <ArticleRenderer blocks={blocks} attachments={attachments} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Xác nhận rời trang khi chưa lưu */}
      <ConfirmDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title={t("dialogs.leaveTitle")}
        description={t("dialogs.leaveDescription")}
        confirmLabel={t("dialogs.leaveConfirm")}
        cancelLabel={t("dialogs.leaveCancel")}
        variant="destructive"
        onConfirm={() => {
          setIsDirty(false);
          router.push("/studio/items");
        }}
      />

      {/* Xác nhận hoàn tác về Chờ duyệt */}
      <ConfirmDialog
        open={rollbackConfirmOpen}
        onOpenChange={setRollbackConfirmOpen}
        title={t("dialogs.rollbackTitle")}
        description={t("dialogs.rollbackDescription")}
        confirmLabel={t("dialogs.rollbackConfirm")}
        cancelLabel={tc("actions.cancel")}
        onConfirm={executeRollbackToReview}
      />
    </div>
  );
}
