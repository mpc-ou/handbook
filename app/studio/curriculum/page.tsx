"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { CategoryManager } from "@/components/studio/curriculum/CategoryManager";
import { CourseDialog } from "@/components/studio/curriculum/CourseDialog";
import { LessonDialog } from "@/components/studio/curriculum/LessonDialog";
import {
  ItemQuickDialog,
  MoveItemDialog,
} from "@/components/studio/curriculum/ItemQuickDialog";
import { SortableCourseCard } from "@/components/studio/curriculum/SortableRows";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { canUserManageCourse } from "@/lib/progression";
import type {
  CategoryRecord,
  ContentStatus,
  CourseRecord,
  ItemRecord,
  LessonRecord,
} from "@/types";
import {
  AlertCircle,
  BookOpen,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderTree,
  Loader2,
  Plus,
  Tag,
} from "lucide-react";

export default function StudioCurriculumPage() {
  const t = useTranslations("studio");
  const tCur = useTranslations("studio.curriculum");
  const tCommon = useTranslations("common");

  const {
    user,
    dataLoading,
    dbError,
    categories,
    courses,
    lessons,
    items,
    departments,
    createCategory,
    updateCategory,
    deleteCategory,
    saveCourse,
    deleteCourse,
    updateCourseStatus,
    saveLesson,
    deleteLesson,
    saveItem,
    deleteItem,
    duplicateItem,
    updateItemStatus,
    reorderChildren,
    showToast,
  } = useHandbook();

  const isAdmin = user?.role === "ADMIN";

  const [sessionCreatedCourseIds, setSessionCreatedCourseIds] = useState<
    string[]
  >([]);

  const [activeCategoryFilter, setActiveCategoryFilter] =
    useState<string>("ALL");

  // Mặc định thu gọn mọi Course và Lesson
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(
    new Set()
  );
  const [expandedLessonIds, setExpandedLessonIds] = useState<Set<string>>(
    new Set()
  );

  // Trạng thái các Dialog
  const [catManagerOpen, setCatManagerOpen] = useState(false);

  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRecord | null>(null);

  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [lessonDialogCourse, setLessonDialogCourse] =
    useState<CourseRecord | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonRecord | null>(null);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemDialogLesson, setItemDialogLesson] =
    useState<LessonRecord | null>(null);
  const [itemDialogCourseTitle, setItemDialogCourseTitle] = useState("");

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingItem, setMovingItem] = useState<ItemRecord | null>(null);

  const [confirmCourseDelete, setConfirmCourseDelete] = useState<{
    course: CourseRecord;
    lessonCount: number;
    itemCount: number;
  } | null>(null);

  const [confirmLessonDelete, setConfirmLessonDelete] = useState<{
    lesson: LessonRecord;
    itemCount: number;
  } | null>(null);

  const [deleteTargetItem, setDeleteTargetItem] = useState<ItemRecord | null>(
    null
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const manageableCourses = useMemo(
    () =>
      courses
        .filter(
          (c) =>
            isAdmin ||
            canUserManageCourse(user, c.id) ||
            sessionCreatedCourseIds.includes(c.id)
        )
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [courses, isAdmin, user, sessionCreatedCourseIds]
  );

  const visibleCourses = useMemo(() => {
    if (activeCategoryFilter === "ALL") return manageableCourses;
    return manageableCourses.filter((c) =>
      (c.categoryIds || []).includes(activeCategoryFilter)
    );
  }, [manageableCourses, activeCategoryFilter]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryRecord>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const lessonsByCourse = useMemo(() => {
    const map = new Map<string, LessonRecord[]>();
    const sorted = [...lessons].sort((a, b) => a.orderIndex - b.orderIndex);
    for (const l of sorted) {
      const list = map.get(l.courseId) || [];
      list.push(l);
      map.set(l.courseId, list);
    }
    return map;
  }, [lessons]);

  const itemsByLesson = useMemo(() => {
    const map = new Map<string, ItemRecord[]>();
    const sorted = [...items].sort((a, b) => a.orderIndex - b.orderIndex);
    for (const i of sorted) {
      const list = map.get(i.lessonId) || [];
      list.push(i);
      map.set(i.lessonId, list);
    }
    return map;
  }, [items]);

  const toggleCourseExpand = (courseId: string) => {
    setExpandedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const toggleLessonExpand = (lessonId: string) => {
    setExpandedLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCourseIds(new Set(manageableCourses.map((c) => c.id)));
    setExpandedLessonIds(new Set(lessons.map((l) => l.id)));
  };

  const collapseAll = () => {
    setExpandedCourseIds(new Set());
    setExpandedLessonIds(new Set());
  };

  /* ───────────────────────── Thao tác sắp xếp (Reorder) ───────────────────────── */

  const handleReorderCourses = async (reorderedVisibleIds: string[]) => {
    const allSorted = [...courses].sort((a, b) => a.orderIndex - b.orderIndex);
    const visibleSet = new Set(reorderedVisibleIds);
    let pointer = 0;
    const mergedIds = allSorted.map((c) =>
      visibleSet.has(c.id) ? reorderedVisibleIds[pointer++] : c.id
    );

    try {
      await reorderChildren("course", null, mergedIds);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : tCur("toasts.reorderCourseFailed"),
        "error"
      );
    }
  };

  const handleDragEndCourses = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleCourses.findIndex((c) => c.id === active.id);
    const newIndex = visibleCourses.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(visibleCourses, oldIndex, newIndex);
    void handleReorderCourses(reordered.map((c) => c.id));
  };

  const handleMoveCourseAt = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= visibleCourses.length) return;
    const reordered = arrayMove(visibleCourses, fromIdx, toIdx);
    void handleReorderCourses(reordered.map((c) => c.id));
  };

  const handleReorderLessons = async (
    courseId: string,
    orderedIds: string[]
  ) => {
    try {
      await reorderChildren("lesson", courseId, orderedIds);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : tCur("toasts.reorderLessonFailed"),
        "error"
      );
    }
  };

  const handleReorderItems = async (lessonId: string, orderedIds: string[]) => {
    try {
      await reorderChildren("item", lessonId, orderedIds);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : tCur("toasts.reorderItemFailed"),
        "error"
      );
    }
  };

  /* ───────────────────────── Thao tác Khóa học ───────────────────────── */

  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseDialogOpen(true);
  };

  const openEditCourse = (course: CourseRecord) => {
    setEditingCourse(course);
    setCourseDialogOpen(true);
  };

  const handleToggleCourseSequential = async (
    course: CourseRecord,
    nextVal: boolean
  ) => {
    try {
      await saveCourse({
        id: course.id,
        title: course.title,
        sequential: nextVal,
      });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : tCur("toasts.updateCourseFailed"),
        "error"
      );
    }
  };

  const handleChangeCourseStatus = async (
    course: CourseRecord,
    status: ContentStatus
  ) => {
    try {
      await updateCourseStatus(course.id, status);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : tCur("toasts.updateCourseFailed"),
        "error"
      );
    }
  };

  const handleRequestDeleteCourse = async (course: CourseRecord) => {
    try {
      await deleteCourse(course.id, false);
    } catch (err) {
      if (err instanceof ApiError && err.requireConfirmation) {
        setConfirmCourseDelete({
          course,
          lessonCount: Number(err.data?.lessonCount ?? 0),
          itemCount: Number(err.data?.itemCount ?? 0),
        });
        return;
      }
      showToast(
        err instanceof Error ? err.message : tCur("toasts.deleteCourseFailed"),
        "error"
      );
    }
  };

  /* ───────────────────────── Thao tác Bài học ───────────────────────── */

  const openCreateLesson = (course: CourseRecord) => {
    setLessonDialogCourse(course);
    setEditingLesson(null);
    setLessonDialogOpen(true);
  };

  const openEditLesson = (lesson: LessonRecord, course: CourseRecord) => {
    setLessonDialogCourse(course);
    setEditingLesson(lesson);
    setLessonDialogOpen(true);
  };

  const handleChangeLessonSequential = async (
    lesson: LessonRecord,
    nextVal: boolean | null
  ) => {
    try {
      await saveLesson({
        id: lesson.id,
        courseId: lesson.courseId,
        title: lesson.title,
        requirePrevious: nextVal,
      });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : tCur("toasts.updateLessonFailed"),
        "error"
      );
    }
  };

  const handleToggleLessonPublished = async (lesson: LessonRecord) => {
    try {
      await saveLesson({
        id: lesson.id,
        courseId: lesson.courseId,
        title: lesson.title,
        isPublished: !lesson.isPublished,
      });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : tCur("toasts.updateLessonFailed"),
        "error"
      );
    }
  };

  const handleRequestDeleteLesson = async (lesson: LessonRecord) => {
    try {
      await deleteLesson(lesson.id, false);
    } catch (err) {
      if (err instanceof ApiError && err.requireConfirmation) {
        setConfirmLessonDelete({
          lesson,
          itemCount: Number(err.data?.itemCount ?? 0),
        });
        return;
      }
      showToast(
        err instanceof Error ? err.message : tCur("toasts.deleteLessonFailed"),
        "error"
      );
    }
  };

  /* ───────────────────────── Thao tác Chương / Bài tập ───────────────────────── */

  const openCreateItem = (lesson: LessonRecord, course: CourseRecord) => {
    setItemDialogLesson(lesson);
    setItemDialogCourseTitle(course.title);
    setItemDialogOpen(true);
  };

  const handleChangeItemSequential = async (
    item: ItemRecord,
    nextVal: boolean | null
  ) => {
    try {
      await saveItem({
        id: item.id,
        lessonId: item.lessonId,
        title: item.title,
        requirePrevious: nextVal,
      });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : tCur("toasts.updateItemFailed"),
        "error"
      );
    }
  };

  const handleChangeItemStatus = async (
    item: ItemRecord,
    status: ContentStatus
  ) => {
    try {
      await updateItemStatus(item.id, status);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : tCur("toasts.updateItemFailed"),
        "error"
      );
    }
  };

  const handleDuplicateItem = async (item: ItemRecord) => {
    try {
      await duplicateItem(item.id);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : tCur("toasts.duplicateItemFailed"),
        "error"
      );
    }
  };

  const openMoveItemDialog = (item: ItemRecord) => {
    setMovingItem(item);
    setMoveDialogOpen(true);
  };

  const handleMoveItemToLesson = async (
    item: ItemRecord,
    targetLessonId: string
  ) => {
    await saveItem({
      id: item.id,
      lessonId: targetLessonId,
      title: item.title,
    });
    const targetLesson = lessons.find((l) => l.id === targetLessonId);
    if (targetLesson) {
      setExpandedCourseIds((prev) => {
        const next = new Set(prev);
        next.add(targetLesson.courseId);
        return next;
      });
    }
    setExpandedLessonIds((prev) => {
      const next = new Set(prev);
      next.add(targetLessonId);
      return next;
    });
  };

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.orderIndex - b.orderIndex),
    [categories]
  );

  return (
    <AdminLayout breadcrumbs={[{ label: t("nav.curriculum") }]}>
      <div className="space-y-6">
        <PageHeader
          title={tCur("title")}
          description={tCur("description")}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCatManagerOpen(true)}
                className="cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Tag className="size-4 mr-1.5" />
                <span>
                  {tCur("categoriesButton", { count: categories.length })}
                </span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={openCreateCourse}
                className="cursor-pointer"
              >
                <Plus className="size-4 mr-1.5" />
                <span>{tCur("createCourseButton")}</span>
              </Button>
            </div>
          }
        />

        {/* Thanh lọc theo Danh mục & Điều khiển đóng/mở cây */}
        {manageableCourses.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter("ALL")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeCategoryFilter === "ALL"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tCur("allCoursesFilter")}</span>
                <span className="text-[10px] font-mono opacity-80 tabular-nums">
                  ({manageableCourses.length})
                </span>
              </button>

              {sortedCategories.map((cat) => {
                const active = activeCategoryFilter === cat.id;
                const count = manageableCourses.filter((c) =>
                  (c.categoryIds || []).includes(cat.id)
                ).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setActiveCategoryFilter(active ? "ALL" : cat.id)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>#{cat.name}</span>
                    <span className="text-[10px] font-mono opacity-80 tabular-nums">
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={expandAll}
                className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronsUpDown className="size-3.5 mr-1" />
                <span>{tCur("expandAll")}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={collapseAll}
                className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronsDownUp className="size-3.5 mr-1" />
                <span>{tCur("collapseAll")}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Trạng thái lỗi */}
        {dbError && (
          <div className="flex items-center gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{dbError}</span>
          </div>
        )}

        {/* Trạng thái đang tải */}
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center gap-2.5">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">
              {tCommon("actions.loading")}
            </p>
          </div>
        ) : visibleCourses.length === 0 ? (
          /* Trạng thái trống */
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-16 px-4 text-center">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              {activeCategoryFilter === "ALL" ? (
                <FolderTree className="size-5" />
              ) : (
                <BookOpen className="size-5" />
              )}
            </div>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              {activeCategoryFilter === "ALL"
                ? tCur("emptyAll")
                : tCur("emptyCategory")}
            </p>
            <Button
              type="button"
              size="sm"
              onClick={
                activeCategoryFilter === "ALL"
                  ? openCreateCourse
                  : () => setActiveCategoryFilter("ALL")
              }
              className="cursor-pointer"
            >
              {activeCategoryFilter === "ALL" ? (
                <>
                  <Plus className="size-4 mr-1.5" />
                  <span>{tCur("createFirstCourse")}</span>
                </>
              ) : (
                <span>{tCur("allCoursesFilter")}</span>
              )}
            </Button>
          </div>
        ) : (
          /* Cây Giáo trình: Course -> Lesson -> Item */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndCourses}
          >
            <SortableContext
              items={visibleCourses.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2.5">
                {visibleCourses.map((course, idx) => (
                  <SortableCourseCard
                    key={course.id}
                    course={course}
                    index={idx}
                    totalCount={visibleCourses.length}
                    lessons={lessonsByCourse.get(course.id) || []}
                    itemsByLesson={itemsByLesson}
                    categoryMap={categoryMap}
                    expanded={expandedCourseIds.has(course.id)}
                    expandedLessonIds={expandedLessonIds}
                    isAdmin={isAdmin}
                    onToggleExpand={() => toggleCourseExpand(course.id)}
                    onToggleLessonExpand={toggleLessonExpand}
                    onMoveUp={() => handleMoveCourseAt(idx, idx - 1)}
                    onMoveDown={() => handleMoveCourseAt(idx, idx + 1)}
                    onToggleCourseSequential={handleToggleCourseSequential}
                    onChangeCourseStatus={handleChangeCourseStatus}
                    onEditCourse={openEditCourse}
                    onDeleteCourse={handleRequestDeleteCourse}
                    onAddLesson={openCreateLesson}
                    onEditLesson={openEditLesson}
                    onDeleteLesson={handleRequestDeleteLesson}
                    onChangeLessonSequential={handleChangeLessonSequential}
                    onToggleLessonPublished={handleToggleLessonPublished}
                    onReorderLessons={handleReorderLessons}
                    onAddItem={openCreateItem}
                    onReorderItems={handleReorderItems}
                    onChangeItemSequential={handleChangeItemSequential}
                    onChangeItemStatus={handleChangeItemStatus}
                    onDuplicateItem={handleDuplicateItem}
                    onOpenMoveItem={openMoveItemDialog}
                    onDeleteItem={(item) => setDeleteTargetItem(item)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Dialog Quản lý danh mục phẳng */}
      <CategoryManager
        open={catManagerOpen}
        onOpenChange={setCatManagerOpen}
        categories={categories}
        courses={courses}
        isAdmin={isAdmin}
        onCreate={createCategory}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
        showToast={showToast}
      />

      {/* Dialog Tạo / Sửa Khóa học */}
      <CourseDialog
        open={courseDialogOpen}
        onOpenChange={setCourseDialogOpen}
        editingCourse={editingCourse}
        categories={sortedCategories}
        departments={departments}
        isAdmin={isAdmin}
        onSave={async (input) => {
          const saved = await saveCourse(input);
          if (!input.id) {
            setSessionCreatedCourseIds((prev) =>
              prev.includes(saved.id) ? prev : [...prev, saved.id]
            );
          }
          return saved;
        }}
        showToast={showToast}
      />

      {/* Dialog Tạo / Sửa Bài học */}
      <LessonDialog
        open={lessonDialogOpen}
        onOpenChange={setLessonDialogOpen}
        course={lessonDialogCourse}
        editingLesson={editingLesson}
        onSave={async (input) => {
          const saved = await saveLesson(input);
          setExpandedCourseIds((prev) => {
            const next = new Set(prev);
            next.add(saved.courseId);
            return next;
          });
          return saved;
        }}
        showToast={showToast}
      />

      {/* Dialog Tạo nhanh Chương / Bài tập */}
      <ItemQuickDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        lesson={itemDialogLesson}
        courseTitle={itemDialogCourseTitle}
        onSave={saveItem}
        showToast={showToast}
      />

      {/* Dialog Chuyển Chương / Bài tập sang Bài học khác */}
      <MoveItemDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        item={movingItem}
        courses={manageableCourses}
        lessons={lessons}
        onMove={handleMoveItemToLesson}
        showToast={showToast}
      />

      {/* ConfirmDialog Xóa Khóa học khi còn nội dung */}
      <ConfirmDialog
        open={Boolean(confirmCourseDelete)}
        onOpenChange={(open) => {
          if (!open) setConfirmCourseDelete(null);
        }}
        title={tCur("confirmDeleteCourse.title")}
        description={
          confirmCourseDelete
            ? tCur("confirmDeleteCourse.description", {
                title: confirmCourseDelete.course.title,
                lessons: confirmCourseDelete.lessonCount,
                items: confirmCourseDelete.itemCount,
              })
            : ""
        }
        confirmLabel={tCommon("actions.delete")}
        cancelLabel={tCommon("actions.cancel")}
        destructive
        onConfirm={async () => {
          if (!confirmCourseDelete) return;
          try {
            await deleteCourse(confirmCourseDelete.course.id, true);
          } catch (err) {
            showToast(
              err instanceof Error
                ? err.message
                : tCur("toasts.deleteCourseFailed"),
              "error"
            );
          } finally {
            setConfirmCourseDelete(null);
          }
        }}
      />

      {/* ConfirmDialog Xóa Bài học khi còn chương/bài tập */}
      <ConfirmDialog
        open={Boolean(confirmLessonDelete)}
        onOpenChange={(open) => {
          if (!open) setConfirmLessonDelete(null);
        }}
        title={tCur("confirmDeleteLesson.title")}
        description={
          confirmLessonDelete
            ? tCur("confirmDeleteLesson.description", {
                title: confirmLessonDelete.lesson.title,
                items: confirmLessonDelete.itemCount,
              })
            : ""
        }
        confirmLabel={tCommon("actions.delete")}
        cancelLabel={tCommon("actions.cancel")}
        destructive
        onConfirm={async () => {
          if (!confirmLessonDelete) return;
          try {
            await deleteLesson(confirmLessonDelete.lesson.id, true);
          } catch (err) {
            showToast(
              err instanceof Error
                ? err.message
                : tCur("toasts.deleteLessonFailed"),
              "error"
            );
          } finally {
            setConfirmLessonDelete(null);
          }
        }}
      />

      {/* ConfirmDialog Xóa Chương / Bài tập */}
      <ConfirmDialog
        open={Boolean(deleteTargetItem)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetItem(null);
        }}
        title={tCur("confirmDeleteItem.title")}
        description={
          deleteTargetItem
            ? tCur("confirmDeleteItem.description", {
                title: deleteTargetItem.title,
              })
            : ""
        }
        confirmLabel={tCommon("actions.delete")}
        cancelLabel={tCommon("actions.cancel")}
        destructive
        onConfirm={async () => {
          if (!deleteTargetItem) return;
          try {
            await deleteItem(deleteTargetItem.id);
          } catch (err) {
            showToast(
              err instanceof Error
                ? err.message
                : tCur("toasts.deleteItemFailed"),
              "error"
            );
          } finally {
            setDeleteTargetItem(null);
          }
        }}
      />
    </AdminLayout>
  );
}
