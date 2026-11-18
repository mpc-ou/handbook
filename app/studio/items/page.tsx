"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, SortableHeader } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { canUserManageCourse } from "@/lib/progression";
import { hasQuiz } from "@/lib/quiz-rules";
import { slugify } from "@/lib/seed-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  ContentStatus,
  CourseRecord,
  ItemRecord,
  ItemType,
  LessonRecord,
} from "@/types";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  ExternalLink,
  EyeOff,
  FileEdit,
  FileText,
  FolderTree,
  HelpCircle,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Trash2,
} from "lucide-react";

const ITEM_TYPE_ICONS: Record<
  ItemType,
  React.ComponentType<{ className?: string }>
> = {
  CONTENT: FileText,
  QUIZ: HelpCircle,
  ASSIGNMENT: ClipboardList,
};

export default function StudioItemsPage() {
  const router = useRouter();
  const t = useTranslations("studioItems.list");
  const tEditor = useTranslations("studioItems.editor");
  const tc = useTranslations("common");

  const {
    user,
    courses,
    lessons,
    items,
    dataLoading,
    saveItem,
    deleteItem,
    duplicateItem,
    updateItemStatus,
    bulkUpdateItems,
    showToast,
  } = useHandbook();

  // Bộ lọc gọn một dòng
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [lessonFilter, setLessonFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Hộp thoại tạo mới chương / bài tập
  const [createOpen, setCreateOpen] = useState(false);
  const [newCourseId, setNewCourseId] = useState<string>("");
  const [newLessonId, setNewLessonId] = useState<string>("");
  const [newType, setNewType] = useState<ItemType>("CONTENT");
  const [newTitle, setNewTitle] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // Hộp thoại xác nhận xóa
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string>("");
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState<
    (() => void) | null
  >(null);

  const lessonMap = useMemo(() => {
    const map = new Map<string, LessonRecord>();
    for (const l of lessons) {
      map.set(l.id, l);
    }
    return map;
  }, [lessons]);

  const courseMap = useMemo(() => {
    const map = new Map<string, CourseRecord>();
    for (const c of courses) {
      map.set(c.id, c);
    }
    return map;
  }, [courses]);

  const manageableCourses = useMemo(() => {
    return courses
      .filter((c) => canUserManageCourse(user, c.id))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [courses, user]);

  const manageableCourseIds = useMemo(
    () => new Set(manageableCourses.map((c) => c.id)),
    [manageableCourses]
  );

  const filterableLessons = useMemo(() => {
    if (courseFilter === "ALL") {
      return lessons
        .filter((l) => manageableCourseIds.has(l.courseId))
        .sort((a, b) => a.orderIndex - b.orderIndex);
    }
    return lessons
      .filter((l) => l.courseId === courseFilter)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [lessons, courseFilter, manageableCourseIds]);

  useEffect(() => {
    if (lessonFilter !== "ALL") {
      const lesson = lessonMap.get(lessonFilter);
      if (
        !lesson ||
        (courseFilter !== "ALL" && lesson.courseId !== courseFilter)
      ) {
        setLessonFilter("ALL");
      }
    }
  }, [courseFilter, lessonFilter, lessonMap]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const lesson = lessonMap.get(item.lessonId);
      if (!lesson) return user?.role === "ADMIN";
      return manageableCourseIds.has(lesson.courseId);
    });
  }, [items, lessonMap, manageableCourseIds, user]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return visibleItems.filter((item) => {
      const lesson = lessonMap.get(item.lessonId);
      const course = lesson ? courseMap.get(lesson.courseId) : undefined;

      if (courseFilter !== "ALL" && course?.id !== courseFilter) {
        return false;
      }
      if (lessonFilter !== "ALL" && item.lessonId !== lessonFilter) {
        return false;
      }
      if (typeFilter !== "ALL" && item.type !== typeFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      if (q) {
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSlug = item.slug.toLowerCase().includes(q);
        return matchTitle || matchSlug;
      }
      return true;
    });
  }, [
    visibleItems,
    lessonMap,
    courseMap,
    courseFilter,
    lessonFilter,
    typeFilter,
    statusFilter,
    searchQuery,
  ]);

  const lessonsForNewCourse = useMemo(() => {
    if (!newCourseId) return [];
    return lessons
      .filter((l) => l.courseId === newCourseId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [lessons, newCourseId]);

  const openCreateModal = () => {
    const defaultCourseId =
      courseFilter !== "ALL" && manageableCourseIds.has(courseFilter)
        ? courseFilter
        : manageableCourses[0]?.id || "";
    setNewCourseId(defaultCourseId);

    const courseLessons = lessons
      .filter((l) => l.courseId === defaultCourseId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const defaultLessonId =
      lessonFilter !== "ALL" &&
      courseLessons.some((l) => l.id === lessonFilter)
        ? lessonFilter
        : courseLessons[0]?.id || "";
    setNewLessonId(defaultLessonId);
    setNewType("CONTENT");
    setNewTitle("");
    setCreateOpen(true);
  };

  const handleCreateCourseChange = (courseId: string) => {
    setNewCourseId(courseId);
    const firstLesson = lessons
      .filter((l) => l.courseId === courseId)
      .sort((a, b) => a.orderIndex - b.orderIndex)[0];
    setNewLessonId(firstLesson?.id || "");
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonId) {
      showToast(t("toast.lessonRequired"), "error");
      return;
    }
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      showToast(t("toast.titleRequired"), "error");
      return;
    }

    setCreating(true);
    try {
      const siblingItems = items.filter((i) => i.lessonId === newLessonId);
      const nextOrderIndex =
        siblingItems.length > 0
          ? Math.max(...siblingItems.map((i) => i.orderIndex)) + 1
          : 0;

      const isQuizOrAssignment = hasQuiz(newType);

      const created = await saveItem({
        lessonId: newLessonId,
        type: newType,
        title: trimmedTitle,
        slug: slugify(trimmedTitle),
        summary: "",
        status: "DRAFT",
        orderIndex: nextOrderIndex,
        isRequired: true,
        requirePrevious: null,
        requireScrollToBottom: newType === "CONTENT",
        ...(isQuizOrAssignment
          ? { passScorePercent: 80, quizQuestions: [] }
          : {}),
        content:
          newType === "CONTENT"
            ? [
                {
                  id: `blk_${Date.now()}_1`,
                  type: "heading_2",
                  content: tEditor("canvas.defaultHeading"),
                },
                {
                  id: `blk_${Date.now()}_2`,
                  type: "paragraph",
                  content: tEditor("canvas.defaultParagraph"),
                },
              ]
            : [],
        attachments: [],
      });

      setCreateOpen(false);
      router.push(`/studio/items/${created.id}`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("toast.createFailed"),
        "error"
      );
    } finally {
      setCreating(false);
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    courseFilter !== "ALL" ||
    lessonFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    statusFilter !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setCourseFilter("ALL");
    setLessonFilter("ALL");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
  };

  const getReaderHref = (item: ItemRecord): string | null => {
    const lesson = lessonMap.get(item.lessonId);
    const course = lesson ? courseMap.get(lesson.courseId) : undefined;
    if (!course || !lesson) return null;
    return `/learn/${course.slug}/${lesson.slug}/${item.slug}`;
  };

  const renderItemActions = (item: ItemRecord) => {
    const readerHref = getReaderHref(item);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="cursor-pointer"
            aria-label={t("columns.actionsAria")}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 text-xs">
          <DropdownMenuItem asChild>
            <Link
              href={`/studio/items/${item.id}`}
              className="cursor-pointer"
            >
              <FileEdit className="size-3.5 mr-2" />
              <span>{t("actions.editItem")}</span>
            </Link>
          </DropdownMenuItem>

          {readerHref && (
            <>
              <DropdownMenuItem asChild>
                <Link
                  href={readerHref}
                  target="_blank"
                  className="cursor-pointer"
                >
                  <ExternalLink className="size-3.5 mr-2" />
                  <span>{t("actions.viewReader")}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const url = `${window.location.origin}${readerHref}`;
                  navigator.clipboard.writeText(url);
                  showToast(t("toast.linkCopied", { path: readerHref }), "success");
                }}
                className="cursor-pointer"
              >
                <Share2 className="size-3.5 mr-2" />
                <span>{t("actions.copyLink")}</span>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuItem
            onClick={async () => {
              try {
                await duplicateItem(item.id);
              } catch (err) {
                showToast(
                  err instanceof Error
                    ? err.message
                    : t("toast.duplicateFailed"),
                  "error"
                );
              }
            }}
            className="cursor-pointer"
          >
            <Copy className="size-3.5 mr-2" />
            <span>{t("actions.duplicate")}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {user?.role === "ADMIN" && item.status !== "PUBLISHED" && (
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await updateItemStatus(item.id, "PUBLISHED");
                } catch (err) {
                  showToast(
                    err instanceof Error
                      ? err.message
                      : t("toast.publishFailed"),
                    "error"
                  );
                }
              }}
              className="text-emerald-600 dark:text-emerald-400 font-medium cursor-pointer"
            >
              <CheckCircle2 className="size-3.5 mr-2" />
              <span>{t("actions.publish")}</span>
            </DropdownMenuItem>
          )}

          {item.status !== "PENDING_REVIEW" && (
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await updateItemStatus(item.id, "PENDING_REVIEW");
                } catch (err) {
                  showToast(
                    err instanceof Error
                      ? err.message
                      : t("toast.submitReviewFailed"),
                    "error"
                  );
                }
              }}
              className="cursor-pointer"
            >
              <Clock className="size-3.5 mr-2" />
              <span>{t("actions.submitReview")}</span>
            </DropdownMenuItem>
          )}

          {item.status !== "DRAFT" && (
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await updateItemStatus(item.id, "DRAFT");
                } catch (err) {
                  showToast(
                    err instanceof Error
                      ? err.message
                      : t("toast.draftFailed"),
                    "error"
                  );
                }
              }}
              className="cursor-pointer"
            >
              <RotateCcw className="size-3.5 mr-2" />
              <span>{t("actions.moveToDraft")}</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              setDeleteTargetIds([item.id]);
              setDeleteTargetLabel(`"${item.title}"`);
            }}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <Trash2 className="size-3.5 mr-2" />
            <span>{tc("actions.delete")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const columns = useMemo<ColumnDef<ItemRecord, unknown>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(val) =>
              table.toggleAllPageRowsSelected(Boolean(val))
            }
            aria-label={t("columns.selectAll")}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(Boolean(val))}
            aria-label={t("columns.selectRow")}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <SortableHeader column={column} label={t("columns.title")} />
        ),
        cell: ({ row }) => {
          const item = row.original;
          const TypeIcon = ITEM_TYPE_ICONS[item.type] || FileText;
          const typeLabel = tc(`itemType.${item.type}`);

          return (
            <div className="flex items-center gap-2.5 min-w-0 max-w-md py-0.5">
              <span
                className="text-muted-foreground shrink-0"
                title={typeLabel}
                aria-label={typeLabel}
              >
                <TypeIcon className="size-4" />
              </span>
              <Link
                href={`/studio/items/${item.id}`}
                className="font-medium text-foreground hover:text-primary transition-colors truncate text-sm"
              >
                {item.title}
              </Link>
              {!item.isRequired && (
                <span className="text-[11px] text-muted-foreground shrink-0">
                  ({t("columns.optionalBadge")})
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "lessonId",
        header: ({ column }) => (
          <SortableHeader column={column} label={t("columns.courseLesson")} />
        ),
        cell: ({ row }) => {
          const lesson = lessonMap.get(row.original.lessonId);
          const course = lesson ? courseMap.get(lesson.courseId) : undefined;

          if (!lesson || !course) {
            return (
              <span className="text-xs text-muted-foreground">
                {t("columns.unassignedLesson")}
              </span>
            );
          }

          return (
            <span className="text-xs text-muted-foreground truncate block max-w-[280px]">
              {course.title} › {lesson.title}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <SortableHeader column={column} label={t("columns.status")} />
        ),
        cell: ({ row }) => {
          const st: ContentStatus = row.original.status;
          // Chỉ hiện nhãn trạng thái khi khác "Đã xuất bản"
          if (st === "PUBLISHED") {
            return null;
          }
          return (
            <Badge
              variant={st === "PENDING_REVIEW" ? "secondary" : "outline"}
              className="text-[11px] font-normal"
            >
              {tc(`status.${st}`)}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            {renderItemActions(row.original)}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lessonMap, courseMap, user, duplicateItem, updateItemStatus, showToast, t, tc]
  );

  return (
    <AdminLayout breadcrumbs={[{ label: t("breadcrumb") }]}>
      <div className="space-y-5">
        <PageHeader
          title={t("title")}
          description={t("description")}
          actions={
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="cursor-pointer text-xs"
              >
                <Link href="/studio/curriculum">
                  <FolderTree className="size-3.5 mr-1.5" />
                  <span>{t("curriculumLink")}</span>
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={openCreateModal}
                className="cursor-pointer text-xs"
              >
                <Plus className="size-3.5 mr-1.5" />
                <span>{tc("actions.create")}</span>
              </Button>
            </div>
          }
        />

        <DataTable
          columns={columns}
          data={filteredItems}
          loading={dataLoading}
          pageSize={20}
          getRowId={(row) => row.id}
          emptyTitle={t("empty.title")}
          emptyDescription={
            hasActiveFilters
              ? t("empty.filteredDescription")
              : t("empty.defaultDescription")
          }
          emptyAction={
            hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="cursor-pointer text-xs"
              >
                <RotateCcw className="size-3.5 mr-1.5" />
                <span>{t("empty.resetFilters")}</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={openCreateModal}
                className="cursor-pointer text-xs"
              >
                <Plus className="size-3.5 mr-1.5" />
                <span>{tc("actions.create")}</span>
              </Button>
            )
          }
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <Select
                value={courseFilter}
                onValueChange={(val) => {
                  setCourseFilter(val);
                  setLessonFilter("ALL");
                }}
              >
                <SelectTrigger className="h-8 w-[160px] text-xs cursor-pointer">
                  <SelectValue placeholder={t("filters.coursePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("filters.allCourses")}</SelectItem>
                  {manageableCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={lessonFilter}
                onValueChange={setLessonFilter}
                disabled={filterableLessons.length === 0}
              >
                <SelectTrigger className="h-8 w-[160px] text-xs cursor-pointer">
                  <SelectValue placeholder={t("filters.lessonPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {courseFilter === "ALL"
                      ? t("filters.allLessons")
                      : t("filters.allLessonsInCourse")}
                  </SelectItem>
                  {filterableLessons.map((l) => {
                    const parentCourse = courseMap.get(l.courseId);
                    return (
                      <SelectItem key={l.id} value={l.id}>
                        {courseFilter === "ALL" && parentCourse
                          ? `${parentCourse.title} › ${l.title}`
                          : l.title}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs cursor-pointer">
                  <SelectValue placeholder={t("filters.typePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("filters.allTypes")}</SelectItem>
                  <SelectItem value="CONTENT">
                    {tc("itemType.CONTENT")}
                  </SelectItem>
                  <SelectItem value="QUIZ">{tc("itemType.QUIZ")}</SelectItem>
                  <SelectItem value="ASSIGNMENT">
                    {tc("itemType.ASSIGNMENT")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[135px] text-xs cursor-pointer">
                  <SelectValue placeholder={t("filters.statusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("filters.allStatuses")}</SelectItem>
                  <SelectItem value="PUBLISHED">
                    {tc("status.PUBLISHED")}
                  </SelectItem>
                  <SelectItem value="PENDING_REVIEW">
                    {tc("status.PENDING_REVIEW")}
                  </SelectItem>
                  <SelectItem value="DRAFT">{tc("status.DRAFT")}</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <RotateCcw className="size-3.5 mr-1" />
                  <span>{t("filters.reset")}</span>
                </Button>
              )}
            </div>
          }
          bulkActions={(selected, clear) => (
            <div className="flex items-center gap-2">
              {user?.role === "ADMIN" && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={async () => {
                    await bulkUpdateItems(
                      selected.map((r) => r.id),
                      "publish"
                    );
                    clear();
                  }}
                  className="cursor-pointer text-xs"
                >
                  <CheckCircle2 className="size-3.5 mr-1 text-emerald-500" />
                  <span>
                    {t("bulk.publishCount", { count: selected.length })}
                  </span>
                </Button>
              )}
              <Button
                size="xs"
                variant="outline"
                onClick={async () => {
                  await bulkUpdateItems(
                    selected.map((r) => r.id),
                    "unpublish"
                  );
                  clear();
                }}
                className="cursor-pointer text-xs"
              >
                <EyeOff className="size-3.5 mr-1" />
                <span>{t("bulk.draftCount", { count: selected.length })}</span>
              </Button>
              <Button
                size="xs"
                variant="destructive"
                onClick={() => {
                  setDeleteTargetIds(selected.map((r) => r.id));
                  setDeleteTargetLabel(
                    t("bulk.selectedCountLabel", { count: selected.length })
                  );
                  setClearSelectionTrigger(() => clear);
                }}
                className="cursor-pointer text-xs"
              >
                <Trash2 className="size-3.5 mr-1" />
                <span>{t("bulk.deleteCount", { count: selected.length })}</span>
              </Button>
            </div>
          )}
        />
      </div>

      {/* Hộp thoại tạo mới chương / bài tập */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateItem} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("createDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("createDialog.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {t("createDialog.courseLabel")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={newCourseId}
                  onValueChange={handleCreateCourseChange}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue
                      placeholder={t("createDialog.coursePlaceholder")}
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

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {t("createDialog.lessonLabel")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                {lessonsForNewCourse.length > 0 ? (
                  <Select value={newLessonId} onValueChange={setNewLessonId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue
                        placeholder={t("createDialog.lessonPlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {lessonsForNewCourse.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
                    <p>{t("createDialog.noLessonsHint")}</p>
                    <Button
                      asChild
                      type="button"
                      variant="outline"
                      size="xs"
                      className="cursor-pointer"
                    >
                      <Link href="/studio/curriculum">
                        <FolderTree className="size-3.5 mr-1.5" />
                        <span>{t("createDialog.openCurriculum")}</span>
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {t("createDialog.typeLabel")}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["CONTENT", "QUIZ", "ASSIGNMENT"] as ItemType[]).map(
                    (typeOpt) => {
                      const Icon = ITEM_TYPE_ICONS[typeOpt];
                      const active = newType === typeOpt;
                      return (
                        <button
                          key={typeOpt}
                          type="button"
                          onClick={() => setNewType(typeOpt)}
                          className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2.5 text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? "border-primary bg-primary/10 text-primary font-semibold"
                              : "border-border hover:bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <Icon className="size-4" />
                          <span>{tc(`itemType.${typeOpt}`)}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {t("createDialog.titleLabel")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t("createDialog.titlePlaceholder")}
                  className="h-9 text-sm"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
                className="cursor-pointer"
              >
                {tc("actions.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creating || !newLessonId || !newTitle.trim()}
                className="cursor-pointer"
              >
                {creating
                  ? t("createDialog.creating")
                  : t("createDialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTargetIds.length > 0}
        onOpenChange={(open) => !open && setDeleteTargetIds([])}
        title={t("deleteDialog.title")}
        description={t("deleteDialog.description", {
          target: deleteTargetLabel,
        })}
        confirmLabel={t("deleteDialog.confirm")}
        cancelLabel={tc("actions.cancel")}
        variant="destructive"
        onConfirm={async () => {
          try {
            if (deleteTargetIds.length === 1) {
              await deleteItem(deleteTargetIds[0]);
            } else if (deleteTargetIds.length > 1) {
              await bulkUpdateItems(deleteTargetIds, "delete");
            }
            if (clearSelectionTrigger) {
              clearSelectionTrigger();
              setClearSelectionTrigger(null);
            }
          } catch (err) {
            showToast(
              err instanceof Error ? err.message : t("toast.deleteFailed"),
              "error"
            );
          } finally {
            setDeleteTargetIds([]);
          }
        }}
      />
    </AdminLayout>
  );
}
