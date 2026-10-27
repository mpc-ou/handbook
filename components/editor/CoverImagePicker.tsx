"use client";

import React, { useRef, useState } from "react";
import { ArticleCover, VECTOR_PATTERNS } from "@/components/ui/ArticleCover";
import { ImageCropDialog } from "@/components/editor/ImageCropDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Crop,
  Dice5,
  Image as ImageIcon,
  Link2,
  Palette,
  Trash2,
  Upload,
} from "lucide-react";

interface CoverImagePickerProps {
  value?: string;
  articleTitle: string;
  onChange: (url: string) => void;
}

export function CoverImagePicker({
  value,
  articleTitle,
  onChange,
}: CoverImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customUrl, setCustomUrl] = useState(
    value && !value.startsWith("preset:") ? value : ""
  );
  const [cropSource, setCropSource] = useState<string>("");
  const [cropOpen, setCropOpen] = useState(false);

  const isPreset = value?.startsWith("preset:");
  const activePresetId = isPreset ? value?.replace("preset:", "") : null;

  const handleSelectPreset = (patternId: string) => {
    onChange(`preset:${patternId}`);
  };

  const handleRandomize = () => {
    const randomPattern =
      VECTOR_PATTERNS[Math.floor(Math.random() * VECTOR_PATTERNS.length)];
    onChange(`preset:${randomPattern.id}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        `Cover image (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 5MB size limit.`
      );
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCropSource(reader.result);
        setCropOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleOpenCropForUrl = () => {
    const target = customUrl.trim();
    if (!target) return;
    setCropSource(target);
    setCropOpen(true);
  };

  return (
    <div className="space-y-2">
      {/* 3:1 Aspect Ratio Banner with Hover Controls */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card group">
        <ArticleCover
          coverImage={value}
          seedId={activePresetId || articleTitle || "mpc-editor"}
          title={articleTitle}
          aspectRatio="3/1"
        />

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-2 p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <Button
            type="button"
            size="xs"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer shadow-sm"
          >
            <Upload className="size-3.5 mr-1.5" />
            <span>Upload Cover</span>
          </Button>

          {value && !value.startsWith("preset:") && (
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() => {
                setCropSource(value);
                setCropOpen(true);
              }}
              className="cursor-pointer shadow-sm"
            >
              <Crop className="size-3.5 mr-1.5" />
              <span>Crop 3:1</span>
            </Button>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                className="cursor-pointer shadow-sm"
              >
                <Palette className="size-3.5 mr-1.5" />
                <span>Patterns</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-3">
              <Tabs defaultValue="presets" className="space-y-3">
                <div className="flex items-center justify-between">
                  <TabsList className="h-7">
                    <TabsTrigger value="presets" className="text-xs px-2.5">
                      Presets
                    </TabsTrigger>
                    <TabsTrigger value="url" className="text-xs px-2.5">
                      Image URL
                    </TabsTrigger>
                  </TabsList>

                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleRandomize}
                    className="text-xs text-primary cursor-pointer"
                  >
                    <Dice5 className="size-3.5 mr-1" />
                    <span>Randomize</span>
                  </Button>
                </div>

                <TabsContent value="presets" className="mt-0">
                  <div className="grid grid-cols-2 gap-2">
                    {VECTOR_PATTERNS.map((p) => {
                      const isSelected = activePresetId === p.id;
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => handleSelectPreset(p.id)}
                          className={`flex flex-col items-start p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div
                            className={`w-full h-6 rounded bg-gradient-to-r ${p.gradient} mb-1.5`}
                          />
                          <span className="text-xs font-medium text-foreground truncate w-full capitalize">
                            {p.id.replace("pattern-", "Pattern ")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="url" className="mt-0 space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Paste image URL to crop at 3:1 ratio
                  </Label>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="https://..."
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      size="xs"
                      onClick={handleOpenCropForUrl}
                      disabled={!customUrl.trim()}
                      className="shrink-0 h-8 cursor-pointer"
                    >
                      <Link2 className="size-3.5 mr-1" />
                      <span>Crop 3:1</span>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </PopoverContent>
          </Popover>

          {value && (
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              onClick={() => {
                setCustomUrl("");
                onChange("");
              }}
              className="cursor-pointer shadow-sm"
              title="Reset cover"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageSrc={cropSource}
        onCropComplete={(croppedUrl) => onChange(croppedUrl)}
      />
    </div>
  );
}
