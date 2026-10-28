"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { useHandbook } from "@/context/HandbookContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, SortableHeader } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { formatDate } from "@/lib/date";
import { ArticleCover } from "@/components/ui/ArticleCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import type { ArticleRecord, CategoryRecord } from "@/types";
import { slugify } from "@/lib/seed-data";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileEdit,
  FileText,
  Folder,
  FolderPlus,
  FolderTree,
  Globe,
  Heart,
  Link2,
  List,
  Lock,
  MoreHorizontal,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
} from "lucide-react";

export default function StudioArticlesPage() {
  const router = useRouter();
  const {
    articles,
    categories,
    dataLoading,
    deleteArticle,
    duplicateArticle,
    updateArticleStatus,
    bulkUpdateArticles,
    createCategory,
    updateCategory,
    deleteCategoryWithOption,
    showToast,
  } = useHandbook();

  // View state: "tree" (Category tree view) or "table" (All articles table)
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");

  // Selected Category ID in Tree View ("ALL" for all articles)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Record<string, boolean>>({
    cat_rules: true,
    cat_events: true,
    cat_skills: true,
  });

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination for Tree / List View
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Category Modal State (Create / Edit)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<"create" | "edit">("create");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryFormName, setCategoryFormName] = useState("");
  const [categoryFormSlug, setCategoryFormSlug] = useState("");
  const [categoryFormDescription, setCategoryFormDescription] = useState("");
  const [categoryFormParentId, setCategoryFormParentId] = useState<string>("");
  const [categoryModalLoading, setCategoryModalLoading] = useState(false);

  // Safe Category Deletion Modal State
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<CategoryRecord | null>(null);
  const [deleteCategoryAction, setDeleteCategoryAction] = useState<"reassign" | "cascade">("reassign");
  const [deleteCategoryReassignId, setDeleteCategoryReassignId] = useState<string>("");
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);

  // Single / Bulk Article Deletion State
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string>("");
  const [clearSelectionTrigger, setClearSelectionTrigger] = useState<(() => void) | null>(null);

  // Category map for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categories]);

  // Root and subcategories lists
  const rootCategories = useMemo(() => {
    return categories
      .filter((c) => c.depth === 1 || !c.parentId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [categories]);

  // Subcategories mapping
  const subCategoriesByParent = useMemo(() => {
    const map = new Map<string, CategoryRecord[]>();
    for (const cat of categories) {
      if (cat.parentId) {
        const list = map.get(cat.parentId) || [];
        list.push(cat);
        map.set(cat.parentId, list.sort((a, b) => a.orderIndex - b.orderIndex));
      }
    }
    return map;
  }, [categories]);

  // Count articles per category branch
  const articleCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const art of articles) {
      const cur = map.get(art.categoryId) || 0;
      map.set(art.categoryId, cur + 1);
    }
    return map;
  }, [articles]);

  const totalArticleCountForBranch = (catId: string): number => {
    let count = articleCountByCategory.get(catId) || 0;
    const subs = subCategoriesByParent.get(catId) || [];
    for (const sub of subs) {
      count += articleCountByCategory.get(sub.id) || 0;
    }
    return count;
  };

  // Toggle tree node expansion
  const toggleExpand = (catId: string) => {
    setExpandedCategoryIds((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Filtered Articles based on selected category in tree (or filter) and search/status
  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return articles.filter((art) => {
      // Tree view category filter
      if (viewMode === "tree" && selectedCategoryId !== "ALL") {
        const selectedCat = categories.find((c) => c.id === selectedCategoryId);
        if (selectedCat?.depth === 1) {
          // If a root category is selected, include articles in this root AND its subcategories
          const subIds = (subCategoriesByParent.get(selectedCategoryId) || []).map((c) => c.id);
          const allowedIds = [selectedCategoryId, ...subIds];
          if (!allowedIds.includes(art.categoryId)) return false;
        } else {
          // Subcategory selected: only exact match
          if (art.categoryId !== selectedCategoryId) return false;
        }
      }

      const artStatus = art.status || (art.isPublished ? "PUBLISHED" : "DRAFT");
      if (statusFilter === "PUBLISHED" && artStatus !== "PUBLISHED") return false;
      if (statusFilter === "PENDING_REVIEW" && artStatus !== "PENDING_REVIEW") return false;
      if (statusFilter === "DRAFT" && artStatus !== "DRAFT") return false;

      if (q) {
        const matchTitle = art.title.toLowerCase().includes(q);
        const matchSlug = art.slug.toLowerCase().includes(q);
        return matchTitle || matchSlug;
      }
      return true;
    });
  }, [articles, viewMode, selectedCategoryId, categories, subCategoriesByParent, statusFilter, searchQuery]);

  // Pagination for Tree / List View
  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredArticles.slice(start, start + pageSize);
  }, [filteredArticles, currentPage, pageSize]);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryId, statusFilter, searchQuery, pageSize]);

  // Open modal to create root or sub category
  const openCreateCategoryModal = (parentId: string = "") => {
    setCategoryModalMode("create");
    setEditingCategoryId(null);
    setCategoryFormName("");
    setCategoryFormSlug("");
    setCategoryFormDescription("");
    setCategoryFormParentId(parentId);
    setCategoryModalOpen(true);
  };

  // Open modal to edit existing category
  const openEditCategoryModal = (cat: CategoryRecord) => {
    setCategoryModalMode("edit");
    setEditingCategoryId(cat.id);
    setCategoryFormName(cat.name);
    setCategoryFormSlug(cat.slug);
    setCategoryFormDescription(cat.description || "");
    setCategoryFormParentId(cat.parentId || "");
    setCategoryModalOpen(true);
  };

  // Handle Save Category (Create or Edit)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormName.trim()) {
      showToast("Please enter a category name.", "error");
      return;
    }

    setCategoryModalLoading(true);
    try {
      const finalSlug = categoryFormSlug.trim() || slugify(categoryFormName);
      if (categoryModalMode === "create") {
        await createCategory({
          name: categoryFormName.trim(),
          slug: finalSlug,
          description: categoryFormDescription.trim(),
          parentId: categoryFormParentId || undefined,
        });
      } else if (editingCategoryId) {
        await updateCategory(editingCategoryId, {
          name: categoryFormName.trim(),
          slug: finalSlug,
          description: categoryFormDescription.trim(),
          parentId: categoryFormParentId || undefined,
        });
      }
      setCategoryModalOpen(false);
    } catch (err: any) {
      showToast(err.message || "Failed to save category.", "error");
    } finally {
      setCategoryModalLoading(false);
    }
  };

  // Open Safe Delete Category Dialog
  const openDeleteCategoryDialog = (cat: CategoryRecord) => {
    setDeleteCategoryTarget(cat);
    setDeleteCategoryAction("reassign");
    const fallback = categories.find((c) => c.id !== cat.id && c.parentId !== cat.id);
    setDeleteCategoryReassignId(fallback ? fallback.id : "");
  };

  // Execute Safe Delete Category
  const handleConfirmDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;

    setDeleteCategoryLoading(true);
    try {
      await deleteCategoryWithOption(
        deleteCategoryTarget.id,
        deleteCategoryAction,
        deleteCategoryAction === "reassign" ? deleteCategoryReassignId : undefined
      );
      if (selectedCategoryId === deleteCategoryTarget.id) {
        setSelectedCategoryId("ALL");
      }
      setDeleteCategoryTarget(null);
    } catch (err: any) {
      showToast(err.message || "Failed to delete category.", "error");
    } finally {
      setDeleteCategoryLoading(false);
    }
  };

  // Table Columns for Flat Table View
  const columns = useMemo<ColumnDef<ArticleRecord, unknown>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(Boolean(val))}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(Boolean(val))}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => <SortableHeader column={column} label="Article" />,
        cell: ({ row }) => {
          const art = row.original;
          return (
            <div className="flex items-center gap-3 max-w-md py-1">
              <div className="size-11 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                <ArticleCover
                  src={art.coverImage}
                  title={art.title}
                  className="size-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/studio/articles/${art.id}`}
                  className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2 text-sm leading-snug"
                >
                  {art.title}
                </Link>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="font-mono text-[11px] truncate">/docs/{art.slug}</span>
                  <span>•</span>
                  <span>~{art.readingTime}m read</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "categoryId",
        header: ({ column }) => <SortableHeader column={column} label="Category" />,
        cell: ({ row }) => {
          const catName = categoryMap.get(row.original.categoryId) || "Uncategorized";
          return (
            <Badge variant="outline" className="font-normal text-xs max-w-[200px] truncate">
              {catName}
            </Badge>
          );
        },
      },
      {
        accessorKey: "likesCount",
        header: ({ column }) => <SortableHeader column={column} label="Likes" />,
        cell: ({ row }) => {
          const count = row.original.likesCount || 0;
          return (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Heart className={`size-3.5 ${count > 0 ? "fill-rose-500 text-rose-500" : ""}`} />
              <span>{count}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "isPublished",
        header: ({ column }) => <SortableHeader column={column} label="Status & Permissions" />,
        cell: ({ row }) => {
          const art = row.original;
          const st = art.status || (art.isPublished ? "PUBLISHED" : "DRAFT");
          const aud = (art.audience || "INTERNAL").toUpperCase();
          const vis = (art.visibility || "PUBLIC").toUpperCase();
          const groupCount = art.allowedGroups?.length || 0;

          return (
            <div className="flex flex-col gap-1 items-start">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant={st === "PUBLISHED" ? "success" : st === "PENDING_REVIEW" ? "info" : "warning"}
                  className="text-[11px] font-normal"
                >
                  {st === "PUBLISHED" ? "Published" : st === "PENDING_REVIEW" ? "Pending Review" : "Draft"}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono px-1.5 py-0 ${
                    vis === "UNPUBLIC"
                      ? "border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10"
                      : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  }`}
                  title={vis === "UNPUBLIC" ? "Accessible only via direct link" : "Visible on homepage and search"}
                >
                  {vis === "UNPUBLIC" ? (
                    <span className="flex items-center gap-1">
                      <Link2 className="size-2.5" />
                      Unlisted
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Eye className="size-2.5" />
                      Public
                    </span>
                  )}
                </Badge>
              </div>

              <Badge
                variant="outline"
                className={`text-[10px] font-mono px-1.5 py-0 ${
                  aud === "FREE"
                    ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                    : "border-primary/40 text-primary bg-primary/10"
                }`}
                title={aud === "FREE" ? "Public access (no login required)" : groupCount > 0 ? `Restricted to ${groupCount} department(s)` : "All MPC members"}
              >
                {aud === "FREE" ? (
                  <span className="flex items-center gap-1">
                    <Globe className="size-2.5" />
                    Free (Guest)
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="size-2.5" />
                    {groupCount > 0 ? `Internal (${groupCount} depts)` : "MPC Internal"}
                  </span>
                )}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "quiz",
        header: "Quiz",
        cell: ({ row }) => {
          const art = row.original;
          const qCount = art.quizQuestions?.length || 0;
          if (qCount === 0) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
              <span>{qCount} questions</span>
              {art.passScorePercent > 0 && (
                <span>• ≥{art.passScorePercent}%</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => <SortableHeader column={column} label="Updated" />,
        cell: ({ row }) => {
          return (
            <span className="font-mono text-xs text-muted-foreground">
              {formatDate(row.original.updatedAt)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const art = row.original;
          const currentStatus = art.status || (art.isPublished ? "PUBLISHED" : "DRAFT");
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="cursor-pointer">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuItem asChild>
                  <Link href={`/studio/articles/${art.id}`} className="cursor-pointer">
                    <FileEdit className="size-3.5 mr-2" />
                    <span>Edit Article</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/docs/${art.slug}`} target="_blank" className="cursor-pointer">
                    <ExternalLink className="size-3.5 mr-2" />
                    <span>Read Article</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const url = `${window.location.origin}/docs/${art.slug}`;
                    navigator.clipboard.writeText(url);
                    showToast(`Copied share link: /docs/${art.slug}`, "success");
                  }}
                  className="cursor-pointer"
                >
                  <Share2 className="size-3.5 mr-2 text-primary" />
                  <span>Share Link</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await duplicateArticle(art.id);
                  }}
                  className="cursor-pointer"
                >
                  <Copy className="size-3.5 mr-2" />
                  <span>Duplicate</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {/* Quick Status Changers */}
                {currentStatus !== "PUBLISHED" && (
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await updateArticleStatus(art.id, "PUBLISHED");
                      } catch (e: any) {
                        showToast(e.message || "Failed to publish", "error");
                      }
                    }}
                    className="text-emerald-600 dark:text-emerald-400 font-medium cursor-pointer"
                  >
                    <CheckCircle2 className="size-3.5 mr-2" />
                    <span>Publish (Xuất bản)</span>
                  </DropdownMenuItem>
                )}

                {currentStatus !== "PENDING_REVIEW" && (
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await updateArticleStatus(art.id, "PENDING_REVIEW");
                      } catch (e: any) {
                        showToast(e.message || "Failed to submit review", "error");
                      }
                    }}
                    className="text-blue-600 dark:text-blue-400 cursor-pointer"
                  >
                    <Clock className="size-3.5 mr-2" />
                    <span>Gửi duyệt (Pending)</span>
                  </DropdownMenuItem>
                )}

                {currentStatus !== "DRAFT" && (
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await updateArticleStatus(art.id, "DRAFT");
                      } catch (e: any) {
                        showToast(e.message || "Failed to revert to draft", "error");
                      }
                    }}
                    className="text-amber-600 dark:text-amber-400 cursor-pointer"
                  >
                    <RotateCcw className="size-3.5 mr-2" />
                    <span>Về bản nháp (Draft)</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setDeleteTargetIds([art.id]);
                    setDeleteTargetLabel(`article "${art.title}"`);
                  }}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="size-3.5 mr-2" />
                  <span>Delete Article</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [categoryMap, duplicateArticle, updateArticleStatus, showToast]
  );

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);

  return (
    <AdminLayout breadcrumbs={[{ label: "Articles" }]}>
      <div className="space-y-6">
        {/* Top Page Header */}
        <PageHeader
          title="Articles & Curriculum"
          description="Manage handbook lessons, curriculum hierarchy, and sequential assessment roadmap."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCreateCategoryModal()}
                className="cursor-pointer text-xs"
              >
                <FolderPlus className="size-3.5 mr-1.5 text-primary" />
                <span>Add Category</span>
              </Button>
              <Button asChild size="sm" className="cursor-pointer text-xs">
                <Link
                  href={
                    selectedCategoryId !== "ALL"
                      ? `/studio/articles/new?categoryId=${selectedCategoryId}`
                      : "/studio/articles/new"
                  }
                >
                  <Plus className="size-3.5 mr-1.5" />
                  <span>New Article</span>
                </Link>
              </Button>
            </div>
          }
        />

        {/* Unified Search, Filters & View Mode Switcher */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border rounded-xl p-3 shadow-2xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or slug..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px] text-xs cursor-pointer">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery.trim() !== "" || statusFilter !== "ALL") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="h-9 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCcw className="size-3.5 mr-1" />
                <span>Reset</span>
              </Button>
            )}

            {/* View Mode Switcher */}
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 ml-auto">
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  viewMode === "tree"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FolderTree className="size-3.5" />
                <span>Tree View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-background text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="size-3.5" />
                <span>Table View</span>
              </button>
            </div>
          </div>
        </div>

        {/* VIEW MODE 1: Tree Explorer (Master-Detail) */}
        {viewMode === "tree" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Interactive Category Tree Navigation */}
            <div className="lg:col-span-4 rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <FolderTree className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Curriculum Tree
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => openCreateCategoryModal()}
                  className="h-7 text-xs gap-1 text-primary hover:text-primary cursor-pointer"
                  title="Add Tier 1 Category"
                >
                  <Plus className="size-3" />
                  <span>Tier 1</span>
                </Button>
              </div>

              {/* Tree Items List */}
              <div className="space-y-1">
                {/* Special Root: All Articles */}
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId("ALL")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    selectedCategoryId === "ALL"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <BookOpen className="size-3.5 shrink-0" />
                    <span>All Articles</span>
                  </div>
                  <Badge
                    variant={selectedCategoryId === "ALL" ? "secondary" : "outline"}
                    className="font-mono text-[10px] h-4.5 px-1.5"
                  >
                    {articles.length}
                  </Badge>
                </button>

                {/* Categories Level 1 & Level 2 */}
                {rootCategories.map((root) => {
                  const subs = subCategoriesByParent.get(root.id) || [];
                  const isExpanded = expandedCategoryIds[root.id] !== false;
                  const isSelected = selectedCategoryId === root.id;
                  const totalCount = totalArticleCountForBranch(root.id);

                  return (
                    <div key={root.id} className="space-y-0.5">
                      {/* Level 1 Item */}
                      <div
                        className={`group/root flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${
                          isSelected
                            ? "bg-primary/10 text-primary font-semibold border border-primary/25"
                            : "hover:bg-muted/50 text-foreground"
                        }`}
                      >
                        <div
                          onClick={() => setSelectedCategoryId(root.id)}
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(root.id);
                            }}
                            className="size-5 flex items-center justify-center rounded hover:bg-background/80 text-muted-foreground cursor-pointer"
                          >
                            {subs.length > 0 ? (
                              isExpanded ? (
                                <ChevronDown className="size-3.5" />
                              ) : (
                                <ChevronRight className="size-3.5" />
                              )
                            ) : (
                              <Folder className="size-3.5 text-muted-foreground/60" />
                            )}
                          </button>
                          <span className="truncate">{root.name}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="font-mono text-[10px] h-4 px-1 text-muted-foreground"
                          >
                            {totalCount}
                          </Badge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="size-6 flex items-center justify-center rounded hover:bg-background text-muted-foreground opacity-60 group-hover/root:opacity-100 transition-opacity cursor-pointer"
                              >
                                <MoreVertical className="size-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuItem
                                onClick={() => openCreateCategoryModal(root.id)}
                                className="cursor-pointer"
                              >
                                <FolderPlus className="size-3.5 mr-2 text-primary" />
                                <span>Add Subcategory (Tier 2)</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEditCategoryModal(root)}
                                className="cursor-pointer"
                              >
                                <FileEdit className="size-3.5 mr-2" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteCategoryDialog(root)}
                                className="text-destructive focus:text-destructive cursor-pointer"
                              >
                                <Trash2 className="size-3.5 mr-2" />
                                <span>Delete Category</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Level 2 Subcategories (Nested) */}
                      {isExpanded && subs.length > 0 && (
                        <div className="pl-6 space-y-0.5 border-l-2 border-border/50 ml-4">
                          {subs.map((sub) => {
                            const isSubSelected = selectedCategoryId === sub.id;
                            const subCount = articleCountByCategory.get(sub.id) || 0;

                            return (
                              <div
                                key={sub.id}
                                className={`group/sub flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                                  isSubSelected
                                    ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <div
                                  onClick={() => setSelectedCategoryId(sub.id)}
                                  className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer truncate"
                                >
                                  <Folder className="size-3 text-muted-foreground/70 shrink-0" />
                                  <span className="truncate">{sub.name}</span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="font-mono text-[10px] text-muted-foreground px-1">
                                    {subCount}
                                  </span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className="size-5 flex items-center justify-center rounded hover:bg-background text-muted-foreground opacity-40 group-hover/sub:opacity-100 transition-opacity cursor-pointer"
                                      >
                                        <MoreVertical className="size-3" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44 text-xs">
                                      <DropdownMenuItem
                                        onClick={() => openEditCategoryModal(sub)}
                                        className="cursor-pointer"
                                      >
                                        <FileEdit className="size-3.5 mr-2" />
                                        <span>Edit</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => openDeleteCategoryDialog(sub)}
                                        className="text-destructive focus:text-destructive cursor-pointer"
                                      >
                                        <Trash2 className="size-3.5 mr-2" />
                                        <span>Delete Category</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Articles in Selected Category */}
            <div className="lg:col-span-8 space-y-4">
              {/* Category Breadcrumb and Info Banner */}
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <span>
                      {selectedCategoryId === "ALL"
                        ? "All Handbook Articles"
                        : selectedCategoryObj?.name || "Category"}
                    </span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {filteredArticles.length} articles
                    </Badge>
                  </h2>
                  {selectedCategoryObj?.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {selectedCategoryObj.description}
                    </p>
                  )}
                </div>

                <Button asChild size="xs" className="cursor-pointer shrink-0">
                  <Link
                    href={
                      selectedCategoryId !== "ALL"
                        ? `/studio/articles/new?categoryId=${selectedCategoryId}`
                        : "/studio/articles/new"
                    }
                  >
                    <Plus className="size-3.5 mr-1" />
                    <span>New Article</span>
                  </Link>
                </Button>
              </div>

              {/* Paginated Articles List */}
              {paginatedArticles.length > 0 ? (
                <div className="space-y-2.5">
                  {paginatedArticles.map((art, idx) => {
                    const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                    const catName = categoryMap.get(art.categoryId) || "Category";
                    const qCount = art.quizQuestions?.length || 0;

                    return (
                      <div
                        key={art.id}
                        className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-xs transition-all"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <span className="font-mono text-xs font-bold text-muted-foreground/60 w-6 shrink-0 text-center">
                            #{globalIdx}
                          </span>

                          <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                            <ArticleCover
                              src={art.coverImage}
                              title={art.title}
                              className="size-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <Link
                              href={`/studio/articles/${art.id}`}
                              className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 text-sm leading-snug break-words"
                            >
                              {art.title}
                            </Link>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 font-normal">
                                {catName}
                              </Badge>

                              <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                                <Clock className="size-3" />
                                <span>~{art.readingTime}m</span>
                              </span>

                              <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                                <Heart
                                  className={`size-3 ${
                                    (art.likesCount || 0) > 0 ? "fill-rose-500 text-rose-500" : ""
                                  }`}
                                />
                                <span>{art.likesCount || 0}</span>
                              </span>

                              {qCount > 0 ? (
                                <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5 font-mono">
                                  {qCount} questions {art.passScorePercent > 0 && `(≥${art.passScorePercent}%)`}
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/70">No quiz</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status & Audience & Visibility Badges & Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap sm:flex-nowrap justify-end">
                          {(() => {
                            const aud = (art.audience || "INTERNAL").toUpperCase();
                            const vis = (art.visibility || "PUBLIC").toUpperCase();
                            const groupCount = art.allowedGroups?.length || 0;

                            return (
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-mono px-1.5 py-0 ${
                                    aud === "FREE"
                                      ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                                      : "border-primary/40 text-primary bg-primary/10"
                                  }`}
                                  title={aud === "FREE" ? "Public access" : groupCount > 0 ? `Restricted to ${groupCount} depts` : "All MPC members"}
                                >
                                  {aud === "FREE" ? (
                                    <span className="flex items-center gap-1">
                                      <Globe className="size-2.5" />
                                      Free
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <ShieldCheck className="size-2.5" />
                                      {groupCount > 0 ? `Internal (${groupCount})` : "Internal"}
                                    </span>
                                  )}
                                </Badge>

                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-mono px-1.5 py-0 ${
                                    vis === "UNPUBLIC"
                                      ? "border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-500/10"
                                      : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                  }`}
                                  title={vis === "UNPUBLIC" ? "Accessible only via direct link" : "Visible on homepage and search"}
                                >
                                  {vis === "UNPUBLIC" ? (
                                    <span className="flex items-center gap-1">
                                      <Link2 className="size-2.5" />
                                      Unlisted
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <Eye className="size-2.5" />
                                      Public
                                    </span>
                                  )}
                                </Badge>
                              </div>
                            );
                          })()}

                          <Badge
                            variant={
                              (art.status || (art.isPublished ? "PUBLISHED" : "DRAFT")) === "PUBLISHED"
                                ? "success"
                                : (art.status || (art.isPublished ? "PUBLISHED" : "DRAFT")) === "PENDING_REVIEW"
                                ? "info"
                                : "warning"
                            }
                            className="text-xs font-normal"
                          >
                            {(art.status || (art.isPublished ? "PUBLISHED" : "DRAFT")) === "PUBLISHED"
                              ? "Published"
                              : (art.status || (art.isPublished ? "PUBLISHED" : "DRAFT")) === "PENDING_REVIEW"
                              ? "Pending Review"
                              : "Draft"}
                          </Badge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" className="cursor-pointer">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuItem asChild>
                                <Link href={`/studio/articles/${art.id}`} className="cursor-pointer">
                                  <FileEdit className="size-3.5 mr-2" />
                                  <span>Edit Article</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/docs/${art.slug}`} target="_blank" className="cursor-pointer">
                                  <ExternalLink className="size-3.5 mr-2" />
                                  <span>Read Article</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const url = `${window.location.origin}/docs/${art.slug}`;
                                  navigator.clipboard.writeText(url);
                                  showToast(`Copied share link: /docs/${art.slug}`, "success");
                                }}
                                className="cursor-pointer"
                              >
                                <Share2 className="size-3.5 mr-2 text-primary" />
                                <span>Share Link</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  await duplicateArticle(art.id);
                                }}
                                className="cursor-pointer"
                              >
                                <Copy className="size-3.5 mr-2" />
                                <span>Duplicate</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />

                              {/* Quick Status Changers */}
                              {(art.status || (art.isPublished ? "PUBLISHED" : "DRAFT")) !== "PUBLISHED" && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await updateArticleStatus(art.id, "PUBLISHED");
                                    } catch (e: any) {
                                      showToast(e.message || "Failed to publish", "error");
                                    }
                                  }}
                                  className="text-emerald-600 dark:text-emerald-400 font-medium cursor-pointer"
                                >
                                  <CheckCircle2 className="size-3.5 mr-2" />
                                  <span>Publish (Xuất bản)</span>
                                </DropdownMenuItem>
                              )}

                              {(art.status || (art.isPublished ? "PUBLISHED" : "DRAFT")) !== "PENDING_REVIEW" && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await updateArticleStatus(art.id, "PENDING_REVIEW");
                                    } catch (e: any) {
                                      showToast(e.message || "Failed to submit review", "error");
                                    }
                                  }}
                                  className="text-blue-600 dark:text-blue-400 cursor-pointer"
                                >
                                  <Clock className="size-3.5 mr-2" />
                                  <span>Gửi duyệt (Pending)</span>
                                </DropdownMenuItem>
                              )}

                              {(art.status || (art.isPublished ? "PUBLISHED" : "DRAFT")) !== "DRAFT" && (
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      await updateArticleStatus(art.id, "DRAFT");
                                    } catch (e: any) {
                                      showToast(e.message || "Failed to revert to draft", "error");
                                    }
                                  }}
                                  className="text-amber-600 dark:text-amber-400 cursor-pointer"
                                >
                                  <RotateCcw className="size-3.5 mr-2" />
                                  <span>Về bản nháp (Draft)</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeleteTargetIds([art.id]);
                                  setDeleteTargetLabel(`article "${art.title}"`);
                                }}
                                className="text-destructive focus:text-destructive cursor-pointer"
                              >
                                <Trash2 className="size-3.5 mr-2" />
                                <span>Delete Article</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3 bg-card/40">
                  <FileText className="size-8 mx-auto text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">
                    No articles in this category yet
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Create a new article to begin structuring the learning roadmap for members.
                  </p>
                  <Button asChild size="sm" className="mt-2 cursor-pointer">
                    <Link
                      href={
                        selectedCategoryId !== "ALL"
                          ? `/studio/articles/new?categoryId=${selectedCategoryId}`
                          : "/studio/articles/new"
                      }
                    >
                      <Plus className="size-3.5 mr-1" />
                      <span>Create First Article</span>
                    </Link>
                  </Button>
                </div>
              )}

              {/* Pagination Controls for Tree View */}
              {filteredArticles.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-3 border-t border-border">
                  <div className="flex items-center gap-3">
                    <span>
                      Showing{" "}
                      <strong className="font-mono text-foreground">
                        {(currentPage - 1) * pageSize + 1}–
                        {Math.min(currentPage * pageSize, filteredArticles.length)}
                      </strong>{" "}
                      of{" "}
                      <strong className="font-mono text-foreground">
                        {filteredArticles.length}
                      </strong>{" "}
                      articles
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px]">Per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="h-7 text-xs rounded-md border border-border bg-background px-1.5 py-0.5 text-foreground cursor-pointer"
                      >
                        {[20, 50, 100].map((size) => (
                          <option key={size} value={size}>
                            {size} articles
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="cursor-pointer"
                      >
                        Previous
                      </Button>
                      <span className="px-2 font-mono text-foreground">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="cursor-pointer"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VIEW MODE 2: Flat Data Table View */
          <DataTable
            columns={columns}
            data={filteredArticles}
            loading={dataLoading}
            pageSize={pageSize}
            getRowId={(row) => row.id}
            bulkActions={(selected, clear) => (
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={async () => {
                    await bulkUpdateArticles(
                      selected.map((r) => r.id),
                      "publish"
                    );
                    clear();
                  }}
                  className="cursor-pointer text-xs"
                >
                  <CheckCircle2 className="size-3.5 mr-1 text-emerald-500" />
                  <span>Publish ({selected.length})</span>
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={async () => {
                    await bulkUpdateArticles(
                      selected.map((r) => r.id),
                      "unpublish"
                    );
                    clear();
                  }}
                  className="cursor-pointer text-xs"
                >
                  <EyeOff className="size-3.5 mr-1 text-amber-500" />
                  <span>Revert to Draft ({selected.length})</span>
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => {
                    setDeleteTargetIds(selected.map((r) => r.id));
                    setDeleteTargetLabel(`${selected.length} selected articles`);
                    setClearSelectionTrigger(() => clear);
                  }}
                  className="cursor-pointer text-xs"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  <span>Delete ({selected.length})</span>
                </Button>
              </div>
            )}
          />
        )}
      </div>

      {/* Modal 1: Create or Edit Category */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {categoryModalMode === "create"
                  ? categoryFormParentId
                    ? "Add Subcategory"
                    : "Add Category"
                  : "Edit Category"}
              </DialogTitle>
              <DialogDescription>
                {categoryFormParentId
                  ? "Tier 2 subcategory under the selected parent category. Supports up to 2 tiers."
                  : "Root Tier 1 category displayed on the main curriculum roadmap."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Category Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={categoryFormName}
                  onChange={(e) => {
                    setCategoryFormName(e.target.value);
                    if (categoryModalMode === "create") {
                      setCategoryFormSlug(slugify(e.target.value));
                    }
                  }}
                  placeholder="e.g. Git Flow Standards & Branching"
                  className="text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Slug URL
                </label>
                <Input
                  value={categoryFormSlug}
                  onChange={(e) => setCategoryFormSlug(e.target.value)}
                  placeholder="git-flow-standards"
                  className="text-xs font-mono"
                />
              </div>

              {/* Parent category picker */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Category Tier
                </label>
                <Select
                  value={categoryFormParentId || "ROOT"}
                  onValueChange={(val) => setCategoryFormParentId(val === "ROOT" ? "" : val)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROOT">Tier 1 Root Category</SelectItem>
                    {rootCategories
                      .filter((c) => c.id !== editingCategoryId)
                      .map((root) => (
                        <SelectItem key={root.id} value={root.id}>
                          Under Tier 1: {root.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Description
                </label>
                <Textarea
                  value={categoryFormDescription}
                  onChange={(e) => setCategoryFormDescription(e.target.value)}
                  placeholder="Brief summary of this category's curriculum focus..."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCategoryModalOpen(false)}
                disabled={categoryModalLoading}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={categoryModalLoading}
                className="cursor-pointer"
              >
                {categoryModalLoading ? "Saving..." : "Save Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Safe Category Deletion Dialog */}
      <Dialog
        open={Boolean(deleteCategoryTarget)}
        onOpenChange={(open) => !open && setDeleteCategoryTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          {deleteCategoryTarget && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-5 shrink-0" />
                  <DialogTitle>
                    Confirm Category Deletion &ldquo;{deleteCategoryTarget.name}&rdquo;
                  </DialogTitle>
                </div>
                <DialogDescription>
                  {totalArticleCountForBranch(deleteCategoryTarget.id) > 0 ? (
                    <span>
                      This category currently contains{" "}
                      <strong className="text-foreground">
                        {totalArticleCountForBranch(deleteCategoryTarget.id)} articles
                      </strong>
                      . Please choose how to handle them to avoid data loss:
                    </span>
                  ) : (
                    <span>Are you sure you want to delete this empty category?</span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {totalArticleCountForBranch(deleteCategoryTarget.id) > 0 ? (
                <div className="space-y-3 py-1">
                  {/* Option 1: Reassign */}
                  <label
                    onClick={() => setDeleteCategoryAction("reassign")}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      deleteCategoryAction === "reassign"
                        ? "border-primary bg-primary/5 text-foreground font-medium"
                        : "border-border hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deleteCategoryAction"
                      checked={deleteCategoryAction === "reassign"}
                      onChange={() => setDeleteCategoryAction("reassign")}
                      className="mt-1"
                    />
                    <div className="space-y-1.5 flex-1">
                      <p className="text-xs font-semibold text-foreground">
                        Reassign articles to another category (Recommended)
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        All articles will be preserved and reassigned to the selected category below.
                      </p>
                      {deleteCategoryAction === "reassign" && (
                        <Select
                          value={deleteCategoryReassignId}
                          onValueChange={setDeleteCategoryReassignId}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background mt-2">
                            <SelectValue placeholder="Select destination category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories
                              .filter(
                                (c) =>
                                  c.id !== deleteCategoryTarget.id &&
                                  c.parentId !== deleteCategoryTarget.id
                              )
                              .map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.depth === 2 ? `↳ ${c.name}` : c.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </label>

                  {/* Option 2: Cascade Delete */}
                  <label
                    onClick={() => setDeleteCategoryAction("cascade")}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      deleteCategoryAction === "cascade"
                        ? "border-destructive bg-destructive/10 text-destructive font-medium"
                        : "border-border hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deleteCategoryAction"
                      checked={deleteCategoryAction === "cascade"}
                      onChange={() => setDeleteCategoryAction("cascade")}
                      className="mt-1"
                    />
                    <div className="space-y-1 flex-1">
                      <p className="text-xs font-semibold text-destructive">
                        Delete category and CASCADE DELETE ALL{" "}
                        {totalArticleCountForBranch(deleteCategoryTarget.id)} articles inside
                      </p>
                      <p className="text-[11px] text-destructive/80 leading-normal">
                        Warning: This action cannot be undone. All articles, quizzes, and reader progress will be permanently deleted.
                      </p>
                    </div>
                  </label>
                </div>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteCategoryTarget(null)}
                  disabled={deleteCategoryLoading}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleConfirmDeleteCategory}
                  disabled={
                    deleteCategoryLoading ||
                    (totalArticleCountForBranch(deleteCategoryTarget.id) > 0 &&
                      deleteCategoryAction === "reassign" &&
                      !deleteCategoryReassignId)
                  }
                  className="cursor-pointer"
                >
                  {deleteCategoryLoading ? "Processing..." : "Confirm Delete"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 3: Article Deletion Dialog */}
      <ConfirmDialog
        open={deleteTargetIds.length > 0}
        onOpenChange={(open) => !open && setDeleteTargetIds([])}
        title="Confirm Delete Article"
        description={`Are you sure you want to delete ${deleteTargetLabel}? This action permanently removes the article and all associated quiz attempts.`}
        confirmLabel="Delete Article"
        variant="destructive"
        onConfirm={async () => {
          if (deleteTargetIds.length === 1) {
            await deleteArticle(deleteTargetIds[0]);
          } else if (deleteTargetIds.length > 1) {
            await bulkUpdateArticles(deleteTargetIds, "delete");
          }
          if (clearSelectionTrigger) {
            clearSelectionTrigger();
            setClearSelectionTrigger(null);
          }
          setDeleteTargetIds([]);
        }}
      />
    </AdminLayout>
  );
}
