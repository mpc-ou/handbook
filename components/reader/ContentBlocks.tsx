"use client";

/**
 * Render nội dung chương (JSON BlockNote) cho trang đọc, không cần tải BlockNote.
 * Khối danh sách liền nhau được gộp thành <ul>/<ol>; khối con (thụt lề) render lồng.
 */
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCircle2, Copy, ExternalLink, Images, Maximize2, XCircle, Youtube } from "lucide-react";
import type { ContentBlock, ContentInline, ContentStyles, ContentText } from "@/types";
import type { LightboxItem } from "@/components/ui/Lightbox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  getYoutubeEmbedUrl,
  inlineToText,
  isTableContent,
  parseGalleryImages,
  splitLines,
  tableCellContent,
} from "@/lib/content/blocks";
import { calloutStyle } from "@/lib/content/callout-style";

// Màu chữ/nền của BlockNote (tên màu) → giá trị đọc được ở cả nền sáng và tối
const TEXT_COLORS: Record<string, string> = {
  gray: "#8a8a8a", brown: "#a0715a", red: "#e03e3e", orange: "#d9730d", yellow: "#c29a00",
  green: "#2f9a6a", blue: "#2f80d1", purple: "#9065b0", pink: "#d03f8a",
};
const BG_COLORS: Record<string, string> = {
  gray: "rgba(138,138,138,.18)", brown: "rgba(160,113,90,.18)", red: "rgba(224,62,62,.16)",
  orange: "rgba(217,115,13,.16)", yellow: "rgba(234,179,8,.2)", green: "rgba(47,154,106,.16)",
  blue: "rgba(47,128,209,.16)", purple: "rgba(144,101,176,.16)", pink: "rgba(208,63,138,.16)",
};

function colorStyle(text?: unknown, bg?: unknown): React.CSSProperties | undefined {
  const color = typeof text === "string" ? TEXT_COLORS[text] : undefined;
  const backgroundColor = typeof bg === "string" ? BG_COLORS[bg] : undefined;
  return color || backgroundColor ? { color, backgroundColor } : undefined;
}

const ALIGN: Record<string, string> = {
  center: "text-center",
  right: "text-right",
  justify: "text-justify",
};

function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^(https?:|mailto:|tel:)/i.test(h) || h.startsWith("/") || h.startsWith("#")) return h;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(h)) return `https://${h}`; // "example.com" không có giao thức
  return null; // javascript:, data:, …
}

function Styled({ node }: { node: ContentText }) {
  const s: ContentStyles = node.styles ?? {};
  let el: React.ReactNode = node.text;
  if (s.code) {
    el = (
      <code className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-primary">
        {el}
      </code>
    );
  }
  if (s.bold) el = <strong className="font-semibold text-foreground">{el}</strong>;
  if (s.italic) el = <em>{el}</em>;
  if (s.underline) el = <u className="underline-offset-2">{el}</u>;
  if (s.strike) el = <s>{el}</s>;
  const style = colorStyle(s.textColor, s.backgroundColor);
  if (style) el = <span style={style} className="rounded-sm">{el}</span>;
  return <>{el}</>;
}

export function RichText({ content }: { content?: ContentInline[] }) {
  if (!Array.isArray(content)) return null;
  return (
    <>
      {content.map((c, i) => {
        if (c.type !== "link") return <Styled key={i} node={c} />;
        const href = safeHref(c.href);
        const inner = c.content.map((t, j) => <Styled key={j} node={t} />);
        if (!href) return <React.Fragment key={i}>{inner}</React.Fragment>;
        const external = /^https?:/i.test(href);
        return (
          <a
            key={i}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {inner}
            {external && <ExternalLink className="ml-0.5 inline size-3 align-baseline text-primary/70" />}
          </a>
        );
      })}
    </>
  );
}

const inline = (b: ContentBlock) => (Array.isArray(b.content) ? b.content : undefined);
const hasText = (b: ContentBlock) => inlineToText(inline(b)).trim().length > 0;

