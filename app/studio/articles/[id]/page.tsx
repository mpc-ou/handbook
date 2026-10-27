"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useHandbook } from "@/context/HandbookContext";
import BlockNoteEditor from "@/components/editor/BlockNoteEditor";
import { CoverImagePicker } from "@/components/editor/CoverImagePicker";
import { AttachmentManager } from "@/components/editor/AttachmentManager";
import { QuizBuilder } from "@/components/editor/QuizBuilder";
import { ArticleRenderer } from "@/components/reader/ArticleRenderer";
import { ArticleCover } from "@/components/ui/ArticleCover";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
  estimateReadingTime,
  extractPlainTextFromBlocks,
  slugify,
} from "@/lib/seed-data";
import type {
  ArticleAttachment,
  ArticleAudience,
  ArticleStatus,
  ArticleVisibility,
  EditorBlock,
  QuizQuestion,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  SearchableCombobox,
  ComboboxOption,
} from "@/components/ui/SearchableCombobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Check,
  Clock,
  Eye,
  FileQuestion,
  FileText,
  Lock,
  Menu,
  MoreVertical,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Link2,
  Users,
  EyeOff,
} from "lucide-react";

export default function StudioArticleEditorPage() {
  const params = useParams<{ id?: string }>();
  const articleIdParam = params?.id || "new";
  const isNew = articleIdParam === "new";
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user, categories, articles, departments, saveArticle, showToast } = useHandbook();

  const existingArticle = !isNew
    ? articles.find((a) => a.id === articleIdParam)
    : undefined;

  const initialTab = searchParams?.get("tab");
  const queryCategoryId = searchParams?.get("categoryId");

  const [activeMode, setActiveMode] = useState<"content" | "quiz">(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("tab");
      if (q === "quiz") return "quiz";
    }
    return initialTab === "quiz" ? "quiz" : "content";
  });

  useEffect(() => {
    const tabParam =
      searchParams?.get("tab") ||
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("tab")
        : null);
    if (tabParam === "quiz") {
      setActiveMode("quiz");
    } else if (tabParam === "content") {
      setActiveMode("content");
    }
  }, [searchParams]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [rollbackConfirmOpen, setRollbackConfirmOpen] = useState(false);

  const [title, setTitle] = useState(existingArticle?.title || "");
  const [slug, setSlug] = useState(existingArticle?.slug || "");
  const [summary, setSummary] = useState(existingArticle?.summary || "");
  const [coverImage, setCoverImage] = useState(
    existingArticle?.coverImage || ""
  );
  const [categoryId, setCategoryId] = useState(() => {
    if (existingArticle?.categoryId) return existingArticle.categoryId;
    if (queryCategoryId) return queryCategoryId;
    return categories[0]?.id || "cat_rules";
  });
  const [orderIndex, setOrderIndex] = useState(
    existingArticle?.orderIndex || 1
  );

  // Sync categoryId from URL query param when creating new article
  useEffect(() => {
    if (isNew) {
      const qCat = searchParams?.get("categoryId");
      if (qCat) {
        setCategoryId(qCat);
      }
    }
  }, [isNew, searchParams]);

  // Auto-calculate orderIndex for new article based on articles count in target category
  useEffect(() => {
    if (isNew && categoryId && articles.length > 0) {
      const inCat = articles.filter((a) => a.categoryId === categoryId);
      if (inCat.length > 0) {
        const maxOrder = Math.max(...inCat.map((a) => a.orderIndex));
        setOrderIndex(maxOrder + 1);
      } else {
        setOrderIndex(1);
      }
    }
  }, [isNew, categoryId, articles]);
  const [isPublished, setIsPublished] = useState(
    existingArticle ? existingArticle.isPublished : true
  );
  const [requirePrevious, setRequirePrevious] = useState(
    existingArticle ? existingArticle.requirePrevious : false
  );
  const [requireScrollToBottom, setRequireScrollToBottom] = useState(
    existingArticle ? existingArticle.requireScrollToBottom : true
  );
  const [passScorePercent, setPassScorePercent] = useState(
    existingArticle ? existingArticle.passScorePercent : 80
  );
  const [isRequired, setIsRequired] = useState(
    existingArticle ? existingArticle.isRequired !== false : true
  );
  const [allowedGroups, setAllowedGroups] = useState<string[]>(
    existingArticle?.allowedGroups || []
  );
  const [audience, setAudience] = useState<ArticleAudience>(
    existingArticle?.audience ||
      (existingArticle?.allowedGroups && existingArticle.allowedGroups.length > 0
        ? "INTERNAL"
        : "INTERNAL")
  );
  const [visibility, setVisibility] = useState<ArticleVisibility>(
    existingArticle?.visibility || "PUBLIC"
  );
  const [status, setStatus] = useState<ArticleStatus>(
    existingArticle?.status || (existingArticle?.isPublished ? "PUBLISHED" : "DRAFT")
  );
  const isLocked = !isNew && status === "PUBLISHED";
  const [blocks, setBlocks] = useState<EditorBlock[]>(
    existingArticle?.content || [
      {
        id: "blk_init_1",
        type: "heading_2",
        content: "1. Overview & Objectives",
      },
      {
        id: "blk_init_2",
        type: "paragraph",
        content: "Enter detailed instructional content here...",
      },
    ]
  );
  const [attachments, setAttachments] = useState<ArticleAttachment[]>(
    existingArticle?.attachments || []
  );
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    existingArticle?.quizQuestions || []
  );
  const [quizDurationMinutes, setQuizDurationMinutes] = useState<number>(
    existingArticle?.quizDurationMinutes || 0
  );
  const [quizMaxAttempts, setQuizMaxAttempts] = useState<number>(
    existingArticle?.quizMaxAttempts || 0
  );
  const [quizIsExam, setQuizIsExam] = useState<boolean>(
    Boolean(existingArticle?.quizIsExam)
  );

  const [isDirty, setIsDirty] = useState(false);
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasRestorableDraft, setHasRestorableDraft] = useState(false);

  const plainText = React.useMemo(
    () => extractPlainTextFromBlocks(blocks),
    [blocks]
  );
  const estimatedReadingTime = React.useMemo(
    () => estimateReadingTime(plainText, blocks.length),
    [plainText, blocks.length]
  );
  const wordCount = React.useMemo(
    () => plainText.trim().split(/\s+/).filter(Boolean).length,
    [plainText]
  );

  const draftStorageKey = isNew
    ? `mpc_studio_draft_new_${queryCategoryId || "default"}`
    : `mpc_studio_draft_${articleIdParam}`;
  const isInitialMount = useRef(true);

  // Sync when existingArticle loads
  useEffect(() => {
    if (existingArticle) {
      setTitle(existingArticle.title);
      setSlug(existingArticle.slug);
      setSummary(existingArticle.summary);
      setCoverImage(existingArticle.coverImage || "");
      setCategoryId(existingArticle.categoryId);
      setOrderIndex(existingArticle.orderIndex);
      setIsPublished(existingArticle.isPublished);
      setStatus(
        existingArticle.status || (existingArticle.isPublished ? "PUBLISHED" : "DRAFT")
      );
      setRequirePrevious(existingArticle.requirePrevious);
      setRequireScrollToBottom(existingArticle.requireScrollToBottom);
      setPassScorePercent(existingArticle.passScorePercent);
      setIsRequired(existingArticle.isRequired !== false);
      setAllowedGroups(existingArticle.allowedGroups || []);
      setAudience(
        existingArticle.audience ||
          (existingArticle.allowedGroups && existingArticle.allowedGroups.length > 0
            ? "INTERNAL"
            : "INTERNAL")
      );
      setVisibility(existingArticle.visibility || "PUBLIC");
      setBlocks(existingArticle.content);
      setAttachments(existingArticle.attachments || []);
      setQuizQuestions(existingArticle.quizQuestions || []);
      setQuizDurationMinutes(existingArticle.quizDurationMinutes || 0);
      setQuizMaxAttempts(existingArticle.quizMaxAttempts || 0);
      setQuizIsExam(Boolean(existingArticle.quizIsExam));
      setIsDirty(false);
    }
  }, [existingArticle]);

  // Check for unsaved local draft
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

  // Auto-save local draft when dirty
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isDirty) return;

    const timer = setTimeout(() => {
      try {
        const payload = {
          title,
          slug,
          summary,
          coverImage,
          categoryId,
          orderIndex,
          isPublished,
          requirePrevious,
          requireScrollToBottom,
          passScorePercent,
          blocks,
          attachments,
          quizQuestions,
          quizDurationMinutes,
          quizMaxAttempts,
          quizIsExam,
          audience,
          visibility,
          savedAt: formatTime(new Date()),
        };
        localStorage.setItem(draftStorageKey, JSON.stringify(payload));
        setLastDraftSavedAt(payload.savedAt);
      } catch {}
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    isDirty,
    title,
    slug,
    summary,
    coverImage,
    categoryId,
    orderIndex,
    isPublished,
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
  ]);

  // Browser beforeunload guard
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

  const restoreLocalDraft = () => {
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.title !== undefined) setTitle(d.title);
      if (d.slug !== undefined) setSlug(d.slug);
      if (d.summary !== undefined) setSummary(d.summary);
      if (d.coverImage !== undefined) setCoverImage(d.coverImage);
      if (d.categoryId !== undefined && !queryCategoryId) {
        setCategoryId(d.categoryId);
      }
      if (d.orderIndex !== undefined) setOrderIndex(d.orderIndex);
      if (d.isPublished !== undefined) setIsPublished(d.isPublished);
      if (d.requirePrevious !== undefined)
        setRequirePrevious(d.requirePrevious);
      if (d.requireScrollToBottom !== undefined)
        setRequireScrollToBottom(d.requireScrollToBottom);
      if (d.passScorePercent !== undefined)
        setPassScorePercent(d.passScorePercent);
      if (Array.isArray(d.blocks)) setBlocks(d.blocks);
      if (Array.isArray(d.attachments)) setAttachments(d.attachments);
      if (Array.isArray(d.quizQuestions)) setQuizQuestions(d.quizQuestions);
      if (d.quizDurationMinutes !== undefined)
        setQuizDurationMinutes(d.quizDurationMinutes);
      if (d.quizMaxAttempts !== undefined)
        setQuizMaxAttempts(d.quizMaxAttempts);
      if (d.quizIsExam !== undefined)
        setQuizIsExam(Boolean(d.quizIsExam));
      if (d.audience !== undefined) setAudience(d.audience);
      if (d.visibility !== undefined) setVisibility(d.visibility);
      setHasRestorableDraft(false);
      setIsDirty(true);
      showToast("Restored auto-saved draft from browser.", "info");
    } catch {}
  };

  const discardLocalDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {}
    setHasRestorableDraft(false);
  };

  const handleRollbackToReview = () => {
    setRollbackConfirmOpen(true);
  };

  const executeRollbackToReview = async () => {
    if (!existingArticle) return;
    setSaving(true);
    try {
      await saveArticle({
        id: existingArticle.id,
        title,
        slug,
        summary,
        coverImage,
        content: blocks,
        attachments,
        categoryId: categoryId || queryCategoryId || "cat_rules",
        orderIndex,
        status: "PENDING_REVIEW",
        isPublished: false,
        requirePrevious,
        requireScrollToBottom,
        passScorePercent: quizQuestions.length > 0 ? passScorePercent : 0,
        isRequired,
        audience,
        visibility,
        allowedGroups,
        quizQuestions,
        quizDurationMinutes,
        quizMaxAttempts,
        quizIsExam,
        authorId: existingArticle.authorId,
        authorName: existingArticle.authorName,
        updaterId: user?.uid || "admin",
        createdAt: existingArticle.createdAt,
      });

      setStatus("PENDING_REVIEW");
      setIsPublished(false);
      setIsDirty(false);
      showToast(
        "Reverted article to Pending Review. You can now edit the content.",
        "success"
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to revert article.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (targetStatus: ArticleStatus) => {
    if (!title.trim()) {
      showToast("Please enter an article title.", "error");
      return;
    }

    const finalPublished = targetStatus === "PUBLISHED";

    setSaving(true);
    try {
      const sanitizedQuizQuestions = quizQuestions.map((q) => {
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
      });

      const saved = await saveArticle({
        id: isNew ? undefined : articleIdParam,
        title: title.trim(),
        slug: slug.trim() || slugify(title),
        summary: summary.trim(),
        coverImage,
        content: blocks,
        attachments,
        categoryId: categoryId || queryCategoryId || "cat_rules",
        orderIndex,
        status: targetStatus,
        isPublished: finalPublished,
        requirePrevious,
        requireScrollToBottom,
        passScorePercent: sanitizedQuizQuestions.length > 0 ? passScorePercent : 0,
        isRequired,
        audience,
        visibility,
        allowedGroups,
        quizQuestions: sanitizedQuizQuestions,
        quizDurationMinutes,
        quizMaxAttempts,
        quizIsExam,
        authorId: existingArticle?.authorId || user?.uid || "admin",
        authorName:
          existingArticle?.authorName || user?.fullName || "Executive Board",
        updaterId: user?.uid || "admin",
        createdAt: existingArticle?.createdAt || new Date().toISOString(),
      });

      setStatus(targetStatus);
      setIsPublished(finalPublished);
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {}
      setIsDirty(false);
      setHasRestorableDraft(false);

      if (targetStatus === "PUBLISHED") {
        showToast("Article published and locked for reading.", "success");
      } else if (targetStatus === "PENDING_REVIEW") {
        showToast("Saved and submitted article for review.", "success");
      } else {
        showToast("Draft saved successfully.", "success");
      }

      if (isNew) {
        router.replace(`/studio/articles/${saved.id}`);
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save article.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBackClick = () => {
    if (isDirty) {
      setLeaveConfirmOpen(true);
    } else {
      router.push("/studio/articles");
    }
  };

  const canAccess = user?.role === "ADMIN" || user?.role === "EDITOR";
  if (!canAccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <ShieldAlert className="size-8 text-destructive mb-3" />
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          You need Administrator or Department Editor privileges to edit articles.
        </p>
        <Button onClick={() => router.push("/")} size="sm">
          Return to Handbook
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Distraction-Free Editor Bar (Fully Responsive) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-1.5 sm:gap-3 border-b border-border bg-background/95 px-2.5 sm:px-6 backdrop-blur">
        {/* Left: Back + Status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="gap-1 text-xs sm:text-sm font-medium cursor-pointer shrink-0 px-2 sm:px-3 h-8"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Articles</span>
          </Button>

          <Separator orientation="vertical" className="h-4 hidden sm:block" />

          <Badge
            variant="outline"
            className={`text-xs font-normal shrink-0 gap-1 px-1.5 py-0.5 sm:px-2.5 ${
              status === "PUBLISHED"
                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                : status === "PENDING_REVIEW"
                ? "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                : "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
            }`}
          >
            {status === "PUBLISHED" ? (
              <>
                <Lock className="size-3" />
                <span className="hidden sm:inline">Published (Locked)</span>
                <span className="sm:hidden">Locked</span>
              </>
            ) : status === "PENDING_REVIEW" ? (
              <>
                <Clock className="size-3" />
                <span>Pending Review</span>
              </>
            ) : (
              <span>Draft</span>
            )}
          </Badge>

          {/* Real-time Reading Time Prediction */}
          <Badge
            variant="secondary"
            className="hidden xl:inline-flex items-center gap-1.5 font-mono text-xs font-normal text-muted-foreground"
          >
            <Clock className="size-3 text-primary" />
            <span>~{estimatedReadingTime}m read</span>
          </Badge>

          <span className="hidden 2xl:inline-flex items-center gap-1 text-xs text-muted-foreground truncate">
            {isDirty ? (
              <>
                <Clock className="size-3 text-amber-500 shrink-0" />
                <span>
                  {lastDraftSavedAt
                    ? `Draft saved at ${lastDraftSavedAt}`
                    : "Unsaved changes"}
                </span>
              </>
            ) : (
              <>
                <Check className="size-3 text-emerald-500 shrink-0" />
                <span>Saved</span>
              </>
            )}
          </span>
        </div>

        {/* Center: Mode Switcher (Content | Quiz) */}
        <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveMode("content")}
            className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === "content"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="size-3.5" />
            <span className="hidden sm:inline">Content</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("quiz")}
            className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-3 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === "quiz"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileQuestion className="size-3.5" />
            <span className="hidden sm:inline">Quiz</span>
            <span className="font-mono text-[11px]">({quizQuestions.length})</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Full Actions */}
          <div className="hidden lg:flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Eye className="size-3.5" />
              <span>Preview</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Settings2 className="size-3.5" />
              <span>Settings</span>
              {attachments.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {attachments.length}
                </Badge>
              )}
            </Button>

            {!isNew && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = `${window.location.origin}/docs/${slug || existingArticle?.slug}`;
                  navigator.clipboard.writeText(url);
                  showToast(
                    `Copied share link: /docs/${slug || existingArticle?.slug}`,
                    "success"
                  );
                }}
                className="gap-1.5 text-xs cursor-pointer font-medium"
                title="Copy share link"
              >
                <Share2 className="size-3.5 text-primary" />
                <span>Share</span>
              </Button>
            )}

            {isLocked ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRollbackToReview}
                disabled={saving}
                className="gap-1.5 text-xs text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/10 cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Revert to Review</span>
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => handleSave("DRAFT")}
                  className="gap-1.5 text-xs cursor-pointer"
                >
                  <Save className="size-3.5" />
                  <span>Save Draft</span>
                </Button>

                {user?.role === "EDITOR" ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={() => handleSave("PENDING_REVIEW")}
                    className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    <Send className="size-3.5" />
                    <span>{saving ? "Submitting..." : "Submit for Review"}</span>
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={saving}
                      onClick={() => handleSave("PENDING_REVIEW")}
                      className="gap-1.5 text-xs cursor-pointer"
                    >
                      <Clock className="size-3.5" />
                      <span>Pending Review</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={saving}
                      onClick={() => handleSave("PUBLISHED")}
                      className="gap-1.5 text-xs cursor-pointer font-semibold"
                    >
                      <Send className="size-3.5" />
                      <span>{saving ? "Publishing..." : "Publish Article"}</span>
                    </Button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Compact Mobile / Tablet Action Bar (< lg) */}
          <div className="flex lg:hidden items-center gap-1.5">
            {!isLocked ? (
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => handleSave(status === "PUBLISHED" ? "PUBLISHED" : "DRAFT")}
                className="gap-1 text-xs font-semibold cursor-pointer h-8 px-2.5"
              >
                <Save className="size-3.5" />
                <span>{saving ? "Saving..." : "Save"}</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRollbackToReview}
                disabled={saving}
                className="h-8 px-2 text-xs text-amber-600 border-amber-500/30 cursor-pointer"
              >
                <RotateCcw className="size-3" />
                <span>Unlock</span>
              </Button>
            )}

            {/* Hamburger Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8 cursor-pointer shrink-0"
                  aria-label="Article Actions Menu"
                  title="Actions Menu"
                >
                  <Menu className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1">
                <DropdownMenuItem
                  onClick={() => setPreviewOpen(true)}
                  className="gap-2.5 cursor-pointer text-xs py-2"
                >
                  <Eye className="size-3.5 text-muted-foreground" />
                  <span>Preview Article</span>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="gap-2.5 cursor-pointer text-xs py-2 justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings2 className="size-3.5 text-muted-foreground" />
                    <span>Article Settings</span>
                  </div>
                  {attachments.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {attachments.length}
                    </Badge>
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {!isLocked && (
                  <>
                    <DropdownMenuItem
                      disabled={saving}
                      onClick={() => handleSave("DRAFT")}
                      className="gap-2.5 cursor-pointer text-xs py-2"
                    >
                      <Save className="size-3.5 text-muted-foreground" />
                      <span>Save Draft</span>
                    </DropdownMenuItem>

                    {user?.role === "EDITOR" ? (
                      <DropdownMenuItem
                        disabled={saving}
                        onClick={() => handleSave("PENDING_REVIEW")}
                        className="gap-2.5 cursor-pointer text-xs py-2 text-blue-600 font-medium"
                      >
                        <Send className="size-3.5" />
                        <span>Submit for Review</span>
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem
                          disabled={saving}
                          onClick={() => handleSave("PENDING_REVIEW")}
                          className="gap-2.5 cursor-pointer text-xs py-2"
                        >
                          <Clock className="size-3.5" />
                          <span>Save for Review</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={saving}
                          onClick={() => handleSave("PUBLISHED")}
                          className="gap-2.5 cursor-pointer text-xs py-2 text-primary font-semibold"
                        >
                          <Send className="size-3.5" />
                          <span>Publish Article</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}

                {isLocked && (
                  <DropdownMenuItem
                    onClick={handleRollbackToReview}
                    disabled={saving}
                    className="gap-2.5 cursor-pointer text-xs py-2 text-amber-600 font-medium"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Revert to Review</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Published Locked Warning Banner */}
      {isLocked && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 sm:px-6 py-3">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-amber-800 dark:text-amber-300 font-medium">
              <Lock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                This article is published and locked to prevent accidental changes. To make edits, revert the status to Pending Review.
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRollbackToReview}
              disabled={saving}
              className="h-8 text-xs font-semibold gap-1.5 border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 shrink-0 cursor-pointer shadow-xs"
            >
              <RotateCcw className="size-3.5" />
              <span>Unlock to Edit (Revert to Review)</span>
            </Button>
          </div>
        </div>
      )}

      {/* Auto-saved Local Draft Recovery Banner */}
      {hasRestorableDraft && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Found an auto-saved local draft on this browser.
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
                <span>Restore Draft</span>
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={discardLocalDraft}
                className="cursor-pointer"
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Centered Writing / Quiz Canvas */}
      <main
        className={cn(
          "flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 transition-opacity",
          isLocked && "pointer-events-none opacity-85 select-text"
        )}
      >
        {activeMode === "content" ? (
          <div className="space-y-6">
            {/* 3:1 Cover Image Banner with Crop & Vector Picker */}
            <CoverImagePicker
              value={coverImage}
              articleTitle={title || "New Article"}
              onChange={(url) => {
                if (isLocked) return;
                setCoverImage(url);
                markDirty();
              }}
            />

            {/* Document Title & Summary */}
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
                placeholder="Article title..."
                className="w-full resize-none overflow-hidden bg-transparent text-2xl sm:text-3xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-1 leading-snug break-words disabled:opacity-90"
              />

              <Textarea
                value={summary}
                disabled={isLocked}
                onChange={(e) => {
                  setSummary(e.target.value);
                  markDirty();
                }}
                placeholder="Brief summary of this lesson (1–2 sentences shown on roadmap cards)..."
                rows={2}
                className="resize-none border-none bg-transparent px-0 py-1 text-sm text-muted-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 disabled:opacity-90"
              />
            </div>

            <Separator />

            {/* Block Editor Canvas */}
            <BlockNoteEditor
              blocks={blocks}
              onChange={(nextBlocks) => {
                setBlocks(nextBlocks);
                markDirty();
              }}
            />

            {/* Dedicated Section: Attachments & Resources */}
            <div className="pt-8 mt-10 border-t border-border">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  <span>Lesson Attachments & Resources</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {attachments.length}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Attach external links or uploaded files (up to 5MB/file).
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
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                End-of-Lesson Assessment Quiz
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Verify comprehension before advancing. Members must achieve the passing score to complete this lesson.
              </p>
            </div>

            <QuizBuilder
              questions={quizQuestions}
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

      {/* Settings & Attachments Right Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Article Settings</SheetTitle>
            <SheetDescription className="text-sm">
              Category placement, learning gates, and audience permissions.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-8">
            {/* Category & Slug */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <SearchableCombobox
                  value={categoryId}
                  onValueChange={(val) => {
                    if (val) {
                      setCategoryId(val);
                      markDirty();
                    }
                  }}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: c.name,
                    depth: c.depth,
                    description: c.depth === 2 ? "Tier 2 Subcategory" : "Tier 1 Root Category",
                  }))}
                  placeholder="Select category..."
                  searchPlaceholder="Search categories..."
                  defaultLimit={5}
                  triggerClassName="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium">
                    Slug URL
                  </Label>
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      markDirty();
                    }}
                    placeholder="code-of-conduct"
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Order</Label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={orderIndex}
                    onChange={(e) => {
                      setOrderIndex(Math.max(1, Number(e.target.value) || 1));
                      markDirty();
                    }}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Learning Rules */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Learning Gates & Criteria
              </p>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Sequential Gate
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requires completing previous lessons in this category first.
                  </p>
                </div>
                <Switch
                  checked={requirePrevious}
                  onCheckedChange={(val) => {
                    setRequirePrevious(val);
                    markDirty();
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    Scroll Completion Gate
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requires scrolling to the bottom to verify completion.
                  </p>
                </div>
                <Switch
                  checked={requireScrollToBottom}
                  onCheckedChange={(val) => {
                    setRequireScrollToBottom(val);
                    markDirty();
                  }}
                />
              </div>

              {/* isRequired */}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">
                      Mandatory Curriculum Lesson
                    </p>
                    <Badge variant={isRequired ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                      {isRequired ? "Required" : "Optional"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Counted toward required completion percentage on the homepage.
                  </p>
                </div>
                <Switch
                  checked={isRequired}
                  onCheckedChange={(val) => {
                    setIsRequired(val);
                    markDirty();
                  }}
                />
              </div>

              {/* AUDIENCE */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Audience & Access Control
                </p>

                <div className="rounded-lg border border-border p-3.5 space-y-3 bg-muted/10">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {audience === "FREE"
                              ? "Free (No login required)"
                              : "Internal (Login required)"}
                          </p>
                          <Badge
                            variant={audience === "FREE" ? "secondary" : "default"}
                            className="text-[10px]"
                          >
                            {audience === "FREE"
                              ? "🌐 Public / Free"
                              : "🔒 MPC Members Only"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {audience === "FREE"
                            ? "No authentication required. Anyone visiting the site or with the link can read."
                            : "Requires signing in with an MPC account. Can be restricted to specific departments or open to all members."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAudience("FREE");
                          markDirty();
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                          audience === "FREE"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <Globe className="size-4 mb-1" />
                        <span>Free</span>
                        <span className="text-[10px] opacity-75 font-normal">No login required</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAudience("INTERNAL");
                          markDirty();
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                          audience === "INTERNAL"
                            ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <Lock className="size-4 mb-1" />
                        <span>Internal</span>
                        <span className="text-[10px] opacity-75 font-normal">Login required</span>
                      </button>
                    </div>
                  </div>

                  {/* Department Restrictions */}
                  {audience === "INTERNAL" && (
                    <div className="space-y-3 pt-3 border-t border-border/60">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Users className="size-3.5 text-primary" />
                            <p className="text-xs font-semibold text-foreground">
                              Department-specific Permissions
                            </p>
                            {allowedGroups.length > 0 ? (
                              <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground font-semibold">
                                Restricted to {allowedGroups.length} dept(s)
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 text-emerald-600 bg-emerald-500/10 border border-emerald-500/30">
                                All MPC Members
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            <strong>Blank:</strong> Accessible to all logged-in MPC members. <strong>Selected:</strong> Only members in these departments (and Admins) can read.
                          </p>
                        </div>
                      </div>

                      {(() => {
                        const availableDepts =
                          departments && departments.length > 0
                            ? departments.map((d) => d.name)
                            : [
                                "Executive Board",
                                "Technical Department",
                                "Media & Events Department",
                                "HR & External Relations",
                              ];

                        return (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-[11px] pt-1">
                              <span className="text-muted-foreground font-medium">
                                Allowed departments:
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAllowedGroups(availableDepts);
                                    markDirty();
                                  }}
                                  className="text-primary hover:underline cursor-pointer"
                                >
                                  Select all
                                </button>
                                <span className="text-muted-foreground">·</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAllowedGroups([]);
                                    markDirty();
                                  }}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  Clear (All MPC)
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {availableDepts.map((dept) => {
                                const isChecked = allowedGroups.includes(dept);
                                return (
                                  <label
                                    key={dept}
                                    className={cn(
                                      "flex items-center gap-2 text-xs cursor-pointer p-2 rounded-lg border transition-all select-none",
                                      isChecked
                                        ? "border-primary/50 bg-primary/5 font-medium text-foreground"
                                        : "border-border/70 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        setAllowedGroups((prev) =>
                                          checked
                                            ? [...prev, dept]
                                            : prev.filter((d) => d !== dept)
                                        );
                                        markDirty();
                                      }}
                                    />
                                    <span className="truncate">{dept}</span>
                                  </label>
                                );
                              })}
                            </div>

                            {allowedGroups.length > 0 && (
                              <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground">Selected:</span>
                                {allowedGroups.map((g) => (
                                  <Badge
                                    key={g}
                                    variant="secondary"
                                    className="text-[11px] py-0.5 pl-2 pr-1 gap-1 bg-background border border-border"
                                  >
                                    <span>{g}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAllowedGroups((prev) => prev.filter((d) => d !== g));
                                        markDirty();
                                      }}
                                      className="size-3.5 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-destructive"
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* VISIBILITY */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Visibility & Discoverability
                </p>

                <div className="rounded-lg border border-border p-3.5 space-y-3 bg-muted/10">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {visibility === "PUBLIC"
                              ? "Public"
                              : "Unlisted"}
                          </p>
                          <Badge
                            variant={visibility === "PUBLIC" ? "success" : "secondary"}
                            className="text-[10px]"
                          >
                            {visibility === "PUBLIC"
                              ? "👁️ Listed on homepage & search"
                              : "🔗 Hidden from listings · Direct link only"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {visibility === "PUBLIC"
                            ? "Appears on curriculum roadmaps, homepage, sidebar, and search (Ctrl+K)."
                            : "Hidden from roadmaps and search. Accessible only to readers with the direct link."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setVisibility("PUBLIC");
                          markDirty();
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                          visibility === "PUBLIC"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <Eye className="size-4 mb-1" />
                        <span>Public</span>
                        <span className="text-[10px] opacity-75 font-normal">Listed on site</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setVisibility("UNPUBLIC");
                          markDirty();
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                          visibility === "UNPUBLIC"
                            ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold shadow-xs"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <Link2 className="size-4 mb-1" />
                        <span>Unlisted</span>
                        <span className="text-[10px] opacity-75 font-normal">Direct link only</span>
                      </button>
                    </div>
                  </div>

                  {!isNew && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = `${window.location.origin}/docs/${slug || existingArticle?.slug}`;
                          navigator.clipboard.writeText(url);
                          showToast(`Copied share link: ${url}`, "success");
                        }}
                        className="text-xs h-8 gap-1.5 cursor-pointer font-medium"
                      >
                        <Share2 className="size-3.5 text-primary" />
                        <span>Copy Share Link</span>
                      </Button>
                      <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[180px]">
                        /docs/{slug || existingArticle?.slug}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Live Preview Wide Sheet */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="text-base">Live Article Preview</SheetTitle>
            <SheetDescription className="text-sm">
              As seen by members reading in the handbook.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-10">
            <div className="overflow-hidden rounded-xl border border-border">
              <ArticleCover
                coverImage={coverImage}
                title={title || "Sample Article"}
              />
            </div>

            <div className="space-y-2 border-b border-border pb-4">
              <h1 className="text-2xl font-bold text-foreground">
                {title || "Untitled Article"}
              </h1>
              {summary && (
                <p className="text-sm text-muted-foreground">{summary}</p>
              )}
            </div>

            <ArticleRenderer
              blocks={blocks}
              attachments={attachments}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Unsaved Changes Leave Guard */}
      <ConfirmDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title="Unsaved Changes"
        description="If you leave now, unsaved changes will be lost. Are you sure you want to exit?"
        confirmLabel="Discard Changes & Leave"
        cancelLabel="Stay on Editor"
        variant="destructive"
        onConfirm={() => {
          setIsDirty(false);
          router.push("/studio/articles");
        }}
      />

      {/* Confirm Rollback to Pending Review */}
      <ConfirmDialog
        open={rollbackConfirmOpen}
        onOpenChange={setRollbackConfirmOpen}
        title="Revert Article to Review"
        description="This article is currently published and locked. Reverting it will transition it back to Pending Review so you can edit the content. Are you sure you want to proceed?"
        confirmLabel="Confirm Revert"
        cancelLabel="Cancel"
        onConfirm={executeRollbackToReview}
      />
    </div>
  );
}

