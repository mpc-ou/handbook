"use client";

import React, { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Crop, RotateCcw, ZoomIn } from "lucide-react";

export interface CropResult {
  blob: Blob;
  previewUrl: string;
}

export interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (result: CropResult) => void | Promise<void>;
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<CropResult> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = (err) => reject(err);
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const targetWidth = 1200;
  const targetHeight = 400; // Strict 3:1 ratio
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to initialize Canvas image context.");
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error("Canvas toBlob returned null."));
          }
        },
        "image/jpeg",
        0.9
      );
    } catch (err) {
      reject(err);
    }
  });

  const previewUrl = URL.createObjectURL(blob);
  return { blob, previewUrl };
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: ImageCropDialogProps) {
  const t = useTranslations("editor.crop");
  const tActions = useTranslations("common.actions");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleCropComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  const handleConfirm = async () => {
    if (!imageSrc) return;
    if (!croppedAreaPixels) {
      toast.error(t("corsError"));
      return;
    }

    setProcessing(true);
    try {
      const result = await getCroppedImg(imageSrc, croppedAreaPixels);
      onOpenChange(false);
      await onCropComplete(result);
    } catch {
      toast.error(t("corsError"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Crop className="size-4 text-primary" />
            <span>{t("title")}</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-72 sm:h-80 rounded-lg overflow-hidden bg-zinc-950 border border-border">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={3 / 1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
              objectFit="horizontal-cover"
            />
          )}
        </div>

        <div className="flex items-center gap-4 pt-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
            <ZoomIn className="size-3.5" />
            <span>{t("zoom")}</span>
          </Label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            aria-label={t("zoom")}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary cursor-pointer"
          />
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setCrop({ x: 0, y: 0 });
              setZoom(1);
            }}
            className="text-xs cursor-pointer"
          >
            <RotateCcw className="size-3 mr-1" />
            <span>{t("reset")}</span>
          </Button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            {tActions("cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={processing}
            className="cursor-pointer"
          >
            <Crop className="size-3.5 mr-1.5" />
            <span>{processing ? t("processing") : t("apply")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