interface ContentBlocksProps {
  blocks: ContentBlock[];
  onOpenImages: (items: LightboxItem[], index: number) => void;
}

export function ContentBlocks({ blocks, onOpenImages }: ContentBlocksProps) {
  return <BlockList blocks={blocks} onOpenImages={onOpenImages} />;
}

function BlockList({ blocks, onOpenImages }: ContentBlocksProps) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "bulletListItem" || b.type === "numberedListItem" || b.type === "checkListItem") {
      const group: ContentBlock[] = [b];
      while (blocks[i + 1]?.type === b.type) group.push(blocks[++i]);
      out.push(<ListGroup key={b.id} items={group} onOpenImages={onOpenImages} />);
      continue;
    }
    out.push(<Block key={b.id} block={b} onOpenImages={onOpenImages} />);
  }
  return <>{out}</>;
}

function Children({ block, onOpenImages }: { block: ContentBlock; onOpenImages: ContentBlocksProps["onOpenImages"] }) {
  if (!block.children?.length) return null;
  return (
    <div className="mt-2 space-y-3 pl-6">
      <BlockList blocks={block.children} onOpenImages={onOpenImages} />
    </div>
  );
}

function ListGroup({ items, onOpenImages }: { items: ContentBlock[]; onOpenImages: ContentBlocksProps["onOpenImages"] }) {
  const type = items[0].type;

  if (type === "checkListItem") {
    return (
      <div className="space-y-2">
        {items.map((b) => {
          const checked = Boolean(b.props.checked);
          return (
            <div key={b.id}>
              <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-2 text-[0.95em]">
                <Checkbox
                  checked={checked}
                  disabled
                  className="mt-1 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                />
                <span className={cn("whitespace-pre-wrap", checked ? "text-muted-foreground line-through" : "text-foreground/85")}>
                  <RichText content={inline(b)} />
                </span>
              </div>
              <Children block={b} onOpenImages={onOpenImages} />
            </div>
          );
        })}
      </div>
    );
  }

  const ordered = type === "numberedListItem";
  const ListTag = ordered ? "ol" : "ul";
  const start = ordered ? Number(items[0].props.start) || undefined : undefined;
  return (
    <ListTag
      start={start}
      className={cn("space-y-1.5 pl-5 text-foreground/85", ordered ? "list-decimal" : "list-disc")}
    >
      {items.map((b) => (
        <li
          key={b.id}
          className={cn("whitespace-pre-wrap", ALIGN[String(b.props.textAlignment)])}
          style={colorStyle(b.props.textColor, b.props.backgroundColor)}
        >
          <RichText content={inline(b)} />
          {b.children?.length ? (
            <div className="mt-1.5 space-y-1.5 whitespace-normal">
              <BlockList blocks={b.children} onOpenImages={onOpenImages} />
            </div>
          ) : null}
        </li>
      ))}
    </ListTag>
  );
}

