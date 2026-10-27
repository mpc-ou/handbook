"use client";

import React, { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
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
import { Crop, RotateCcw, ZoomIn } from "lucide-react";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
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

  return canvas.toDataURL("image/jpeg", 0.9);
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: ImageCropDialogProps) {
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
    if (!croppedAreaPixels || !imageSrc) return;
    setProcessing(true);
    try {
      const dataUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(dataUrl);
      onOpenChange(false);
    } catch {
      // Fallback to raw image if CORS blocks canvas export on external URL
      onCropComplete(imageSrc);
      onOpenChange(false);
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
            <span>Crop Cover Image (3:1 Ratio)</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Drag and zoom to frame the 3:1 banner displayed on lesson cards and headers.
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
            <span>Zoom</span>
          </Label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
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
            <span>Reset</span>
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
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={processing}
            className="cursor-pointer"
          >
            <Crop className="size-3.5 mr-1.5" />
            <span>{processing ? "Processing..." : "Apply 3:1 Crop"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
