"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export interface LightboxItem {
  url: string;
  caption?: string;
  alt?: string;
}

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  items: LightboxItem[];
  initialIndex?: number;
}

export function Lightbox({
  open,
  onClose,
  items,
  initialIndex = 0,
}: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
    }
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        setZoom(1);
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        setZoom(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, items.length, onClose]);

  if (!open || items.length === 0) return null;

  const currentItem = items[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    setZoom(1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    setZoom(1);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 backdrop-blur-md p-4 text-white animate-in fade-in-0 duration-200 select-none"
    >
      {/* Top Controls Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl flex items-center justify-between py-2 px-4 z-10"
      >
        <div className="flex items-center gap-3 text-sm font-mono text-zinc-300">
          <span>
            {currentIndex + 1} / {items.length}
          </span>
          {currentItem.caption && (
            <span className="hidden sm:inline text-zinc-400 truncate max-w-md">
              {currentItem.caption}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
            className="text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
            className="text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer ml-2"
            title="Close (Esc)"
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex-1 w-full max-w-6xl flex items-center justify-center overflow-hidden my-auto"
      >
        {items.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-10 size-10 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white cursor-pointer"
            title="Previous image (←)"
          >
            <ChevronLeft className="size-6" />
          </Button>
        )}

        {/* Image */}
        <div
          className="transition-transform duration-200 max-h-[80vh] flex items-center justify-center"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentItem.url}
            alt={currentItem.alt || currentItem.caption || "Expanded image"}
            className="max-h-[78vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
        </div>

        {items.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-10 size-10 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white cursor-pointer"
            title="Next image (→)"
          >
            <ChevronRight className="size-6" />
          </Button>
        )}
      </div>

      {/* Bottom Caption Pill */}
      {currentItem.caption && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="sm:hidden px-4 py-2 rounded-full bg-zinc-900/80 text-xs text-zinc-300 text-center max-w-md truncate mb-2"
        >
          {currentItem.caption}
        </div>
      )}
    </div>
  );
}