function Block({ block: b, onOpenImages }: { block: ContentBlock; onOpenImages: ContentBlocksProps["onOpenImages"] }) {
  const t = useTranslations("reader.content");
  const [copied, setCopied] = useState(false);
  const align = ALIGN[String(b.props.textAlignment)] ?? "";
  const color = colorStyle(b.props.textColor, b.props.backgroundColor);

  switch (b.type) {
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(b.props.level) || 2));
      const Tag = `h${level}` as "h1";
      const cls =
        level === 1
          ? "mt-8 mb-4 text-2xl font-bold tracking-tight sm:text-3xl"
          : level === 2
          ? "mt-7 mb-3 border-b border-border/60 pb-2 text-xl font-semibold tracking-tight"
          : level === 3
          ? "mt-5 mb-2 text-lg font-medium"
          : "mt-4 mb-1.5 text-base font-semibold";
      if (!hasText(b)) return null;
      return (
        <>
          <Tag id={`block-${b.id}`} className={cn("scroll-mt-20 text-foreground", cls, align)} style={color}>
            <RichText content={inline(b)} />
          </Tag>
          <Children block={b} onOpenImages={onOpenImages} />
        </>
      );
    }

    case "paragraph":
      if (!hasText(b) && !b.children?.length) return null;
      return (
        <div>
          <p className={cn("whitespace-pre-wrap text-foreground/85", align)} style={color}>
            <RichText content={inline(b)} />
          </p>
          <Children block={b} onOpenImages={onOpenImages} />
        </div>
      );

    case "quote":
      return (
        <blockquote className="my-3 whitespace-pre-wrap rounded-lg border-l-4 border-primary bg-muted/30 px-4 py-3 italic text-foreground/85">
          <RichText content={inline(b)} />
        </blockquote>
      );

    case "toggleListItem":
      return (
        <details className="group rounded-lg border border-border/70 px-3.5 py-2">
          <summary className="cursor-pointer whitespace-pre-wrap font-medium text-foreground">
            <RichText content={inline(b)} />
          </summary>
          {b.children?.length ? (
            <div className="mt-2 space-y-3">
              <BlockList blocks={b.children} onOpenImages={onOpenImages} />
            </div>
          ) : null}
        </details>
      );

    case "codeBlock": {
      const source = inlineToText(inline(b));
      return (
        <div className="my-4 overflow-hidden rounded-xl border border-border bg-slate-950 text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-1.5 font-mono text-xs text-slate-400">
            <span className="text-slate-300">{String(b.props.language || "code")}</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                navigator.clipboard.writeText(source);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="h-6 cursor-pointer px-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              {copied ? (
                <>
                  <Check className="mr-1 size-3 text-emerald-400" />
                  <span>{t("copied")}</span>
                </>
              ) : (
                <>
                  <Copy className="mr-1 size-3" />
                  <span>{t("copy")}</span>
                </>
              )}
            </Button>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed sm:text-sm">
            <code>{source}</code>
          </pre>
        </div>
      );
    }

    case "divider":
      return <Separator className="my-6" />;

    case "callout": {
      const style = calloutStyle(b.props.variant);
      const Icon = style.icon;
      return (
        <div className={cn("my-3 flex items-start gap-3 rounded-lg border px-3.5 py-2.5", style.box)}>
          <Icon className={cn("mt-0.5 size-4 shrink-0", style.iconColor)} />
          <div className="min-w-0 flex-1 whitespace-pre-wrap text-[0.92em] leading-relaxed text-foreground/90">
            <RichText content={inline(b)} />
          </div>
        </div>
      );
    }

    case "image": {
      const url = String(b.props.url || "");
      if (!url) return null;
      const caption = String(b.props.caption || "");
      const width = Number(b.props.previewWidth) || undefined;
      const alignCls =
        b.props.textAlignment === "center" ? "mx-auto" : b.props.textAlignment === "right" ? "ml-auto" : "";
      return (
        <figure className="my-5 space-y-2">
          <button
            type="button"
            onClick={() => onOpenImages([{ url, caption }], 0)}
            style={{ maxWidth: width }}
            className={cn("group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border border-border bg-muted/30", alignCls)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL tùy ý (Cloudinary hoặc ngoài) */}
            <img
              src={url}
              alt={caption || t("imageAlt")}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="max-h-[480px] w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
            />
            <span className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize2 className="size-3.5" />
            </span>
          </button>
          {caption && <figcaption className="text-center text-xs text-muted-foreground">{caption}</figcaption>}
        </figure>
      );
    }

    case "table": {
      if (!isTableContent(b.content)) return null;
      const headerRows = b.content.headerRows ?? 0;
      const rows = b.content.rows;
      const renderRow = (row: (typeof rows)[number], r: number, header: boolean) => (
        <tr key={r} className={header ? undefined : "transition-colors hover:bg-muted/20"}>
          {row.cells.map((cell, c) => {
            const props = Array.isArray(cell) ? undefined : cell.props;
            const CellTag = header ? "th" : "td";
            return (
              <CellTag
                key={c}
                colSpan={Number(props?.colspan) || undefined}
                rowSpan={Number(props?.rowspan) || undefined}
                style={colorStyle(props?.textColor, props?.backgroundColor)}
                className={cn(
                  "whitespace-pre-wrap px-4 py-2.5 align-top",
                  header
                    ? "text-xs font-semibold text-foreground"
                    : "text-xs leading-relaxed text-foreground/85 sm:text-sm",
                  ALIGN[String(props?.textAlignment)]
                )}
              >
                <RichText content={tableCellContent(cell)} />
              </CellTag>
            );
          })}
        </tr>
      );
      return (
        <div className="my-6 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-left text-sm">
            {headerRows > 0 && (
              <thead className="border-b border-border bg-muted/40">
                {rows.slice(0, headerRows).map((row, r) => renderRow(row, r, true))}
              </thead>
            )}
            <tbody className="divide-y divide-border/60">
              {rows.slice(headerRows).map((row, r) => renderRow(row, r, false))}
            </tbody>
          </table>
        </div>
      );
    }

    case "comparison": {
      const left = splitLines(b.props.leftPoints);
      const right = splitLines(b.props.rightPoints);
      if (!left.length && !right.length) return null;
      const column = (side: "left" | "right", title: string, points: string[]) => (
        <div
          className={cn(
            "space-y-3 rounded-xl border p-4",
            side === "left" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 text-sm font-semibold",
              side === "left" ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
            )}
          >
            {side === "left" ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
            <span>{title}</span>
          </div>
          <ul className="space-y-2 text-xs text-foreground/85 sm:text-sm">
            {points.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className={cn("mt-0.5 shrink-0 font-bold", side === "left" ? "text-emerald-500" : "text-amber-500")}>•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      );
      return (
        <div className="my-6 space-y-3">
          {b.props.title && <p className="text-sm font-semibold text-foreground">{String(b.props.title)}</p>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {column("left", String(b.props.leftTitle || t("comparisonDo")), left)}
            {column("right", String(b.props.rightTitle || t("comparisonAvoid")), right)}
          </div>
        </div>
      );
    }

    case "gallery": {
      const images = parseGalleryImages(b.props.images);
      if (images.length === 0) return null;
      const items: LightboxItem[] = images.map((img) => ({ url: img.url, caption: img.caption }));
      const gridCols =
        images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      return (
        <div className="my-6 space-y-2">
          {b.props.title && (
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Images className="size-4 text-primary" />
              <span>{String(b.props.title)}</span>
            </div>
          )}
          <div className={cn("grid gap-3", gridCols)}>
            {images.map((img, idx) => (
              <button
                type="button"
                key={`${img.url}-${idx}`}
                onClick={() => onOpenImages(items, idx)}
                className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-xl border border-border bg-card"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- URL tùy ý (Cloudinary hoặc ngoài) */}
                <img
                  src={img.url}
                  alt={img.caption || t("galleryImageAlt", { index: idx + 1 })}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/60 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="max-w-[80%] truncate text-xs text-white">
                    {img.caption || t("galleryImageAlt", { index: idx + 1 })}
                  </span>
                  <Maximize2 className="size-3.5 shrink-0 text-white" />
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "youtube": {
      const embed = getYoutubeEmbedUrl(String(b.props.url || ""));
      if (!embed) return null;
      const caption = String(b.props.caption || "");
      return (
        <div className="my-6 space-y-2">
          <div className="space-y-2 overflow-hidden rounded-xl border border-border bg-card p-3">
            {caption && (
              <div className="flex items-center gap-2">
                <Youtube className="size-4 shrink-0 text-red-500" />
                <span className="truncate text-xs font-semibold text-foreground sm:text-sm">{caption}</span>
              </div>
            )}
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                src={embed}
                title={caption || t("videoTitle")}
                className="size-full border-0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      );
    }

    default:
      // Khối chưa biết: vẫn hiện chữ nếu có, không làm vỡ trang
      if (!hasText(b)) return null;
      return (
        <p className={cn("whitespace-pre-wrap", align)}>
          <RichText content={inline(b)} />
        </p>
      );
  }
}
