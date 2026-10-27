"use client";

import React, { useRef, useState } from "react";
import { ArticleAttachment, AttachmentType } from "@/types";
import { uploadToCloudinary, MAX_FILE_SIZE_BYTES } from "@/lib/cloudinary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  FolderGit2,
  HardDrive,
  Link as LinkIcon,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
  UploadCloud,
  Youtube,
} from "lucide-react";

interface AttachmentManagerProps {
  attachments: ArticleAttachment[];
  onChange: (items: ArticleAttachment[]) => void;
}

export function AttachmentManager({
  attachments,
  onChange,
}: AttachmentManagerProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
    const newItem: ArticleAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: detectType(url),
      title: title.trim(),
      url: url.trim(),
    };
    onChange([...attachments, newItem]);
    setTitle("");
    setUrl("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate 5MB limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setUploadError(`File "${file.name}" (${sizeMb}MB) exceeds the 5MB size limit.`);
      e.target.value = "";
      return;
    }

    try {
      setIsUploading(true);
      const secureUrl = await uploadToCloudinary(file);
      const newItem: ArticleAttachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: "external",
        title: file.name,
        url: secureUrl,
      };
      onChange([...attachments, newItem]);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload attachment file.");
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
            placeholder="Link Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="sm:w-2/5 text-xs h-9"
          />
          <Input
            type="url"
            placeholder="Paste Drive, Figma, GitHub, YouTube link..."
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
            <span>Add Link</span>
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
            <span>Upload File (&le;5MB)</span>
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
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {item.title}
                  </a>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(item.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                  title="Remove attachment"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-3 text-xs text-muted-foreground/70 border border-dashed rounded-lg bg-muted/10">
            No attachments added yet. Paste a URL or upload a file directly.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
