"use client";

/**
 * Schema BlockNote cho nội dung chương: khối mặc định (trừ audio/file/video vì
 * upload chỉ nhận ảnh) + khối riêng của MPC. Props khối riêng phải là kiểu
 * nguyên thủy, nên danh sách lưu dạng chuỗi (ý so sánh: mỗi dòng một ý; ảnh
 * thư viện: JSON). Trang đọc render lại từ JSON ở `ArticleRenderer`.
 */
import React, { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  Trash2,
  XCircle,
  Youtube,
} from "lucide-react";
import type { CalloutVariant, GalleryImage } from "@/types";
import { getYoutubeEmbedUrl, parseGalleryImages } from "@/lib/content/blocks";
import { cn } from "@/lib/utils";
import { CALLOUT_VARIANTS, calloutStyle } from "@/lib/content/callout-style";

const fieldClass =
  "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none transition-colors hover:border-border focus:border-primary/60 disabled:hover:border-transparent";

// ─── Callout ─────────────────────────────────────────────────────────────────

export const CalloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      variant: { default: "info", values: ["info", "warning", "success", "danger"] as const },
    },
    content: "inline",
  },
  {
    render: function CalloutRender({ block, editor, contentRef }) {
      const t = useTranslations("editor.content");
      const variant = block.props.variant as CalloutVariant;
      const style = calloutStyle(variant);
      const Icon = style.icon;
      const next = CALLOUT_VARIANTS[(CALLOUT_VARIANTS.indexOf(variant) + 1) % CALLOUT_VARIANTS.length];
      return (
        <div className={cn("flex w-full items-start gap-3 rounded-lg border px-3 py-2.5", style.box)}>
          <button
            type="button"
            contentEditable={false}
            disabled={!editor.isEditable}
            title={t("callout.change", { variant: t(`callout.${next}`) })}
            aria-label={t("callout.change", { variant: t(`callout.${next}`) })}
            onClick={() => editor.updateBlock(block, { props: { variant: next } })}
            className={cn("mt-0.5 shrink-0 rounded p-0.5 hover:bg-foreground/5 cursor-pointer disabled:cursor-default", style.iconColor)}
          >
            <Icon className="size-4" />
          </button>
          <div ref={contentRef} className="min-w-0 flex-1" />
        </div>
      );
    },
  }
);

// ─── So sánh Nên / Tránh ─────────────────────────────────────────────────────

