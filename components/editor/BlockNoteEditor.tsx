"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { BlockType, EditorBlock, GalleryImage, TableData, ComparisonData } from "@/types";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bold,
  Check,
  CheckCircle2,
  CheckSquare,
  Code,
  Columns2,
  Copy,
  FileImage,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Images,
  Info,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  Redo2,
  ShieldAlert,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Type,
  Underline,
  Undo2,
  UploadCloud,
  Video,
  X,
  XCircle,
  Youtube,
} from "lucide-react";

interface BlockNoteEditorProps {
  blocks: EditorBlock[];
  onChange: (nextBlocks: EditorBlock[]) => void;
  onUploadError?: (msg: string) => void;
  onUploadSuccess?: (url: string) => void;
}

const BLOCK_CATEGORIES = [
  {
    group: "Typography",
    items: [
      { type: "paragraph" as BlockType, label: "Paragraph", icon: Type },
      { type: "heading_1" as BlockType, label: "Heading 1 (H1)", icon: Heading1 },
      { type: "heading_2" as BlockType, label: "Heading 2 (H2)", icon: Heading2 },
      { type: "heading_3" as BlockType, label: "Heading 3 (H3)", icon: Heading3 },
      { type: "quote" as BlockType, label: "Blockquote", icon: Quote },
    ],
  },
  {
    group: "Lists",
    items: [
      { type: "bullet_list" as BlockType, label: "Bullet List", icon: List },
      { type: "numbered_list" as BlockType, label: "Numbered List", icon: ListOrdered },
      { type: "checklist" as BlockType, label: "Checklist", icon: CheckSquare },
    ],
  },
  {
    group: "Media",
    items: [
      { type: "image" as BlockType, label: "Single Image", icon: FileImage },
      { type: "gallery" as BlockType, label: "Image Gallery", icon: Images },
      { type: "video" as BlockType, label: "Embedded Video", icon: Video },
    ],
  },
  {
    group: "Structure & Layout",
    items: [
      { type: "table" as BlockType, label: "Data Table", icon: TableIcon },
      { type: "comparison" as BlockType, label: "2-Column Comparison", icon: Columns2 },
      { type: "callout" as BlockType, label: "Callout Box", icon: Info },
      { type: "code" as BlockType, label: "Code Block", icon: Code },
      { type: "divider" as BlockType, label: "Divider Line", icon: Minus },
    ],
  },
];

const ALL_BLOCK_TYPES = BLOCK_CATEGORIES.flatMap((c) => c.items);

