"use client";

import React, { useState } from "react";
import { ArticleAttachment, EditorBlock } from "@/types";
import { FormattedText } from "@/components/reader/FormattedText";
import { Lightbox, LightboxItem } from "@/components/ui/Lightbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderGit2,
  HardDrive,
  Images,
  Info,
  Link as LinkIcon,
  Maximize2,
  Paperclip,
  ShieldAlert,
  XCircle,
  Youtube,
} from "lucide-react";

interface ArticleRendererProps {
  blocks: EditorBlock[];
  attachments: ArticleAttachment[];
}

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function ArticleRenderer({ blocks, attachments }: ArticleRendererProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openSingleImage = (url: string, caption?: string) => {
    setLightboxItems([{ url, caption }]);
    setLightboxIndex(0);
    setLightboxOpen(true);
  };

  const openGallery = (items: LightboxItem[], index: number) => {
    setLightboxItems(items);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const videoAttachments = (attachments || []).filter(
    (att) => att.type === "youtube"
  );
  const fileAttachments = (attachments || []).filter(
    (att) => att.type !== "youtube"
  );

  return (
    <div className="space-y-6">
      {/* Article Prose Body */}
      <div className="space-y-5 text-base leading-7 text-foreground/90">
        {blocks.map((block) => {
          const alignClass =
            block.props?.align === "center"
              ? "text-center"
              : block.props?.align === "right"
              ? "text-right"
              : block.props?.align === "justify"
              ? "text-justify"
              : "text-left";

          switch (block.type) {
            case "heading_1":
              return (
                <h1
                  key={block.id}
                  id={`block-${block.id}`}
                  className={cn(
                    "text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-8 mb-4",
                    alignClass
                  )}
                >
                  <FormattedText text={block.content} />
                </h1>
              );

            case "heading_2":
              return (
                <h2
                  key={block.id}
                  id={`block-${block.id}`}
                  className={cn(
                    "scroll-mt-20 text-xl font-semibold tracking-tight text-foreground mt-7 mb-3 border-b border-border/60 pb-2",
                    alignClass
                  )}
                >
                  <FormattedText text={block.content} />
                </h2>
              );

            case "heading_3":
              return (
                <h3
                  key={block.id}
                  id={`block-${block.id}`}
                  className={cn(
                    "scroll-mt-20 text-lg font-medium text-foreground mt-5 mb-2",
                    alignClass
                  )}
                >
                  <FormattedText text={block.content} />
                </h3>
              );

            case "paragraph":
              return (
                <p
                  key={block.id}
                  className={cn(
                    "text-sm sm:text-base leading-relaxed text-foreground/85",
                    alignClass
                  )}
                >
                  <FormattedText text={block.content} />
                </p>
              );

            case "bullet_list": {
              const items = block.content
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
              return (
                <ul
                  key={block.id}
                  className="list-disc pl-5 space-y-1.5 text-sm sm:text-base text-foreground/85"
                >
                  {items.map((item, i) => (
                    <li key={i} className="leading-relaxed">
                      <FormattedText text={item} />
                    </li>
                  ))}
                </ul>
              );
            }

            case "numbered_list": {
              const items = block.content
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
              return (
                <ol
                  key={block.id}
                  className="list-decimal pl-5 space-y-1.5 text-sm sm:text-base text-foreground/85"
                >
                  {items.map((item, i) => (
                    <li key={i} className="leading-relaxed">
                      <FormattedText text={item} />
                    </li>
                  ))}
                </ol>
              );
            }

            case "checklist": {
              const checked = Boolean(block.props?.checked);
              return (
                <div
                  key={block.id}
                  className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/20 px-3.5 py-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    disabled
                    className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <span
                    className={
                      checked
                        ? "text-foreground font-medium line-through text-muted-foreground"
                        : "text-foreground/85"
                    }
                  >
                    <FormattedText text={block.content} />
                  </span>
                </div>
              );
            }

            case "code":
              return (
                <div
                  key={block.id}
                  className="overflow-hidden rounded-xl border border-border bg-slate-950 text-slate-100 my-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-1.5 text-xs text-slate-400 font-mono">
                    <span className="font-mono text-xs text-slate-300">
                      {block.props?.language || "code"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => handleCopyCode(block.id, block.content)}
                      className="text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer h-6 px-2 text-xs"
                    >
                      {copiedId === block.id ? (
                        <>
                          <Check className="size-3 text-emerald-400 mr-1" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3 mr-1" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="overflow-x-auto p-4 text-xs sm:text-sm font-mono leading-relaxed">
                    <code>{block.content}</code>
                  </pre>
                </div>
              );

            case "callout": {
              const rawVariant = block.props?.variant || "info";
              const alertVariant =
                rawVariant === "danger"
                  ? "destructive"
                  : (rawVariant as "info" | "warning" | "success");

              const Icon = {
                info: Info,
                warning: AlertTriangle,
                success: Check,
                danger: ShieldAlert,
              }[rawVariant];

              return (
                <Alert key={block.id} variant={alertVariant} className="my-3 py-2.5">
                  <Icon className="size-4" />
                  <AlertDescription className="text-foreground/90 text-xs sm:text-sm leading-relaxed">
                    <FormattedText text={block.content} />
                  </AlertDescription>
                </Alert>
              );
            }

            case "quote":
              return (
                <blockquote
                  key={block.id}
                  className="rounded-lg border-l-4 border-primary bg-muted/30 px-4 py-3 italic text-foreground/85 my-3 text-sm sm:text-base"
                >
                  <FormattedText text={block.content} />
                </blockquote>
              );

            case "divider":
              return <Separator key={block.id} className="my-6" />;

            case "image":
              return (
                <figure key={block.id} className="my-5 space-y-2">
                  {block.props?.imageUrl ? (
                    <div
                      onClick={() =>
                        openSingleImage(
                          block.props!.imageUrl!,
                          block.props?.caption
                        )
                      }
                      className="group relative overflow-hidden rounded-xl border border-border bg-muted/30 cursor-pointer shadow-xs"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={block.props.imageUrl}
                        alt={block.props.caption || "Article illustration image"}
                        referrerPolicy="no-referrer"
                        className="w-full max-h-[480px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                      />
                      <div className="absolute top-2 right-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 className="size-3.5" />
                      </div>
                    </div>
                  ) : null}
                  {block.props?.caption && (
                    <figcaption className="text-center text-xs text-muted-foreground">
                      <FormattedText text={block.props.caption} />
                    </figcaption>
                  )}
                </figure>
              );

            case "gallery": {
              const galleryImages = block.props?.galleryImages || [];
              if (galleryImages.length === 0) return null;

              const lightboxList: LightboxItem[] = galleryImages.map((img) => ({
                url: img.url,
                caption: img.caption,
                alt: img.alt,
              }));

              const gridCols =
                galleryImages.length === 1
                  ? "grid-cols-1"
                  : galleryImages.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

              return (
                <div key={block.id} className="my-6 space-y-2">
                  {block.content && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Images className="size-4 text-primary" />
                      <span>{block.content}</span>
                    </div>
                  )}

                  <div className={cn("grid gap-3", gridCols)}>
                    {galleryImages.map((img, idx) => (
                      <div
                        key={img.id || idx}
                        onClick={() => openGallery(lightboxList, idx)}
                        className="group relative overflow-hidden rounded-xl border border-border bg-card cursor-pointer shadow-xs aspect-[4/3]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.alt || img.caption || "Gallery image"}
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                          <span className="text-xs text-white truncate max-w-[80%]">
                            {img.caption || `Image ${idx + 1}`}
                          </span>
                          <Maximize2 className="size-3.5 text-white shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            case "video": {
              const videoUrl = block.props?.videoUrl || block.content;
              const embedUrl = videoUrl ? getYoutubeEmbedUrl(videoUrl) : null;
              if (!embedUrl && !videoUrl) return null;

              return (
                <div key={block.id} className="my-6 space-y-2">
                  <div className="overflow-hidden rounded-xl border border-border bg-card p-3 shadow-xs space-y-2">
                    {block.content && (
                      <div className="flex items-center gap-2">
                        <Youtube className="size-4 text-red-500 shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                          {block.content}
                        </span>
                      </div>
                    )}

                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
                          title={block.content || "Video player"}
                          className="size-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={videoUrl}
                          controls
                          className="size-full"
                        />
                      )}
                    </div>
                  </div>

                  {block.props?.caption && (
                    <p className="text-center text-xs text-muted-foreground">
                      {block.props.caption}
                    </p>
                  )}
                </div>
              );
            }

            case "table": {
              const table = block.props?.tableData;
              if (!table || !table.headers || table.headers.length === 0) {
                return null;
              }

              return (
                <div key={block.id} className="my-6 space-y-2">
                  {block.content && (
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      {block.content}
                    </p>
                  )}
                  <div className="overflow-x-auto rounded-xl border border-border bg-card">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-muted/40 border-b border-border">
                        <tr>
                          {table.headers.map((h, hIdx) => (
                            <th
                              key={hIdx}
                              className="px-4 py-2.5 font-semibold text-foreground text-xs uppercase tracking-wider"
                            >
                              <FormattedText text={h} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {table.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className="px-4 py-2.5 text-foreground/85 text-xs sm:text-sm align-top leading-relaxed"
                              >
                                <FormattedText text={cell} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }

            case "comparison": {
              const comp = block.props?.comparisonData;
              if (!comp) return null;

              return (
                <div key={block.id} className="my-6 space-y-3">
                  {block.content && (
                    <p className="text-sm font-semibold text-foreground">
                      {block.content}
                    </p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column (Recommended / Do) */}
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span>{comp.leftTitle || "Recommended / Do"}</span>
                      </div>
                      <ul className="space-y-2 text-xs sm:text-sm text-foreground/85">
                        {comp.leftPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
                            <span><FormattedText text={point} /></span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Right Column (Caution / Avoid) */}
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                        <XCircle className="size-4 shrink-0" />
                        <span>{comp.rightTitle || "Caution / Avoid"}</span>
                      </div>
                      <ul className="space-y-2 text-xs sm:text-sm text-foreground/85">
                        {comp.rightPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                            <span><FormattedText text={point} /></span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            }

            default:
              return (
                <p key={block.id} className={cn("leading-relaxed", alignClass)}>
                  <FormattedText text={block.content} />
                </p>
              );
          }
        })}

        {/* Embedded Videos from Attachments */}
        {videoAttachments.length > 0 && (
          <div className="space-y-4 pt-2">
            {videoAttachments.map((vid) => {
              const embedUrl = getYoutubeEmbedUrl(vid.url);
              if (!embedUrl) return null;

              return (
                <div
                  key={vid.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-xs p-3.5 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Youtube className="size-4 text-red-500 shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {vid.title || "Lecture Video"}
                    </span>
                  </div>

                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                    <iframe
                      src={embedUrl}
                      title={vid.title}
                      className="size-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compact Files & Resources at End of Article */}
      {fileAttachments.length > 0 && (
        <div className="mt-8 pt-4 border-t border-border/60 space-y-3">
          <div className="flex items-center gap-2">
            <Paperclip className="size-3.5 text-primary" />
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
              Attachments & Resources ({fileAttachments.length})
            </h4>
          </div>

          <div className="flex flex-wrap gap-2">
            {fileAttachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 text-xs text-foreground hover:border-primary/60 hover:text-primary transition-colors cursor-pointer shadow-2xs group"
              >
                {att.type === "drive" && (
                  <HardDrive className="size-3.5 text-blue-500 shrink-0" />
                )}
                {att.type === "github" && (
                  <FolderGit2 className="size-3.5 text-foreground shrink-0" />
                )}
                {(att.type === "figma" || att.type === "external") && (
                  <LinkIcon className="size-3.5 text-amber-500 shrink-0" />
                )}
                {!["drive", "github", "figma", "external"].includes(att.type) && (
                  <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                )}

                <span className="font-medium truncate max-w-[240px]">
                  {att.title}
                </span>

                <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Full-screen Lightbox Dialog */}
      <Lightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        items={lightboxItems}
        initialIndex={lightboxIndex}
      />
    </div>
  );
}
