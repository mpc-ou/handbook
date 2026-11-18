"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Cover } from "@/components/ui/Cover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isSequential } from "@/lib/progression";
import type {
  CategoryRecord,
  ContentStatus,
  CourseRecord,
  ItemRecord,
  ItemType,
  LessonRecord,
} from "@/types";
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  FileEdit,
  GripVertical,
  HelpCircle,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

const STATUS_BADGE_CLASS: Record<ContentStatus, string> = {
  PUBLISHED:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PENDING_REVIEW:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  DRAFT: "border-border bg-muted text-muted-foreground",
};

function getItemTypeIcon(type: ItemType) {
  switch (type) {
    case "QUIZ":
      return HelpCircle;
    case "ASSIGNMENT":
      return ClipboardCheck;
    default:
      return BookOpen;
  }
}

/* ───────────────────────── 1. SortableItemRow ───────────────────────── */

export interface SortableItemRowProps {
  item: ItemRecord;
  index: number;
  totalCount: number;
  course: CourseRecord;
  lesson: LessonRecord;
  isAdmin: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChangeSequential: (item: ItemRecord, nextVal: boolean | null) => void;
  onChangeStatus: (item: ItemRecord, status: ContentStatus) => void;
  onDuplicate: (item: ItemRecord) => void;
  onOpenMoveLesson: (item: ItemRecord) => void;
  onDelete: (item: ItemRecord) => void;
}