export const ComparisonBlock = createReactBlockSpec(
  {
    type: "comparison",
    propSchema: {
      title: { default: "" },
      leftTitle: { default: "" },
      leftPoints: { default: "" },
      rightTitle: { default: "" },
      rightPoints: { default: "" },
    },
    content: "none",
  },
  {
    render: function ComparisonRender({ block, editor }) {
      const t = useTranslations("editor.content.comparison");
      const editable = editor.isEditable;
      const set = (key: keyof typeof block.props) => (value: string) =>
        editor.updateBlock(block, { props: { [key]: value } });

      const column = (
        side: "left" | "right",
        titleKey: "leftTitle" | "rightTitle",
        pointsKey: "leftPoints" | "rightPoints"
      ) => (
        <div
          className={cn(
            "space-y-1.5 rounded-xl border p-3",
            side === "left" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
          )}
        >
          <div className={cn("flex items-center gap-1.5", side === "left" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>
            {side === "left" ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
            <input
              defaultValue={block.props[titleKey]}
              disabled={!editable}
              placeholder={side === "left" ? t("leftDefault") : t("rightDefault")}
              onChange={(e) => set(titleKey)(e.target.value)}
              className={cn(fieldClass, "font-semibold text-inherit")}
            />
          </div>
          <textarea
            defaultValue={block.props[pointsKey]}
            disabled={!editable}
            placeholder={t("pointsPlaceholder")}
            rows={Math.max(3, block.props[pointsKey].split("\n").length)}
            onChange={(e) => set(pointsKey)(e.target.value)}
            className={cn(fieldClass, "resize-none leading-relaxed")}
          />
        </div>
      );

      return (
        <div className="w-full space-y-2" contentEditable={false}>
          <input
            defaultValue={block.props.title}
            disabled={!editable}
            placeholder={t("titlePlaceholder")}
            onChange={(e) => set("title")(e.target.value)}
            className={cn(fieldClass, "font-semibold")}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {column("left", "leftTitle", "leftPoints")}
            {column("right", "rightTitle", "rightPoints")}
          </div>
        </div>
      );
    },
  }
);

// ─── Thư viện ảnh ────────────────────────────────────────────────────────────

export const GalleryBlock = createReactBlockSpec(
  {
    type: "gallery",
    propSchema: {
      title: { default: "" },
      images: { default: "[]" },
    },
    content: "none",
  },
  {
    render: function GalleryRender({ block, editor }) {
      const t = useTranslations("editor.content.gallery");
      const editable = editor.isEditable;
      const images = parseGalleryImages(block.props.images);
      const fileRef = useRef<HTMLInputElement>(null);
      const [uploading, setUploading] = useState(false);

      const save = (next: GalleryImage[]) =>
        editor.updateBlock(block, { props: { images: JSON.stringify(next) } });

      const onFiles = async (files: FileList | null) => {
        if (!files?.length || !editor.uploadFile) return;
        setUploading(true);
        try {
          const added: GalleryImage[] = [];
          for (const file of Array.from(files)) {
            const result = await editor.uploadFile(file, block.id);
            if (typeof result === "string") added.push({ url: result, caption: "" });
          }
          // Đọc lại khối mới nhất: người dùng có thể đã sửa chú thích khi đang tải
          const current = editor.getBlock(block.id);
          const latest = current ? parseGalleryImages(current.props.images as string) : images;
          save([...latest, ...added]);
        } finally {
          setUploading(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      };

      return (
        <div className="w-full space-y-2" contentEditable={false}>
          <input
            defaultValue={block.props.title}
            disabled={!editable}
            placeholder={t("titlePlaceholder")}
            onChange={(e) => editor.updateBlock(block, { props: { title: e.target.value } })}
            className={cn(fieldClass, "font-semibold")}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((img, idx) => (
              <div key={`${img.url}-${idx}`} className="group relative overflow-hidden rounded-lg border border-border bg-muted/30">
                {/* eslint-disable-next-line @next/next/no-img-element -- ảnh Cloudinary/ngoài trong editor */}
                <img src={img.url} alt={img.caption || ""} className="aspect-[4/3] w-full object-cover" />
                <input
                  defaultValue={img.caption}
                  disabled={!editable}
                  placeholder={t("captionPlaceholder")}
                  onChange={(e) =>
                    save(images.map((x, i) => (i === idx ? { ...x, caption: e.target.value } : x)))
                  }
                  className={cn(fieldClass, "rounded-none text-xs")}
                />
                {editable && (
                  <button
                    type="button"
                    onClick={() => save(images.filter((_, i) => i !== idx))}
                    aria-label={t("remove")}
                    className="absolute right-1.5 top-1.5 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
            {editable && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary/60 hover:text-primary cursor-pointer disabled:cursor-wait"
              >
                {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                <span>{uploading ? t("uploading") : t("add")}</span>
              </button>
            )}
          </div>
          {!editable && images.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("empty")}</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      );
    },
  }
);

// ─── YouTube ─────────────────────────────────────────────────────────────────

export const YoutubeBlock = createReactBlockSpec(
  {
    type: "youtube",
    propSchema: {
      url: { default: "" },
      caption: { default: "" },
    },
    content: "none",
  },
  {
    render: function YoutubeRender({ block, editor }) {
      const t = useTranslations("editor.content.youtube");
      const editable = editor.isEditable;
      const embed = block.props.url ? getYoutubeEmbedUrl(block.props.url) : null;
      return (
        <div className="w-full space-y-2 rounded-xl border border-border bg-card p-3" contentEditable={false}>
          <div className="flex items-center gap-2">
            <Youtube className="size-4 shrink-0 text-red-500" />
            <input
              defaultValue={block.props.url}
              disabled={!editable}
              placeholder={t("urlPlaceholder")}
              onChange={(e) => editor.updateBlock(block, { props: { url: e.target.value.trim() } })}
              className={cn(fieldClass, "font-mono text-xs")}
            />
          </div>
          {embed ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                src={embed}
                title={block.props.caption || "YouTube"}
                className="size-full border-0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            block.props.url && <p className="px-2 text-xs text-destructive">{t("invalidUrl")}</p>
          )}
          <input
            defaultValue={block.props.caption}
            disabled={!editable}
            placeholder={t("captionPlaceholder")}
            onChange={(e) => editor.updateBlock(block, { props: { caption: e.target.value } })}
            className={cn(fieldClass, "text-center text-xs text-muted-foreground")}
          />
        </div>
      );
    },
  }
);

// ─── Schema ──────────────────────────────────────────────────────────────────

const { audio, file, video, ...baseBlocks } = defaultBlockSpecs;

export const contentSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...baseBlocks,
    callout: CalloutBlock(),
    comparison: ComparisonBlock(),
    gallery: GalleryBlock(),
    youtube: YoutubeBlock(),
  },
});

export type ContentSchemaEditor = typeof contentSchema.BlockNoteEditor;
