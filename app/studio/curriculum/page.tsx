"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
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
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ArticleRecord, CategoryRecord } from "@/types";
import {
  FileEdit,
  Folder,
  FolderPlus,
  GripVertical,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

interface SortableArticleRowProps {
  article: ArticleRecord;
  index: number;
  onToggleSequential: (article: ArticleRecord) => void;
}

function SortableArticleRow({
  article,
  index,
  onToggleSequential,
}: SortableArticleRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: article.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const quizCount = article.quizQuestions?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 transition-colors ${
        isDragging ? "opacity-60 ring-2 ring-primary z-10" : "hover:bg-muted/30"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-0.5"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>

        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-xs font-mono font-medium text-muted-foreground tabular-nums">
          {index + 1}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/studio/articles/${article.id}`}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate cursor-pointer"
            >
              {article.title}
            </Link>
            {!article.isPublished && (
              <Badge
                variant="outline"
                className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400"
              >
                Draft
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">
            /docs/{article.slug}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {quizCount > 0 && article.passScorePercent > 0 && (
          <Badge variant="secondary" className="font-mono text-xs hidden sm:inline-flex">
            Quiz ≥{article.passScorePercent}%
          </Badge>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={article.requirePrevious ? "secondary" : "ghost"}
              size="xs"
              onClick={() => onToggleSequential(article)}
              className={`gap-1 text-xs cursor-pointer ${
                article.requirePrevious
                  ? "text-primary bg-primary/10 hover:bg-primary/15"
                  : "text-muted-foreground"
              }`}
            >
              {article.requirePrevious ? (
                <>
                  <Lock className="size-3.5" />
                  <span className="hidden md:inline">Sequential</span>
                </>
              ) : (
                <>
                  <LockOpen className="size-3.5" />
                  <span className="hidden md:inline">Unlocked</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {article.requirePrevious
              ? "Sequential lock enabled: requires completing prior lesson. Click to unlock."
              : "Unlocked: members can read anytime. Click to enable sequential lock."}
          </TooltipContent>
        </Tooltip>

        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <Link href={`/studio/articles/${article.id}`} title="Edit article">
            <FileEdit className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function StudioCurriculumPage() {
  const {
    categories,
    articles,
    createCategory,
    updateCategory,
    deleteCategory,
    batchUpdateCurriculum,
    showToast,
  } = useHandbook();

  // Dialog state for creating or editing a category / subcategory
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(
    null
  );
  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [catParentId, setCatParentId] = useState<string>("ROOT");
  const [submitting, setSubmitting] = useState(false);

  // Delete category confirm state
  const [deleteTargetCat, setDeleteTargetCat] = useState<CategoryRecord | null>(
    null
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const rootCategories = useMemo(
    () =>
      categories
        .filter((c) => c.depth === 1 || !c.parentId)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [categories]
  );

  const getSubcategories = (parentId: string) =>
    categories
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

  const getCategoryArticles = (categoryId: string) =>
    articles
      .filter((a) => a.categoryId === categoryId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

  const openCreateDialog = (parentId?: string) => {
    setEditingCategory(null);
    setCatName("");
    setCatDescription("");
    setCatParentId(parentId || "ROOT");
    setDialogOpen(true);
  };

  const openEditDialog = (cat: CategoryRecord) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDescription(cat.description || "");
    setCatParentId(cat.parentId || "ROOT");
    setDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      showToast("Please enter a category name.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const parentIdVal = catParentId === "ROOT" ? "" : catParentId;
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: catName.trim(),
          description: catDescription.trim(),
          parentId: parentIdVal,
        });
      } else {
        await createCategory({
          name: catName.trim(),
          description: catDescription.trim(),
          parentId: parentIdVal || null,
        });
      }
      setDialogOpen(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save category.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSequential = async (article: ArticleRecord) => {
    await batchUpdateCurriculum([
      {
        id: article.id,
        categoryId: article.categoryId,
        orderIndex: article.orderIndex,
        requirePrevious: !article.requirePrevious,
      },
    ]);
  };

  const handleDragEndForCategory = async (
    categoryId: string,
    event: DragEndEvent
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const list = getCategoryArticles(categoryId);
    const oldIndex = list.findIndex((a) => a.id === active.id);
    const newIndex = list.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(list, oldIndex, newIndex);
    const updates = reordered.map((art, idx) => ({
      id: art.id,
      categoryId,
      orderIndex: idx + 1,
    }));

    await batchUpdateCurriculum(updates);
  };

  return (
    <AdminLayout breadcrumbs={[{ label: "Curriculum" }]}>
      <div className="space-y-6">
        <PageHeader
          title="Curriculum & Roadmap Organization"
          description="Create and organize categories (up to 2 tiers), order curriculum trees, and reorder lesson sequences."
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openCreateDialog()}
                className="cursor-pointer"
              >
                <FolderPlus className="size-4 mr-1.5" />
                <span>Add Category</span>
              </Button>
              <Button asChild size="sm" className="cursor-pointer">
                <Link href="/studio/articles/new">
                  <Plus className="size-4 mr-1.5" />
                  <span>New Article</span>
                </Link>
              </Button>
            </div>
          }
        />

        {/* Curriculum Tree */}
        <div className="space-y-5">
          {rootCategories.map((rootCat) => {
            const subCats = getSubcategories(rootCat.id);
            const directArticles = getCategoryArticles(rootCat.id);

            return (
              <div
                key={rootCat.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Root Category Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Folder className="size-4 text-primary shrink-0" />
                      <h2 className="text-base font-semibold text-foreground truncate">
                        {rootCat.name}
                      </h2>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {directArticles.length +
                          subCats.reduce(
                            (acc, sc) =>
                              acc + getCategoryArticles(sc.id).length,
                            0
                          )}{" "}
                        lessons
                      </Badge>
                    </div>
                    {rootCat.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rootCat.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => openCreateDialog(rootCat.id)}
                      className="cursor-pointer"
                    >
                      <FolderPlus className="size-3.5 mr-1" />
                      <span>Add Subcategory</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(rootCat)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Edit category"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTargetCat(rootCat)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                      title="Delete category"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Direct Articles under Root Category */}
                  {directArticles.length > 0 && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEndForCategory(rootCat.id, e)}
                    >
                      <SortableContext
                        items={directArticles.map((a) => a.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {directArticles.map((art, idx) => (
                            <SortableArticleRow
                              key={art.id}
                              article={art}
                              index={idx}
                              onToggleSequential={handleToggleSequential}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {/* Subcategories (Child tier groups) */}
                  {subCats.map((subCat) => {
                    const subArticles = getCategoryArticles(subCat.id);
                    return (
                      <div
                        key={subCat.id}
                        className="rounded-lg border border-border bg-muted/15 p-3.5 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-foreground truncate">
                                {subCat.name}
                              </h3>
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {subArticles.length} lessons
                              </Badge>
                            </div>
                            {subCat.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {subCat.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditDialog(subCat)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Edit subcategory"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteTargetCat(subCat)}
                              className="text-muted-foreground hover:text-destructive cursor-pointer"
                              title="Delete subcategory"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        {subArticles.length > 0 ? (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) =>
                              handleDragEndForCategory(subCat.id, e)
                            }
                          >
                            <SortableContext
                              items={subArticles.map((a) => a.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-2">
                                {subArticles.map((art, idx) => (
                                  <SortableArticleRow
                                    key={art.id}
                                    article={art}
                                    index={idx}
                                    onToggleSequential={handleToggleSequential}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        ) : (
                          <p className="text-xs text-muted-foreground py-2">
                            No lessons in this subcategory yet.
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {directArticles.length === 0 && subCats.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">
                      No lessons or subcategories under this category yet.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create / Edit Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingCategory
                ? "Edit Category"
                : catParentId !== "ROOT"
                ? "Add Subcategory"
                : "Create New Category"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Clear categorization helps members follow the structured learning roadmap.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Parent Category</Label>
              <Select value={catParentId} onValueChange={setCatParentId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select parent level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROOT">
                    Tier 1 Root Category (Top-level)
                  </SelectItem>
                  {rootCategories
                    .filter((rc) => rc.id !== editingCategory?.id)
                    .map((rc) => (
                      <SelectItem key={rc.id} value={rc.id}>
                        Subcategory under: {rc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category Name</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Technical Department or Event Operations"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Input
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                placeholder="Brief description of curriculum focus..."
                className="h-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={handleSaveCategory}
              className="cursor-pointer"
            >
              {editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTargetCat)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetCat(null);
        }}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteTargetCat?.name}"? Categories can only be deleted when empty.`}
        confirmLabel="Delete Category"
        destructive
        onConfirm={async () => {
          if (!deleteTargetCat) return;
          try {
            await deleteCategory(deleteTargetCat.id);
          } catch (err) {
            showToast(
              err instanceof Error ? err.message : "Failed to delete category.",
              "error"
            );
          } finally {
            setDeleteTargetCat(null);
          }
        }}
      />
    </AdminLayout>
  );
}

