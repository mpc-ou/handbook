"use client";

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollTrackerProps {
  articleId: string;
  requireScroll: boolean;
  initialScrolled: boolean;
  minReadSeconds?: number;
  onScrollVerified: () => Promise<void>;
}

export function ScrollTracker({
  articleId,
  requireScroll,
  initialScrolled,
  onScrollVerified,
}: ScrollTrackerProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [hasScrolled, setHasScrolled] = useState(initialScrolled);
  const verifyingRef = useRef(false);

  // Trigger verification immediately as soon as bottom of article is reached
  useEffect(() => {
    if (hasScrolled || !requireScroll) return;

    const triggerVerified = () => {
      if (verifyingRef.current || hasScrolled) return;
      verifyingRef.current = true;
      setHasScrolled(true);
      onScrollVerified().catch(() => {
        verifyingRef.current = false;
      });
    };

    // 1. Intersection Observer on sentinel element
    let observer: IntersectionObserver | null = null;
    if (sentinelRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            triggerVerified();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(sentinelRef.current);
    }

    // 2. Window scroll event listener as fallback (e.g. mobile bouncing or short content)
    const handleScroll = () => {
      const docEl = document.documentElement;
      const scrollTop = docEl.scrollTop || document.body.scrollTop;
      const scrollHeight = docEl.scrollHeight;
      const clientHeight = docEl.clientHeight;

      // If user is within 120px of the bottom or page is shorter than screen
      if (scrollTop + clientHeight >= scrollHeight - 120) {
        triggerVerified();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Check immediately on mount in case the article content fits entirely on screen
    handleScroll();

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [hasScrolled, requireScroll, articleId, onScrollVerified]);

  if (!requireScroll) return null;

  return (
    <div ref={sentinelRef} className="relative my-6 select-none">
      {hasScrolled ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] px-4 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            <span className="font-medium">
              You have finished reading this lesson.
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Reading requirement recorded
          </span>
        </div>
      ) : (
        /* Minimal sentinel spacer when not yet scrolled */
        <div className="h-4 w-full" aria-hidden="true" />
      )}
    </div>
  );
}
