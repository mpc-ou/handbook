"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface ScrollTrackerProps {
  itemId: string;
  requireScroll: boolean;
  initialScrolled: boolean;
  onScrollVerified: () => Promise<void>;
}

export function ScrollTracker({
  itemId,
  requireScroll,
  initialScrolled,
  onScrollVerified,
}: ScrollTrackerProps) {
  const t = useTranslations("reader.completion");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [hasScrolled, setHasScrolled] = useState(initialScrolled);
  const verifyingRef = useRef(false);

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

    const handleScroll = () => {
      const docEl = document.documentElement;
      const scrollTop = docEl.scrollTop || document.body.scrollTop;
      const scrollHeight = docEl.scrollHeight;
      const clientHeight = docEl.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 120) {
        triggerVerified();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [hasScrolled, requireScroll, itemId, onScrollVerified]);

  if (!requireScroll) return null;

  return (
    <div ref={sentinelRef} className="my-4 select-none">
      {!hasScrolled && (
        <p className="text-xs text-muted-foreground">{t("scrollHint")}</p>
      )}
    </div>
  );
}