export function SortableItemRow({
  item,
  index,
  totalCount,
  course,
  lesson,
  isAdmin,
  onMoveUp,
  onMoveDown,
  onChangeStatus,
  onDuplicate,
  onOpenMoveLesson,
  onDelete,
}: SortableItemRowProps) {
  const t = useTranslations("studio.curriculum");
  const tCommon = useTranslations("common");
  const reduceMotion = useReducedMotion();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: reduceMotion ? undefined : transition,
  };

  const TypeIcon = getItemTypeIcon(item.type);
  const typeLabel = tCommon(`itemType.${item.type}`);
  const effectiveSeq = isSequential(course, lesson, item);

  const inheritanceExplanation =
    item.requirePrevious !== null
      ? item.requirePrevious
        ? t("sequential.itemOverrideLocked")
        : t("sequential.itemOverrideFree")
      : lesson.requirePrevious !== null
      ? t("sequential.inheritFromLesson", {
          title: lesson.title,
          mode: effectiveSeq
            ? t("sequential.lockedShort")
            : t("sequential.freeShort"),
        })
      : t("sequential.inheritFromCourse", {
          title: course.title,
          mode: effectiveSeq
            ? t("sequential.lockedShort")
            : t("sequential.freeShort"),
        });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-2.5 rounded-lg border border-border/70 bg-background px-3 py-2 transition-colors ${
        isDragging ? "opacity-60 ring-2 ring-primary z-10" : "hover:bg-muted/30"
      }`}
    >
      {/* Left: Drag handle + Index + Type Icon + Title + Sequential Icon + Non-default Status */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 shrink-0"
          aria-label={t("actions.dragItem")}
          title={t("actions.dragItem")}
        >
          <GripVertical className="size-4" />
        </button>

        <span className="text-xs font-mono text-muted-foreground tabular-nums w-5 text-center shrink-0">
          {index + 1}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground">
              <TypeIcon className="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{typeLabel}</TooltipContent>
        </Tooltip>

        <Link
          href={`/studio/items/${item.id}`}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate cursor-pointer"
        >
          {item.title}
        </Link>

        {/* Cờ học theo thứ tự: icon nhỏ + tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="inline-flex items-center text-muted-foreground shrink-0"
              aria-label={
                effectiveSeq
                  ? t("sequential.effectiveLocked")
                  : t("sequential.effectiveFree")
              }
            >
              {effectiveSeq ? (
                <Lock className="size-3 text-primary/80" />
              ) : (
                <LockOpen className="size-3 text-muted-foreground/50" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p className="font-semibold">
              {effectiveSeq
                ? t("sequential.effectiveLocked")
                : t("sequential.effectiveFree")}
            </p>
            <p className="mt-0.5 opacity-90">{inheritanceExplanation}</p>
          </TooltipContent>
        </Tooltip>

        {/* Trạng thái chỉ khi khác mặc định (PUBLISHED) */}
        {item.status !== "PUBLISHED" && (
          <Badge
            variant="outline"
            className={`text-[11px] px-1.5 py-0 h-4 shrink-0 ${
              STATUS_BADGE_CLASS[item.status] || STATUS_BADGE_CLASS.DRAFT
            }`}
          >
            {tCommon(`status.${item.status}`)}
          </Badge>
        )}
      </div>

      {/* Right: Menu ⋯ */}
      <div className="flex items-center gap-1 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={t("actions.moreActions")}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/studio/items/${item.id}`}>
                <FileEdit className="size-3.5" />
                <span>{t("item.editContent")}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(item)}>
              <Copy className="size-3.5" />
              <span>{t("item.duplicate")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenMoveLesson(item)}>
              <ArrowRightLeft className="size-3.5" />
              <span>{t("item.moveLesson")}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("actions.changeStatus")}</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={item.status === "DRAFT"}
              onClick={() => onChangeStatus(item, "DRAFT")}
            >
              <span>{tCommon("status.DRAFT")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={item.status === "PENDING_REVIEW"}
              onClick={() => onChangeStatus(item, "PENDING_REVIEW")}
            >
              <span>{tCommon("status.PENDING_REVIEW")}</span>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem
                disabled={item.status === "PUBLISHED"}
                onClick={() => onChangeStatus(item, "PUBLISHED")}
              >
                <span>{tCommon("status.PUBLISHED")}</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={index === 0} onClick={onMoveUp}>
              <ArrowUp className="size-3.5" />
              <span>{t("actions.moveUp")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={index === totalCount - 1}
              onClick={onMoveDown}
            >
              <ArrowDown className="size-3.5" />
              <span>{t("actions.moveDown")}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="size-3.5" />
              <span>{tCommon("actions.delete")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ───────────────────────── 2. SortableLessonCard ───────────────────────── */

export interface SortableLessonCardProps {
  lesson: LessonRecord;
  index: number;
  totalCount: number;
  course: CourseRecord;
  items: ItemRecord[];
  expanded: boolean;
  isAdmin: boolean;
  onToggleExpand: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChangeSequential: (lesson: LessonRecord, nextVal: boolean | null) => void;
  onTogglePublished: (lesson: LessonRecord) => void;
  onEditLesson: (lesson: LessonRecord, course: CourseRecord) => void;
  onDeleteLesson: (lesson: LessonRecord) => void;
  onAddItem: (lesson: LessonRecord, course: CourseRecord) => void;
  onReorderItems: (lessonId: string, orderedIds: string[]) => void;
  onChangeItemSequential: (item: ItemRecord, nextVal: boolean | null) => void;
  onChangeItemStatus: (item: ItemRecord, status: ContentStatus) => void;
  onDuplicateItem: (item: ItemRecord) => void;
  onOpenMoveItem: (item: ItemRecord) => void;
  onDeleteItem: (item: ItemRecord) => void;
}

export function SortableLessonCard({
  lesson,
  index,
  totalCount,
  course,
  items,
  expanded,
  isAdmin,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onTogglePublished,
  onEditLesson,
  onDeleteLesson,
  onAddItem,
  onReorderItems,
  onChangeItemSequential,
  onChangeItemStatus,
  onDuplicateItem,
  onOpenMoveItem,
  onDeleteItem,
}: SortableLessonCardProps) {
  const t = useTranslations("studio.curriculum");
  const tCommon = useTranslations("common");
  const reduceMotion = useReducedMotion();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: reduceMotion ? undefined : transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const effectiveSeq = isSequential(course, lesson, { requirePrevious: null });

  const lessonInheritanceText =
    lesson.requirePrevious !== null
      ? lesson.requirePrevious
        ? t("sequential.lessonOverrideLocked")
        : t("sequential.lessonOverrideFree")
      : t("sequential.inheritFromCourse", {
          title: course.title,
          mode: effectiveSeq
            ? t("sequential.lockedShort")
            : t("sequential.freeShort"),
        });

  const handleDragEndItems = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorderItems(
      lesson.id,
      reordered.map((i) => i.id)
    );
  };

  const handleMoveItemAt = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= items.length) return;
    const reordered = arrayMove(items, fromIdx, toIdx);
    onReorderItems(
      lesson.id,
      reordered.map((i) => i.id)
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-border/80 bg-muted/15 overflow-hidden transition-colors ${
        isDragging ? "opacity-60 ring-2 ring-primary z-10" : ""
      }`}
    >
      {/* Lesson 1-Line Header */}
      <div className="flex items-center justify-between gap-2.5 px-3 py-2 hover:bg-muted/25 transition-colors">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 shrink-0"
            aria-label={t("actions.dragLesson")}
            title={t("actions.dragLesson")}
          >
            <GripVertical className="size-4" />
          </button>

          <button
            type="button"
            onClick={onToggleExpand}
            className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label={
              expanded ? t("actions.collapse") : t("actions.expand")
            }
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>

          {/* Ảnh bìa thu nhỏ của Bài học */}
          <div className="w-11 sm:w-12 shrink-0 overflow-hidden rounded border border-border">
            <Cover
              coverImage={lesson.coverImage}
              title={lesson.title}
              seedId={lesson.id}
              aspectRatio="16/9"
              showLabel={false}
            />
          </div>

          <h3
            onClick={onToggleExpand}
            className="text-sm font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors"
          >
            {lesson.title}
          </h3>

          {/* Cờ học theo thứ tự: icon nhỏ + tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex items-center text-muted-foreground shrink-0"
                aria-label={
                  effectiveSeq
                    ? t("sequential.effectiveLocked")
                    : t("sequential.effectiveFree")
                }
              >
                {effectiveSeq ? (
                  <Lock className="size-3.5 text-primary/80" />
                ) : (
                  <LockOpen className="size-3.5 text-muted-foreground/50" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              <p className="font-semibold">
                {effectiveSeq
                  ? t("sequential.effectiveLocked")
                  : t("sequential.effectiveFree")}
              </p>
              <p className="mt-0.5 opacity-90">{lessonInheritanceText}</p>
            </TooltipContent>
          </Tooltip>

          {/* Trạng thái chỉ khi khác mặc định (chỉ khi đang ẩn) */}
          {!lesson.isPublished && (
            <Badge
              variant="outline"
              className="text-[11px] px-1.5 py-0 h-4 shrink-0 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            >
              {t("lesson.hiddenBadge")}
            </Badge>
          )}

          <span className="hidden sm:inline text-xs text-muted-foreground tabular-nums shrink-0">
            {t("lesson.itemCount", { count: items.length })}
          </span>
        </div>

        {/* Lesson Right Actions: Add Item + Menu ⋯ */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onAddItem(lesson, course)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Plus className="size-3.5 mr-1" />
            <span className="hidden sm:inline">{t("lesson.addItem")}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={t("actions.moreActions")}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEditLesson(lesson, course)}>
                <Pencil className="size-3.5" />
                <span>{tCommon("actions.edit")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddItem(lesson, course)}>
                <Plus className="size-3.5" />
                <span>{t("lesson.addItem")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePublished(lesson)}>
                {lesson.isPublished ? (
                  <>
                    <EyeOff className="size-3.5" />
                    <span>{t("lesson.hideLesson")}</span>
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5" />
                    <span>{t("lesson.showLesson")}</span>
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={index === 0} onClick={onMoveUp}>
                <ArrowUp className="size-3.5" />
                <span>{t("actions.moveUp")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={index === totalCount - 1}
                onClick={onMoveDown}
              >
                <ArrowDown className="size-3.5" />
                <span>{t("actions.moveDown")}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDeleteLesson(lesson)}
              >
                <Trash2 className="size-3.5" />
                <span>{tCommon("actions.delete")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Lesson Items Body with AnimatePresence */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="lesson-items"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
            }
            className="overflow-hidden"
          >
            <div className="border-t border-border/60 p-2.5 space-y-1.5">
              {items.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndItems}
                >
                  <SortableContext
                    items={items.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5">
                      {items.map((item, idx) => (
                        <SortableItemRow
                          key={item.id}
                          item={item}
                          index={idx}
                          totalCount={items.length}
                          course={course}
                          lesson={lesson}
                          isAdmin={isAdmin}
                          onMoveUp={() => handleMoveItemAt(idx, idx - 1)}
                          onMoveDown={() => handleMoveItemAt(idx, idx + 1)}
                          onChangeSequential={onChangeItemSequential}
                          onChangeStatus={onChangeItemStatus}
                          onDuplicate={onDuplicateItem}
                          onOpenMoveLesson={onOpenMoveItem}
                          onDelete={onDeleteItem}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-background/60 px-3.5 py-2.5 text-xs text-muted-foreground">
                  <span>{t("lesson.emptyItems")}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onAddItem(lesson, course)}
                    className="cursor-pointer shrink-0"
                  >
                    <Plus className="size-3.5 mr-1" />
                    <span>{t("lesson.addFirstItem")}</span>
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── 3. SortableCourseCard ───────────────────────── */

export interface SortableCourseCardProps {
  course: CourseRecord;
  index: number;
  totalCount: number;
  lessons: LessonRecord[];
  itemsByLesson: Map<string, ItemRecord[]>;
  categoryMap: Map<string, CategoryRecord>;
  expanded: boolean;
  expandedLessonIds: Set<string>;
  isAdmin: boolean;
  onToggleExpand: () => void;
  onToggleLessonExpand: (lessonId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleCourseSequential: (course: CourseRecord, nextVal: boolean) => void;
  onChangeCourseStatus: (course: CourseRecord, status: ContentStatus) => void;
  onEditCourse: (course: CourseRecord) => void;
  onDeleteCourse: (course: CourseRecord) => void;
  onAddLesson: (course: CourseRecord) => void;
  onEditLesson: (lesson: LessonRecord, course: CourseRecord) => void;
  onDeleteLesson: (lesson: LessonRecord) => void;
  onChangeLessonSequential: (
    lesson: LessonRecord,
    nextVal: boolean | null
  ) => void;
  onToggleLessonPublished: (lesson: LessonRecord) => void;
  onReorderLessons: (courseId: string, orderedIds: string[]) => void;
  onAddItem: (lesson: LessonRecord, course: CourseRecord) => void;
  onReorderItems: (lessonId: string, orderedIds: string[]) => void;
  onChangeItemSequential: (item: ItemRecord, nextVal: boolean | null) => void;
  onChangeItemStatus: (item: ItemRecord, status: ContentStatus) => void;
  onDuplicateItem: (item: ItemRecord) => void;
  onOpenMoveItem: (item: ItemRecord) => void;
  onDeleteItem: (item: ItemRecord) => void;
}

export function SortableCourseCard({
  course,
  index,
  totalCount,
  lessons,
  itemsByLesson,
  expanded,
  expandedLessonIds,
  isAdmin,
  onToggleExpand,
  onToggleLessonExpand,
  onMoveUp,
  onMoveDown,
  onChangeCourseStatus,
  onEditCourse,
  onDeleteCourse,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onChangeLessonSequential,
  onToggleLessonPublished,
  onReorderLessons,
  onAddItem,
  onReorderItems,
  onChangeItemSequential,
  onChangeItemStatus,
  onDuplicateItem,
  onOpenMoveItem,
  onDeleteItem,
}: SortableCourseCardProps) {
  const t = useTranslations("studio.curriculum");
  const tCommon = useTranslations("common");
  const reduceMotion = useReducedMotion();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: reduceMotion ? undefined : transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const totalItemsCount = lessons.reduce(
    (sum, l) => sum + (itemsByLesson.get(l.id)?.length || 0),
    0
  );

  const handleDragEndLessons = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(lessons, oldIndex, newIndex);
    onReorderLessons(
      course.id,
      reordered.map((l) => l.id)
    );
  };

  const handleMoveLessonAt = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= lessons.length) return;
    const reordered = arrayMove(lessons, fromIdx, toIdx);
    onReorderLessons(
      course.id,
      reordered.map((l) => l.id)
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-border bg-card overflow-hidden transition-colors ${
        isDragging ? "opacity-60 ring-2 ring-primary z-10" : ""
      }`}
    >
      {/* Course 1-Line Header */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-muted/20 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 shrink-0"
            aria-label={t("actions.dragCourse")}
            title={t("actions.dragCourse")}
          >
            <GripVertical className="size-4" />
          </button>

          <button
            type="button"
            onClick={onToggleExpand}
            className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label={
              expanded ? t("actions.collapse") : t("actions.expand")
            }
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>

          {/* Ảnh bìa thu nhỏ của Khóa học */}
          <div className="w-14 sm:w-16 shrink-0 overflow-hidden rounded border border-border">
            <Cover
              coverImage={course.coverImage}
              title={course.title}
              seedId={course.id}
              aspectRatio="3/1"
              showLabel={false}
            />
          </div>

          <h2
            onClick={onToggleExpand}
            className="text-sm font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
          >
            {course.title}
          </h2>

          {/* Cờ học theo thứ tự: icon nhỏ + tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex items-center text-muted-foreground shrink-0"
                aria-label={
                  course.sequential
                    ? t("sequential.courseLocked")
                    : t("sequential.courseFree")
                }
              >
                {course.sequential ? (
                  <Lock className="size-3.5 text-primary/80" />
                ) : (
                  <LockOpen className="size-3.5 text-muted-foreground/50" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              <p className="font-semibold">
                {course.sequential
                  ? t("sequential.courseLocked")
                  : t("sequential.courseFree")}
              </p>
              <p className="mt-0.5 opacity-90">
                {course.sequential
                  ? t("sequential.courseLockedHint")
                  : t("sequential.courseFreeHint")}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Trạng thái chỉ khi khác mặc định (PUBLISHED) */}
          {course.status !== "PUBLISHED" && (
            <Badge
              variant="outline"
              className={`text-[11px] px-1.5 py-0 h-4 shrink-0 ${
                STATUS_BADGE_CLASS[course.status] || STATUS_BADGE_CLASS.DRAFT
              }`}
            >
              {tCommon(`status.${course.status}`)}
            </Badge>
          )}

          {/* Đối tượng chỉ khi khác mặc định (FREE) */}
          {course.audience === "INTERNAL" && (
            <Badge
              variant="outline"
              className="text-[11px] px-1.5 py-0 h-4 shrink-0 text-muted-foreground"
            >
              {t("course.internalBadge")}
            </Badge>
          )}

          <span className="hidden md:inline text-xs text-muted-foreground tabular-nums shrink-0">
            {t("course.counts", {
              lessons: lessons.length,
              items: totalItemsCount,
            })}
          </span>
        </div>

        {/* Course Right Actions: Add Lesson + Menu ⋯ */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onAddLesson(course)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Plus className="size-3.5 mr-1" />
            <span className="hidden sm:inline">{t("course.addLesson")}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={t("actions.moreActions")}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onEditCourse(course)}>
                <Pencil className="size-3.5" />
                <span>{tCommon("actions.edit")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddLesson(course)}>
                <Plus className="size-3.5" />
                <span>{t("course.addLesson")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/learn/${course.slug}`}>
                  <ExternalLink className="size-3.5" />
                  <span>{t("course.viewCourse")}</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("actions.changeStatus")}</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={course.status === "DRAFT"}
                onClick={() => onChangeCourseStatus(course, "DRAFT")}
              >
                <span>{tCommon("status.DRAFT")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={course.status === "PENDING_REVIEW"}
                onClick={() => onChangeCourseStatus(course, "PENDING_REVIEW")}
              >
                <span>{tCommon("status.PENDING_REVIEW")}</span>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem
                  disabled={course.status === "PUBLISHED"}
                  onClick={() => onChangeCourseStatus(course, "PUBLISHED")}
                >
                  <span>{tCommon("status.PUBLISHED")}</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={index === 0} onClick={onMoveUp}>
                <ArrowUp className="size-3.5" />
                <span>{t("actions.moveUp")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={index === totalCount - 1}
                onClick={onMoveDown}
              >
                <ArrowDown className="size-3.5" />
                <span>{t("actions.moveDown")}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDeleteCourse(course)}
              >
                <Trash2 className="size-3.5" />
                <span>{tCommon("actions.delete")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Course Lessons Body with AnimatePresence */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="course-lessons"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }
            }
            className="overflow-hidden"
          >
            <div className="border-t border-border p-3 space-y-2.5 bg-background/40">
              {lessons.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEndLessons}
                >
                  <SortableContext
                    items={lessons.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {lessons.map((lesson, idx) => (
                        <SortableLessonCard
                          key={lesson.id}
                          lesson={lesson}
                          index={idx}
                          totalCount={lessons.length}
                          course={course}
                          items={itemsByLesson.get(lesson.id) || []}
                          expanded={expandedLessonIds.has(lesson.id)}
                          isAdmin={isAdmin}
                          onToggleExpand={() => onToggleLessonExpand(lesson.id)}
                          onMoveUp={() => handleMoveLessonAt(idx, idx - 1)}
                          onMoveDown={() => handleMoveLessonAt(idx, idx + 1)}
                          onChangeSequential={onChangeLessonSequential}
                          onTogglePublished={onToggleLessonPublished}
                          onEditLesson={onEditLesson}
                          onDeleteLesson={onDeleteLesson}
                          onAddItem={onAddItem}
                          onReorderItems={onReorderItems}
                          onChangeItemSequential={onChangeItemSequential}
                          onChangeItemStatus={onChangeItemStatus}
                          onDuplicateItem={onDuplicateItem}
                          onOpenMoveItem={onOpenMoveItem}
                          onDeleteItem={onDeleteItem}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 rounded-lg border border-dashed border-border bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
                  <span>{t("course.emptyLessons")}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onAddLesson(course)}
                    className="cursor-pointer shrink-0"
                  >
                    <Plus className="size-3.5 mr-1" />
                    <span>{t("course.addFirstLesson")}</span>
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
