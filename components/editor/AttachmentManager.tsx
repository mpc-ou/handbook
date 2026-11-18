"use client";

import React, { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ItemAttachment, AttachmentType } from "@/types";
import { uploadToCloudinary, MAX_FILE_SIZE_BYTES } from "@/lib/cloudinary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getYoutubeEmbedUrl } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  FileText,
  FolderGit2,
  HardDrive,
  Link as LinkIcon,
  Loader2,
  ExternalLink,
  Plus,
  Trash2,
  UploadCloud,
  Youtube,
} from "lucide-react";

interface AttachmentManagerProps {
  attachments: ItemAttachment[];
  onChange: (items: ItemAttachment[]) => void;
}

function normalizeUrl(raw: string): string {
  const v = raw.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
}

function getPreviewSrc(item: ItemAttachment): { kind: "image" | "frame"; src: string } | null {
  const url = item.url;
  if (/\.(png|jpe?g|gif|webp|svg|avif)([?#]|$)/i.test(url)) return { kind: "image", src: url };
  const yt = getYoutubeEmbedUrl(url);
  if (yt) return { kind: "frame", src: yt };
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (drive) return { kind: "frame", src: `https://drive.google.com/file/d/${drive[1]}/preview` };
  if (/\.pdf([?#]|$)/i.test(url)) return { kind: "frame", src: url };
  if (item.type === "figma") return { kind: "frame", src: `https://www.figma.com/embed?embed_host=mpc&url=${encodeURIComponent(url)}` };
  return null;
}

export function AttachmentManager({
  attachments,
  onChange,
}: AttachmentManagerProps) {
  const t = useTranslations("editor.attachment");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<ItemAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const detectType = (link: string): AttachmentType => {
    const lower = link.toLowerCase();
    if (lower.includes("youtube.com") || lower.includes("youtu.be"))
      return "youtube";
    if (lower.includes("drive.google.com") || lower.includes("docs.google.com"))
      return "drive";
    if (lower.includes("figma.com")) return "figma";
    if (lower.includes("github.com")) return "github";
    return "external";
  };

  const handleAdd = () => {
    if (!title.trim() || !url.trim()) return;
    setUploadError(null);
    const newItem: ItemAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: detectType(url),
      title: title.trim(),
      url: normalizeUrl(url),
    };
    onChange([...attachments, newItem]);
    setTitle("");
    setUrl("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError(
        t("fileSizeError", {
          name: file.name,
          size: sizeMb,
        })
      );
      e.target.value = "";
      return;
    }

    try {
      setIsUploading(true);
      const secureUrl = await uploadToCloudinary(file);
      const newItem: ItemAttachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: "external",
        title: file.name,
        url: secureUrl,
      };
      onChange([...attachments, newItem]);
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error && err.message ? err.message : t("uploadFailed")
      );
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter((item) => item.id !== id));
  };

  return (
    <Card className="border border-border/80 bg-card/70 shadow-xs">
      <CardContent className="space-y-4 px-2 pb-5">
        {/* Input Controls */}
        <div className="flex flex-col gap-2.5 sm:flex-row items-stretch sm:items-center">
          <Input
            type="text"
            placeholder={t("titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="sm:w-2/5 text-xs h-9"
          />
          <Input
            type="url"
            placeholder={t("urlPlaceholder")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 text-xs h-9"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAdd}
            disabled={!title.trim() || !url.trim()}
            className="text-xs shrink-0 cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>{t("addLink")}</span>
          </Button>

          {/* Upload File button */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs shrink-0 cursor-pointer border-dashed"
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UploadCloud className="size-3.5" />
            )}
            <span>{isUploading ? t("uploading") : t("uploadFile")}</span>
          </Button>
        </div>

        {uploadError && (
          <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {uploadError}
          </div>
        )}

        {attachments.length > 0 ? (
          <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
            {attachments.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-background/80 px-3.5 py-2 text-xs transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.type === "youtube" && (
                    <Youtube className="size-4 shrink-0 text-red-500" />
                  )}
                  {item.type === "drive" && (
                    <HardDrive className="size-4 shrink-0 text-blue-500" />
                  )}
                  {item.type === "github" && (
                    <FolderGit2 className="size-4 shrink-0 text-foreground" />
                  )}
                  {item.type === "figma" && (
                    <FileText className="size-4 shrink-0 text-purple-500" />
                  )}
                  {item.type === "external" && (
                    <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    title={t("preview")}
                    className="truncate text-left font-medium text-foreground hover:text-primary hover:underline cursor-pointer"
                  >
                    {item.title}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(item.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                  title={t("remove")}
                  aria-label={t("remove")}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-3 text-xs text-muted-foreground/70 border border-dashed rounded-lg bg-muted/10">
            {t("empty")}
          </div>
        )}
      </CardContent>
      <Dialog open={!!previewItem} onOpenChange={(o) => !o && setPreviewItem(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{previewItem?.title}</DialogTitle>
          </DialogHeader>
          {previewItem &&
            (() => {
              const p = getPreviewSrc(previewItem);
              return p ? (
                p.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.src} alt={previewItem.title} className="max-h-[70vh] w-full rounded-md object-contain" />
                ) : (
                  <iframe
                    src={p.src}
                    title={previewItem.title}
                    className="h-[60vh] w-full rounded-md border"
                    allowFullScreen
                  />
                )
              ) : (
                <p className="text-sm text-muted-foreground">{t("previewUnavailable")}</p>
              );
            })()}
          {previewItem && (
            <a
              href={previewItem.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-4" />
              {t("openNew")}
            </a>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
