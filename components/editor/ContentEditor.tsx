"use client";

/**
 * Trình soạn nội dung chương (BlockNote). Giá trị là JSON tài liệu BlockNote
 * (`ContentBlock[]`), lưu thẳng vào `Item.content`.
 *
 * - Gõ "/" để chèn khối (khối mặc định + callout, so sánh, thư viện ảnh, YouTube).
 * - Dán: HTML (Google Docs, Notion, web) và Markdown do BlockNote xử lý; HTML của
 *   Word được làm sạch trước (`word-paste.ts`). Ảnh dán/kéo thả tải lên Cloudinary.
 *
 * Chỉ chạy phía client: import qua `next/dynamic` với `ssr: false`.
 */
import "@blocknote/mantine/style.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu, type PartialBlock } from "@blocknote/core";
import { en as bnEn, vi as bnVi } from "@blocknote/core/locales";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Columns2, Images, Info, Lightbulb, X, Youtube } from "lucide-react";
import type { ContentBlock } from "@/types";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useHandbook } from "@/context/HandbookContext";
import { contentSchema, type ContentSchemaEditor } from "./content-schema";
import { cleanWordHtml, isWordHtml } from "./word-paste";

interface ContentEditorProps {
  value: ContentBlock[];
  onChange: (next: ContentBlock[]) => void;
  editable?: boolean;
}

type ContentPartialBlock = PartialBlock<
  typeof contentSchema.blockSchema,
  typeof contentSchema.inlineContentSchema,
  typeof contentSchema.styleSchema
>;

/** Bỏ id rỗng (khối dựng bằng builder) để BlockNote tự sinh id. */
function toPartialBlocks(blocks: ContentBlock[]): ContentPartialBlock[] {
  const strip = (list: ContentBlock[]): unknown[] =>
    list.map(({ id, children, ...rest }) => ({
      ...rest,
      ...(id ? { id } : {}),
      children: strip(children ?? []),
    }));
  return strip(blocks) as ContentPartialBlock[];
}

const TIP_STORAGE_KEY = "mpc_editor_tip_hidden";

export default function ContentEditor({ value, onChange, editable = true }: ContentEditorProps) {
  const locale = useLocale();
  const t = useTranslations("editor.content");
  const { theme } = useHandbook();
  const reduceMotion = useReducedMotion();

  const [showTip, setShowTip] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage.getItem(TIP_STORAGE_KEY) === "true") {
        setShowTip(false);
      }
    } catch {
      // Bỏ qua lỗi truy cập localStorage (private mode / iframe sandbox)
    }
  }, []);

  const handleDismissTip = () => {
    setShowTip(false);
    try {
      window.localStorage.setItem(TIP_STORAGE_KEY, "true");
    } catch {
      // Bỏ qua lỗi truy cập localStorage
    }
  };

  // JSON mà editor phát ra gần nhất: phân biệt "giá trị do editor gửi lên"
  // với "giá trị bị thay từ ngoài" (khôi phục bản nháp, tải lại item).
  const lastEmitted = useRef(JSON.stringify(value));
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const dictionary = useMemo(() => {
    const base = locale === "en" ? bnEn : bnVi;
    return {
      ...base,
      placeholders: {
        ...base.placeholders,
        default: t("placeholder"),
        emptyDocument: t("placeholder"),
      },
    };
  }, [locale, t]);

  const editor = useCreateBlockNote(
    {
      schema: contentSchema,
      dictionary,
      initialContent: value.length > 0 ? toPartialBlocks(value) : undefined,
      tables: { splitCells: true, headers: true },
      uploadFile: async (file: File) => {
        try {
          return await uploadToCloudinary(file);
        } catch (err) {
          toast.error(t("uploadFailed"), {
            description: err instanceof Error ? err.message : undefined,
          });
          throw err;
        }
      },
      pasteHandler: ({ event, editor: ed, defaultPasteHandler }) => {
        const html = event.clipboardData?.getData("text/html");
        if (html && isWordHtml(html)) {
          const cleaned = cleanWordHtml(html);
          ed.pasteHTML(cleaned.html);
          if (cleaned.droppedImages > 0) {
            toast.warning(t("pasteImagesDropped", { count: cleaned.droppedImages }));
          }
          return true;
        }
        return defaultPasteHandler();
      },
    },
    [dictionary]
  );

  // Thay nội dung khi giá trị đổi từ bên ngoài
  useEffect(() => {
    const json = JSON.stringify(value);
    if (json === lastEmitted.current) return;
    lastEmitted.current = json;
    const next: ContentPartialBlock[] = value.length > 0 ? toPartialBlocks(value) : [{ type: "paragraph" }];
    editor.replaceBlocks(editor.document, next);
  }, [editor, value]);

  const slashItems = useMemo(() => buildSlashItems(editor, t), [editor, t]);

  return (
    <div className="mpc-content-editor space-y-2">
      {editable && (
        <AnimatePresence initial={false}>
          {showTip && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5 text-xs text-muted-foreground shadow-2xs">
                <div className="flex items-start gap-2.5 min-w-0">
                  <Lightbulb className="size-4 shrink-0 text-amber-500 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-semibold text-foreground mr-1.5">
                      {t("tipTitle")}:
                    </span>
                    <span>{t("hint")}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDismissTip}
                  className="shrink-0 -mr-1 -mt-0.5 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  title={t("dismissTip")}
                  aria-label={t("dismissTip")}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={theme}
        slashMenu={false}
        onChange={() => {
          const json = JSON.stringify(editor.document);
          lastEmitted.current = json;
          onChangeRef.current(JSON.parse(json) as ContentBlock[]);
        }}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => filterSuggestionItems(slashItems, query)}
        />
      </BlockNoteView>
    </div>
  );
}

function buildSlashItems(
  editor: ContentSchemaEditor,
  t: ReturnType<typeof useTranslations<"editor.content">>
): DefaultReactSuggestionItem[] {
  const group = t("slash.group");
  const custom: DefaultReactSuggestionItem[] = [
    {
      title: t("slash.callout"),
      subtext: t("slash.calloutHint"),
      aliases: ["callout", "note", "ghichu", "luuy", "canhbao"],
      group,
      icon: <Info className="size-4" />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "callout" }),
    },
    {
      title: t("slash.comparison"),
      subtext: t("slash.comparisonHint"),
      aliases: ["compare", "sosanh", "dosdonts"],
      group,
      icon: <Columns2 className="size-4" />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "comparison" }),
    },
    {
      title: t("slash.gallery"),
      subtext: t("slash.galleryHint"),
      aliases: ["gallery", "album", "thuvien", "anh"],
      group,
      icon: <Images className="size-4" />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "gallery" }),
    },
    {
      title: t("slash.youtube"),
      subtext: t("slash.youtubeHint"),
      aliases: ["youtube", "video"],
      group,
      icon: <Youtube className="size-4" />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "youtube" }),
    },
  ];
  return [...getDefaultReactSlashMenuItems(editor), ...custom];
}