export default function BlockNoteEditor({
  blocks,
  onChange,
  onUploadError,
  onUploadSuccess,
}: BlockNoteEditorProps) {
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<{
    blockId: string;
    isGallery?: boolean;
  } | null>(null);

  const blockCounterRef = useRef(100);

  // Undo / Redo History Management
  const [history, setHistory] = useState<EditorBlock[][]>(() => [
    JSON.parse(JSON.stringify(blocks)),
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isUndoingRedoingRef = useRef(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const pushSnapshot = useCallback((newBlocks: EditorBlock[]) => {
    if (isUndoingRedoingRef.current) return;
    const cloned = JSON.parse(JSON.stringify(newBlocks));
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, cloned];
      return next.length > 50 ? next.slice(next.length - 50) : next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    isUndoingRedoingRef.current = true;
    const targetIdx = historyIndex - 1;
    const targetState = JSON.parse(JSON.stringify(history[targetIdx]));
    setHistoryIndex(targetIdx);
    onChange(targetState);
    setTimeout(() => {
      isUndoingRedoingRef.current = false;
    }, 40);
  }, [history, historyIndex, onChange]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    isUndoingRedoingRef.current = true;
    const targetIdx = historyIndex + 1;
    const targetState = JSON.parse(JSON.stringify(history[targetIdx]));
    setHistoryIndex(targetIdx);
    onChange(targetState);
    setTimeout(() => {
      isUndoingRedoingRef.current = false;
    }, 40);
  }, [history, historyIndex, onChange]);

  // Global Undo / Redo listener
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [undo, redo]);

  const updateBlock = (
    id: string,
    patch: Partial<EditorBlock>,
    immediateSnapshot = false
  ) => {
    const nextBlocks = blocks.map((b) =>
      b.id === id ? { ...b, ...patch } : b
    );
    onChange(nextBlocks);

    if (immediateSnapshot) {
      pushSnapshot(nextBlocks);
    } else {
      // Debounce typing snapshot to capture paragraph edits smoothly
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        pushSnapshot(nextBlocks);
      }, 700);
    }
  };

  const addBlockAfter = (index: number, type: BlockType = "paragraph") => {
    blockCounterRef.current += 1;
    let defaultProps: EditorBlock["props"] = { align: "left" };

    if (type === "callout") {
      defaultProps = { variant: "info" };
    } else if (type === "code") {
      defaultProps = { language: "typescript" };
    } else if (type === "checklist") {
      defaultProps = { checked: false };
    } else if (type === "gallery") {
      defaultProps = { galleryImages: [] };
    } else if (type === "video") {
      defaultProps = { videoUrl: "", caption: "" };
    } else if (type === "table") {
      defaultProps = {
        tableData: {
          headers: ["Criteria", "Description", "Standard"],
          rows: [
            ["Topic 1", "Details 1", "Approved"],
            ["Topic 2", "Details 2", "Approved"],
          ],
        },
      };
    } else if (type === "comparison") {
      defaultProps = {
        comparisonData: {
          leftTitle: "Do / Recommended",
          leftPoints: ["Proactive communication", "Clear meeting minutes"],
          rightTitle: "Avoid / Caution",
          rightPoints: ["Unreported changes", "Skipping approval process"],
        },
      };
    }

    const newBlock: EditorBlock = {
      id: `blk_${Date.now()}_${blockCounterRef.current}`,
      type,
      content: "",
      props: defaultProps,
    };

    const next = [...blocks];
    next.splice(index + 1, 0, newBlock);
    onChange(next);
    pushSnapshot(next);
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) {
      updateBlock(id, { type: "paragraph", content: "", props: { align: "left" } }, true);
      return;
    }
    const next = blocks.filter((b) => b.id !== id);
    onChange(next);
    pushSnapshot(next);
  };

  const duplicateBlock = (index: number) => {
    blockCounterRef.current += 1;
    const target = blocks[index];
    const clone: EditorBlock = {
      ...JSON.parse(JSON.stringify(target)),
      id: `blk_${Date.now()}_${blockCounterRef.current}`,
    };
    const next = [...blocks];
    next.splice(index + 1, 0, clone);
    onChange(next);
    pushSnapshot(next);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    const next = [...blocks];
    const [removed] = next.splice(index, 1);
    next.splice(targetIdx, 0, removed);
    onChange(next);
    pushSnapshot(next);
  };

  const handleFileUpload = async (blockId: string, file: File, isGallery = false) => {
    // Check 5MB limit before uploading
    if (file.size > 5 * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      onUploadError?.(
        `Image size (${sizeMb}MB) exceeds the maximum limit of 5MB. Please choose a smaller file.`
      );
      return;
    }

    setUploadingBlockId(blockId);
    try {
      const url = await uploadToCloudinary(file);
      const targetBlock = blocks.find((b) => b.id === blockId);

      if (isGallery && targetBlock) {
        const currentList = targetBlock.props?.galleryImages || [];
        const newImg: GalleryImage = {
          id: `img_${Date.now()}`,
          url,
          caption: file.name.replace(/\.[^/.]+$/, ""),
        };
        const nextProps = {
          ...targetBlock.props,
          galleryImages: [...currentList, newImg],
        };
        updateBlock(blockId, { props: nextProps }, true);
      } else {
        updateBlock(
          blockId,
          {
            type: "image",
            props: {
              imageUrl: url,
              caption: file.name.replace(/\.[^/.]+$/, ""),
            },
          },
          true
        );
      }
      onUploadSuccess?.(url);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to upload image.";
      onUploadError?.(msg);
    } finally {
      setUploadingBlockId(null);
      setActiveUploadTarget(null);
    }
  };

  // Quick formatting wrapper helper for textarea content
  const applyTextWrap = (
    blockId: string,
    currentContent: string,
    prefix: string,
    suffix: string,
    placeholder = "content"
  ) => {
    const next = currentContent
      ? `${currentContent} ${prefix}${placeholder}${suffix}`
      : `${prefix}${placeholder}${suffix}`;
    updateBlock(blockId, { content: next }, true);
  };

  // Keyboard shortcut handler for rich formatting (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K, Ctrl+`, Ctrl+Z, Ctrl+Y)
  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    blockId: string
  ) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (!isCtrlOrCmd) return;

    const key = e.key.toLowerCase();

    // Undo / Redo Shortcuts inside active textarea
    if (key === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }
    if (key === "y") {
      e.preventDefault();
      redo();
      return;
    }

    let prefix = "";
    let suffix = "";
    let defaultPlaceholder = "";

    if (key === "b") {
      prefix = "**";
      suffix = "**";
      defaultPlaceholder = "bold text";
    } else if (key === "i") {
      prefix = "*";
      suffix = "*";
      defaultPlaceholder = "italic text";
    } else if (key === "u") {
      prefix = "<u>";
      suffix = "</u>";
      defaultPlaceholder = "underlined text";
    } else if (key === "k") {
      prefix = "[";
      suffix = "](https://mpclub.dev)";
      defaultPlaceholder = "link title";
    } else if (key === "`" || (e.shiftKey && key === "c")) {
      prefix = "`";
      suffix = "`";
      defaultPlaceholder = "code";
    } else {
      return;
    }

    e.preventDefault();
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const currentVal = target.value;

    const selectedText = currentVal.substring(start, end);
    const textToWrap = selectedText || defaultPlaceholder;

    const nextVal =
      currentVal.substring(0, start) +
      prefix +
      textToWrap +
      suffix +
      currentVal.substring(end);

    // Save with immediate snapshot so Ctrl+Z undoes the format directly
    updateBlock(blockId, { content: nextVal }, true);

    // Move cursor right after the wrapped text
    const newCursorPos =
      start + prefix.length + textToWrap.length + suffix.length;
    setTimeout(() => {
      target.selectionStart = newCursorPos;
      target.selectionEnd = newCursorPos;
      target.focus();
    }, 0);
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeUploadTarget) {
            handleFileUpload(
              activeUploadTarget.blockId,
              file,
              activeUploadTarget.isGallery
            );
          }
          e.target.value = "";
        }}
      />

      {/* Top Editor Control Toolbar: Undo / Redo & Formatting Quick Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-card border border-border/80 text-xs shadow-2xs select-none sticky top-16 z-20 backdrop-blur-md bg-card/90">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={!canUndo}
            onClick={undo}
            className="h-7 px-2 text-xs gap-1.5 cursor-pointer hover:bg-muted disabled:opacity-40"
            title="Undo changes (Ctrl+Z)"
          >
            <Undo2 className="size-3.5 text-primary" />
            <span>Undo</span>
            <kbd className="hidden sm:inline-block text-[10px] bg-muted/80 px-1 py-0.5 rounded text-muted-foreground font-mono">
              Ctrl+Z
            </kbd>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={!canRedo}
            onClick={redo}
            className="h-7 px-2 text-xs gap-1.5 cursor-pointer hover:bg-muted disabled:opacity-40"
            title="Redo action (Ctrl+Y or Ctrl+Shift+Z)"
          >
            <Redo2 className="size-3.5 text-primary" />
            <span>Redo</span>
            <kbd className="hidden sm:inline-block text-[10px] bg-muted/80 px-1 py-0.5 rounded text-muted-foreground font-mono">
              Ctrl+Y
            </kbd>
          </Button>

          <Separator orientation="vertical" className="h-4 mx-1" />

          <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground/80">
            Step {historyIndex + 1}/{history.length}
          </Badge>
        </div>

        {/* Quick Format Shortcuts Pill */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Shortcuts:</span>
          <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded">Ctrl+B: Bold</span>
          <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded">Ctrl+I: Italic</span>
          <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded">Ctrl+U: Underline</span>
          <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded">Ctrl+K: Link</span>
        </div>
      </div>

      {/* Blocks Container */}
      <div className="space-y-3">
        {blocks.map((block, index) => {
          const typeMeta =
            ALL_BLOCK_TYPES.find((t) => t.type === block.type) ||
            ALL_BLOCK_TYPES[0];
          const TypeIcon = typeMeta.icon;
          const currentAlign = block.props?.align || "left";

          const isTextType = [
            "paragraph",
            "heading_1",
            "heading_2",
            "heading_3",
            "quote",
            "bullet_list",
            "numbered_list",
            "callout",
          ].includes(block.type);

          return (
            <div
              key={block.id}
              className="group relative rounded-xl border border-transparent transition-all pl-10 pr-2 py-2 hover:border-border/60 hover:bg-muted/15"
            >
              {/* Left Hover Action Rail */}
              <div className="absolute left-1.5 top-2.5 flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="size-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      title="Change block type"
                    >
                      <TypeIcon className="size-4 text-primary" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 p-1.5 text-xs">
                    {BLOCK_CATEGORIES.map((cat, catIdx) => (
                      <React.Fragment key={cat.group}>
                        {catIdx > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel className="text-[11px] font-medium text-muted-foreground px-2 py-1">
                          {cat.group}
                        </DropdownMenuLabel>
                        {cat.items.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <DropdownMenuItem
                              key={opt.type}
                              onClick={() => {
                                if (opt.type === block.type) return;
                                let props = block.props;
                                if (opt.type === "table" && !props?.tableData) {
                                  props = {
                                    ...props,
                                    tableData: {
                                      headers: ["Criteria", "Description", "Standard"],
                                      rows: [["Topic 1", "Details 1", "Approved"]],
                                    },
                                  };
                                } else if (opt.type === "comparison" && !props?.comparisonData) {
                                  props = {
                                    ...props,
                                    comparisonData: {
                                      leftTitle: "Do / Recommended",
                                      leftPoints: ["Proactive communication"],
                                      rightTitle: "Avoid / Caution",
                                      rightPoints: ["Unreported changes"],
                                    },
                                  };
                                } else if (opt.type === "gallery" && !props?.galleryImages) {
                                  props = { ...props, galleryImages: [] };
                                }
                                updateBlock(block.id, { type: opt.type, props });
                              }}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Icon className="size-3.5 text-muted-foreground" />
                              <span>{opt.label}</span>
                            </DropdownMenuItem>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Top-Right Floating Control Toolbar (Floats safely above the block, never overlapping content or controls) */}
              <div className="absolute top-0 -translate-y-[calc(100%)] right-2 hidden group-hover:flex items-center gap-0.5 z-40 bg-background/95 rounded-lg border border-border/90 px-1.5 py-0.5 shadow-md backdrop-blur select-none animate-in fade-in zoom-in-95 duration-150">
                {/* Text Formatting Quick Helpers */}
                {isTextType && (
                  <>
                    <button
                      type="button"
                      onClick={() => applyTextWrap(block.id, block.content, "**", "**", "bold text")}
                      className="size-5 sm:size-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer"
                      title="Bold (**text**)"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextWrap(block.id, block.content, "*", "*", "italic text")}
                      className="size-5 sm:size-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground text-xs italic cursor-pointer"
                      title="Italic (*text*)"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextWrap(block.id, block.content, "<u>", "</u>", "underlined text")}
                      className="size-5 sm:size-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground text-xs underline cursor-pointer"
                      title="Underline (<u>text</u>)"
                    >
                      U
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextWrap(block.id, block.content, "[", "](https://mpclub.dev)", "link title")}
                      className="size-5 sm:size-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Insert link [title](url)"
                    >
                      <LinkIcon className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTextWrap(block.id, block.content, "`", "`", "code")}
                      className="size-5 sm:size-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground font-mono text-xs cursor-pointer"
                      title="Inline code (`code`)"
                    >
                      &lt;/&gt;
                    </button>

                    <Separator orientation="vertical" className="h-3.5 mx-0.5" />

                    {/* Alignment options */}
                    <button
                      type="button"
                      onClick={() =>
                        updateBlock(block.id, {
                          props: {
                            ...block.props,
                            align:
                              currentAlign === "left"
                                ? "center"
                                : currentAlign === "center"
                                ? "right"
                                : "left",
                          },
                        })
                      }
                      className="size-5 sm:size-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title={`Change alignment (Current: ${currentAlign})`}
                    >
                      {currentAlign === "center" ? (
                        <AlignCenter className="size-3" />
                      ) : currentAlign === "right" ? (
                        <AlignRight className="size-3" />
                      ) : (
                        <AlignLeft className="size-3" />
                      )}
                    </button>

                    <Separator orientation="vertical" className="h-3.5 mx-0.5" />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => moveBlock(index, "up")}
                  disabled={index === 0}
                  className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                  title="Move up"
                >
                  <ArrowUp className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(index, "down")}
                  disabled={index === blocks.length - 1}
                  className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                  title="Move down"
                >
                  <ArrowDown className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => duplicateBlock(index)}
                  className="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Duplicate block"
                >
                  <Copy className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={() => addBlockAfter(index)}
                  className="size-6 flex items-center justify-center rounded text-primary hover:bg-primary/10 cursor-pointer"
                  title="Insert block below"
                >
                  <Plus className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="size-6 flex items-center justify-center rounded text-destructive hover:bg-destructive/10 cursor-pointer"
                  title="Delete block"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Block Content Inputs based on Block Type */}
              <div className="min-w-0">
                {/* Heading 1 */}
                {block.type === "heading_1" && (
                  <Input
                    value={block.content}
                    onChange={(e) =>
                      updateBlock(block.id, { content: e.target.value })
                    }
                    onKeyDown={(e) => handleTextareaKeyDown(e, block.id)}
                    placeholder="Heading 1..."
                    className={cn(
                      "border-0 bg-transparent px-0 text-2xl sm:text-3xl font-bold tracking-tight focus-visible:ring-0 shadow-none h-auto py-1",
                      currentAlign === "center" && "text-center",
                      currentAlign === "right" && "text-right"
                    )}
                  />
                )}

                {/* Heading 2 */}
                {block.type === "heading_2" && (
                  <Input
                    value={block.content}
                    onChange={(e) =>
                      updateBlock(block.id, { content: e.target.value })
                    }
                    onKeyDown={(e) => handleTextareaKeyDown(e, block.id)}
                    placeholder="2. Section Heading 2..."
                    className={cn(
                      "border-0 border-b border-border/40 bg-transparent px-0 text-xl font-semibold tracking-tight focus-visible:ring-0 rounded-none shadow-none h-auto py-1",
                      currentAlign === "center" && "text-center",
                      currentAlign === "right" && "text-right"
                    )}
                  />
                )}

                {/* Heading 3 */}
                {block.type === "heading_3" && (
                  <Input
                    value={block.content}
                    onChange={(e) =>
                      updateBlock(block.id, { content: e.target.value })
                    }
                    onKeyDown={(e) => handleTextareaKeyDown(e, block.id)}
                    placeholder="2.1 Subsection Heading 3..."
                    className={cn(
                      "border-0 bg-transparent px-0 text-lg font-medium focus-visible:ring-0 shadow-none h-auto py-0.5",
                      currentAlign === "center" && "text-center",
                      currentAlign === "right" && "text-right"
                    )}
                  />
                )}

                {/* Paragraph */}
                {block.type === "paragraph" && (
                  <Textarea
                    value={block.content}
                    onChange={(e) =>
                      updateBlock(block.id, { content: e.target.value })
                    }
                    onKeyDown={(e) => handleTextareaKeyDown(e, block.id)}
                    placeholder="Enter text content (supports **bold**, *italic*, [link](url)...)"
                    rows={Math.max(2, block.content.split("\n").length)}
                    className={cn(
                      "border-0 bg-transparent px-0 text-sm sm:text-base leading-relaxed focus-visible:ring-0 resize-none shadow-none py-1",
                      currentAlign === "center" && "text-center",
                      currentAlign === "right" && "text-right",
                      currentAlign === "justify" && "text-justify"
                    )}
                  />
                )}

                {/* Bullet List */}
                {block.type === "bullet_list" && (
                  <div className="flex gap-2 items-start">
                    <span className="text-primary mt-1 text-base select-none">•</span>
                    <Textarea
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      onKeyDown={(e) => handleTextareaKeyDown(e, block.id)}
                      placeholder="Each line is a bullet item..."
                      rows={Math.max(2, block.content.split("\n").length)}
                      className="border-0 bg-transparent px-0 text-sm sm:text-base focus-visible:ring-0 resize-none shadow-none py-0.5"
                    />
                  </div>
                )}

                {/* Numbered List */}
                {block.type === "numbered_list" && (
                  <div className="flex gap-2 items-start">
                    <span className="text-primary mt-1 text-xs font-mono font-bold select-none">
                      1.
                    </span>
                    <Textarea
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      onKeyDown={(e) => handleTextareaKeyDown(e, block.id)}
                      placeholder="Each line is a numbered step 1, 2, 3..."
                      rows={Math.max(2, block.content.split("\n").length)}
                      className="border-0 bg-transparent px-0 text-sm sm:text-base focus-visible:ring-0 resize-none shadow-none py-0.5"
                    />
                  </div>
                )}

                {/* Checklist */}
                {block.type === "checklist" && (
                  <div className="flex gap-2.5 items-start">
                    <Checkbox
                      checked={Boolean(block.props?.checked)}
                      onCheckedChange={(val) =>
                        updateBlock(block.id, {
                          props: { ...block.props, checked: Boolean(val) },
                        })
                      }
                      className="mt-1"
                    />
                    <Input
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      onKeyDown={(e) => handleTextareaKeyDown(e, block.id)}
                      placeholder="Checklist task item..."
                      className="border-0 bg-transparent px-0 text-sm focus-visible:ring-0 shadow-none h-auto py-0.5"
                    />
                  </div>
                )}

                {/* Callout Box */}
                {block.type === "callout" && (
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary shrink-0">
                        <Info className="size-4" />
                        <span>Callout box:</span>
                      </div>
                      <Select
                        value={block.props?.variant || "info"}
                        onValueChange={(val) =>
                          updateBlock(block.id, {
                            props: {
                              ...block.props,
                              variant: val as "info" | "warning" | "success" | "danger",
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-32 bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="success">Recommendation</SelectItem>
                          <SelectItem value="danger">Prohibited</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      onKeyDown={(e) => handleTextareaKeyDown(e, block.id)}
                      placeholder="Important notice for members to remember..."
                      rows={2}
                      className="border-0 bg-transparent px-0 text-sm focus-visible:ring-0 resize-none shadow-none py-0"
                    />
                  </div>
                )}

                {/* Code Block */}
                {block.type === "code" && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 space-y-2 text-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400 shrink-0">
                        Code block:
                      </span>
                      <Input
                        value={block.props?.language || "typescript"}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            props: { ...block.props, language: e.target.value },
                          })
                        }
                        placeholder="typescript / json / bash / python"
                        className="h-7 w-36 text-xs bg-slate-900 border-slate-800 font-mono text-slate-300"
                      />
                    </div>
                    <Textarea
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      placeholder="// Paste example code here..."
                      rows={4}
                      className="border-0 bg-transparent p-0 font-mono text-xs sm:text-sm text-slate-200 focus-visible:ring-0 resize-y"
                    />
                  </div>
                )}

                {/* Quote */}
                {block.type === "quote" && (
                  <div className="border-l-4 border-primary pl-3 py-1">
                    <Textarea
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      onKeyDown={(e) => handleTextareaKeyDown(e, block.id)}
                      placeholder="Quote from leadership, motto or philosophy..."
                      rows={2}
                      className="border-0 bg-transparent px-0 text-sm sm:text-base italic focus-visible:ring-0 resize-none shadow-none py-0"
                    />
                  </div>
                )}

                {/* Divider */}
                {block.type === "divider" && (
                  <Separator className="my-3" />
                )}

                {/* Single Image */}
                {block.type === "image" && (
                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <FileImage className="size-4 text-primary" />
                        <span>Illustration Image</span>
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={uploadingBlockId === block.id}
                        onClick={() => {
                          setActiveUploadTarget({ blockId: block.id, isGallery: false });
                          fileInputRef.current?.click();
                        }}
                        className="gap-1.5 text-xs cursor-pointer"
                      >
                        <UploadCloud className="size-3.5" />
                        <span>
                          {uploadingBlockId === block.id
                            ? "Uploading image..."
                            : "Upload from device"}
                        </span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={block.props?.imageUrl || ""}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            props: { ...block.props, imageUrl: e.target.value },
                          })
                        }
                        placeholder="Or paste direct image URL..."
                        className="text-xs h-8"
                      />
                      <Input
                        value={block.props?.caption || ""}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            props: { ...block.props, caption: e.target.value },
                          })
                        }
                        placeholder="Image caption..."
                        className="text-xs h-8"
                      />
                    </div>

                    {block.props?.imageUrl && (
                      <div className="relative mt-2 max-h-56 overflow-hidden rounded-lg border border-border bg-muted/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={block.props.imageUrl}
                          alt={block.props.caption || "Illustration image"}
                          className="w-full max-h-56 object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Multi-Image Gallery */}
                {block.type === "gallery" && (
                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 shrink-0">
                        <Images className="size-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                          Image Gallery
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={uploadingBlockId === block.id}
                        onClick={() => {
                          setActiveUploadTarget({ blockId: block.id, isGallery: true });
                          fileInputRef.current?.click();
                        }}
                        className="gap-1.5 text-xs cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Add image</span>
                      </Button>
                    </div>

                    <Input
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      placeholder="Gallery title (e.g. Hackathon 2026 Photos)..."
                      className="text-xs h-8"
                    />

                    {/* Gallery Thumbnails List */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                      {(block.props?.galleryImages || []).map((img, imgIdx) => (
                        <div
                          key={img.id || imgIdx}
                          className="relative rounded-lg border border-border overflow-hidden bg-muted/30 group/img space-y-1 p-1.5"
                        >
                          <div className="aspect-[4/3] rounded overflow-hidden bg-black/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={img.caption || "Gallery image"}
                              className="size-full object-cover"
                            />
                          </div>
                          <Input
                            value={img.caption || ""}
                            onChange={(e) => {
                              const nextList = [...(block.props?.galleryImages || [])];
                              nextList[imgIdx] = { ...nextList[imgIdx], caption: e.target.value };
                              updateBlock(block.id, {
                                props: { ...block.props, galleryImages: nextList },
                              });
                            }}
                            placeholder="Image caption..."
                            className="text-[11px] h-6 px-1.5"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextList = (block.props?.galleryImages || []).filter(
                                (_, idx) => idx !== imgIdx
                              );
                              updateBlock(block.id, {
                                props: { ...block.props, galleryImages: nextList },
                              });
                            }}
                            className="absolute top-2 right-2 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer shadow-sm"
                            title="Delete this image"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add by URL card */}
                      <div className="rounded-lg border border-dashed border-border p-2 flex flex-col justify-center items-center gap-1.5 text-center min-h-[100px]">
                        <p className="text-[11px] text-muted-foreground">
                          Or add image URL:
                        </p>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const input = form.elements.namedItem("urlInput") as HTMLInputElement;
                            if (input && input.value.trim()) {
                              const currentList = block.props?.galleryImages || [];
                              updateBlock(block.id, {
                                props: {
                                  ...block.props,
                                  galleryImages: [
                                    ...currentList,
                                    {
                                      id: `img_${Date.now()}`,
                                      url: input.value.trim(),
                                      caption: "",
                                    },
                                  ],
                                },
                              });
                              input.value = "";
                            }
                          }}
                          className="flex gap-1 w-full"
                        >
                          <Input
                            name="urlInput"
                            placeholder="https://..."
                            className="text-[11px] h-6 px-1.5"
                          />
                          <Button type="submit" size="xs" variant="secondary" className="h-6 text-[11px]">
                            Add
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                )}

                {/* Embedded Video */}
                {block.type === "video" && (
                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Youtube className="size-4 text-red-500" />
                      <span className="text-xs font-semibold text-foreground">
                        Embedded Video (YouTube or MP4 link)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={block.content}
                        onChange={(e) =>
                          updateBlock(block.id, { content: e.target.value })
                        }
                        placeholder="Video title..."
                        className="text-xs h-8"
                      />
                      <Input
                        value={block.props?.videoUrl || ""}
                        onChange={(e) =>
                          updateBlock(block.id, {
                            props: { ...block.props, videoUrl: e.target.value },
                          })
                        }
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                )}

                {/* Data Table */}
                {block.type === "table" && (
                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2 shrink-0">
                        <TableIcon className="size-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                          Data Table
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            const table = block.props?.tableData || { headers: [], rows: [] };
                            const newHeaders = [...table.headers, `Column ${table.headers.length + 1}`];
                            const newRows = table.rows.map((r) => [...r, ""]);
                            updateBlock(block.id, {
                              props: {
                                ...block.props,
                                tableData: { headers: newHeaders, rows: newRows },
                              },
                            });
                          }}
                          className="h-7 text-xs cursor-pointer"
                        >
                          + Column
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            const table = block.props?.tableData || { headers: [], rows: [] };
                            const newRows = [...table.rows, new Array(table.headers.length).fill("")];
                            updateBlock(block.id, {
                              props: {
                                ...block.props,
                                tableData: { ...table, rows: newRows },
                              },
                            });
                          }}
                          className="h-7 text-xs cursor-pointer"
                        >
                          + Row
                        </Button>
                      </div>
                    </div>

                    <Input
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      placeholder="Table title (e.g. Member Tier Comparison)..."
                      className="text-xs h-8"
                    />

                    {/* Table Editor Grid */}
                    {block.props?.tableData && (
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-xs border-collapse">
                          <thead className="bg-muted/40 border-b border-border">
                            <tr>
                              {block.props.tableData.headers.map((h, hIdx) => (
                                <th key={hIdx} className="p-1.5 border-r border-border last:border-0">
                                  <Input
                                    value={h}
                                    onChange={(e) => {
                                      const nextHeaders = [...block.props!.tableData!.headers];
                                      nextHeaders[hIdx] = e.target.value;
                                      updateBlock(block.id, {
                                        props: {
                                          ...block.props,
                                          tableData: {
                                            ...block.props!.tableData!,
                                            headers: nextHeaders,
                                          },
                                        },
                                      });
                                    }}
                                    className="h-7 text-xs font-semibold bg-background"
                                  />
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {block.props.tableData.rows.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-1.5 border-r border-border last:border-0">
                                    <Input
                                      value={cell}
                                      onChange={(e) => {
                                        const nextRows = block.props!.tableData!.rows.map((r) => [...r]);
                                        nextRows[rIdx][cIdx] = e.target.value;
                                        updateBlock(block.id, {
                                          props: {
                                            ...block.props,
                                            tableData: {
                                              ...block.props!.tableData!,
                                              rows: nextRows,
                                            },
                                          },
                                        });
                                      }}
                                      className="h-7 text-xs bg-background"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 2-Column Comparison */}
                {block.type === "comparison" && (
                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Columns2 className="size-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        2-Column Visual Comparison
                      </span>
                    </div>

                    <Input
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(block.id, { content: e.target.value })
                      }
                      placeholder="Comparison title..."
                      className="text-xs h-8"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Left Column */}
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" />
                          <Input
                            value={block.props?.comparisonData?.leftTitle || "Do / Recommended"}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                props: {
                                  ...block.props,
                                  comparisonData: {
                                    leftTitle: e.target.value,
                                    leftPoints: block.props?.comparisonData?.leftPoints || [],
                                    rightTitle: block.props?.comparisonData?.rightTitle || "Avoid / Caution",
                                    rightPoints: block.props?.comparisonData?.rightPoints || [],
                                  },
                                },
                              })
                            }
                            className="h-6 text-xs font-semibold bg-background"
                          />
                        </div>
                        <Textarea
                          value={(block.props?.comparisonData?.leftPoints || []).join("\n")}
                          onChange={(e) => {
                            const points = e.target.value.split("\n").filter(Boolean);
                            updateBlock(block.id, {
                              props: {
                                ...block.props,
                                comparisonData: {
                                  leftTitle: block.props?.comparisonData?.leftTitle || "Do / Recommended",
                                  leftPoints: points,
                                  rightTitle: block.props?.comparisonData?.rightTitle || "Avoid / Caution",
                                  rightPoints: block.props?.comparisonData?.rightPoints || [],
                                },
                              },
                            });
                          }}
                          placeholder="Each line is a recommendation..."
                          rows={3}
                          className="text-xs bg-background"
                        />
                      </div>

                      {/* Right Column */}
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                          <XCircle className="size-3.5" />
                          <Input
                            value={block.props?.comparisonData?.rightTitle || "Avoid / Caution"}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                props: {
                                  ...block.props,
                                  comparisonData: {
                                    leftTitle: block.props?.comparisonData?.leftTitle || "Do / Recommended",
                                    leftPoints: block.props?.comparisonData?.leftPoints || [],
                                    rightTitle: e.target.value,
                                    rightPoints: block.props?.comparisonData?.rightPoints || [],
                                  },
                                },
                              })
                            }
                            className="h-6 text-xs font-semibold bg-background"
                          />
                        </div>
                        <Textarea
                          value={(block.props?.comparisonData?.rightPoints || []).join("\n")}
                          onChange={(e) => {
                            const points = e.target.value.split("\n").filter(Boolean);
                            updateBlock(block.id, {
                              props: {
                                ...block.props,
                                comparisonData: {
                                  leftTitle: block.props?.comparisonData?.leftTitle || "Do / Recommended",
                                  leftPoints: block.props?.comparisonData?.leftPoints || [],
                                  rightTitle: block.props?.comparisonData?.rightTitle || "Avoid / Caution",
                                  rightPoints: points,
                                },
                              },
                            });
                          }}
                          placeholder="Each line is a caution..."
                          rows={3}
                          className="text-xs bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Block Inserter Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/60">
        <span className="text-xs font-medium text-muted-foreground mr-1">
          + Quick Insert:
        </span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => addBlockAfter(blocks.length - 1, "paragraph")}
          className="text-xs h-7 gap-1.5 cursor-pointer"
        >
          <Type className="size-3" />
          <span>Paragraph</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => addBlockAfter(blocks.length - 1, "heading_2")}
          className="text-xs h-7 gap-1.5 cursor-pointer"
        >
          <Heading2 className="size-3 text-primary" />
          <span>Heading H2</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => addBlockAfter(blocks.length - 1, "heading_3")}
          className="text-xs h-7 gap-1.5 cursor-pointer"
        >
          <Heading3 className="size-3 text-primary/80" />
          <span>Heading H3</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => addBlockAfter(blocks.length - 1, "bullet_list")}
          className="text-xs h-7 gap-1.5 cursor-pointer"
        >
          <List className="size-3" />
          <span>Bullet List</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => addBlockAfter(blocks.length - 1, "table")}
          className="text-xs h-7 gap-1.5 cursor-pointer"
        >
          <TableIcon className="size-3 text-blue-500" />
          <span>Table</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => addBlockAfter(blocks.length - 1, "comparison")}
          className="text-xs h-7 gap-1.5 cursor-pointer"
        >
          <Columns2 className="size-3 text-emerald-500" />
          <span>2-Column Comparison</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => addBlockAfter(blocks.length - 1, "gallery")}
          className="text-xs h-7 gap-1.5 cursor-pointer"
        >
          <Images className="size-3 text-purple-500" />
          <span>Image Gallery</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => addBlockAfter(blocks.length - 1, "video")}
          className="text-xs h-7 gap-1.5 cursor-pointer"
        >
          <Video className="size-3 text-red-500" />
          <span>Video</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => addBlockAfter(blocks.length - 1, "callout")}
          className="text-xs h-7 gap-1.5 cursor-pointer"
        >
          <Info className="size-3 text-amber-500" />
          <span>Callout</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => addBlockAfter(blocks.length - 1, "code")}
          className="text-xs h-7 gap-1.5 cursor-pointer"
        >
          <Code className="size-3" />
          <span>Code</span>
        </Button>
      </div>
    </div>
  );
}
