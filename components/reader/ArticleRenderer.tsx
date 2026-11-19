"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import type { ContentBlock, ItemAttachment } from "@/types";
import { ContentBlocks } from "@/components/reader/ContentBlocks";
import { getYoutubeEmbedUrl } from "@/lib/content/blocks";
import type { ReaderFontSize } from "@/components/reader/ReadingSettings";
import { Lightbox, LightboxItem } from "@/components/ui/Lightbox";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  FolderGit2,
  HardDrive,
  Link as LinkIcon,
  Paperclip,
  Youtube,
} from "lucide-react";

interface ArticleRendererProps {
  blocks: ContentBlock[];
  attachments: ItemAttachment[];
  fontSize?: ReaderFontSize;
}

export function ArticleRenderer({
  blocks,
  attachments,
  fontSize = "md",
}: ArticleRendererProps) {
  const t = useTranslations("reader.content");

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxItems, setLightboxItems] = useState<LightboxItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  const proseSizeClass =
    fontSize === "sm"
      ? "text-[15px] leading-7"
      : fontSize === "lg"
      ? "text-lg leading-8"
      : "text-base sm:text-[17px] leading-relaxed";

  return (
    <div className="space-y-6">
      {/* Article Prose Body */}
      <div className={cn("space-y-5 text-foreground/90", proseSizeClass)}>
        <ContentBlocks blocks={blocks} onOpenImages={openGallery} />

        {/* Embedded Videos from Attachments */}
        {videoAttachments.length > 0 && (
          <div className="space-y-4 pt-2">
            {videoAttachments.map((vid) => {
              const embedUrl = getYoutubeEmbedUrl(vid.url);
              if (!embedUrl) return null;

              return (
                <div
                  key={vid.id}
                  className="overflow-hidden rounded-xl border border-border bg-card p-3.5 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Youtube className="size-4 text-red-500 shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {vid.title || t("videoTitle")}
                    </span>
                  </div>

                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                    <iframe
                      src={embedUrl}
                      title={vid.title || t("videoTitle")}
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
            <h4 className="text-xs font-semibold text-foreground">
              {t("attachmentsTitle", { count: fileAttachments.length })}
            </h4>
          </div>

          <div className="flex flex-wrap gap-2">
            {fileAttachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 text-xs text-foreground hover:border-primary/60 hover:text-primary transition-colors cursor-pointer group"
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
                {!["drive", "github", "figma", "external"].includes(
                  att.type
                ) && (
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
