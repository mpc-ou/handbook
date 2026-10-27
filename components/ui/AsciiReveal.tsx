"use client";

import React, { useEffect, useState, useRef } from "react";

interface AsciiRevealProps {
  text: string;
  className?: string;
  scrambleChars?: string;
  durationMs?: number;
}

const DEFAULT_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?/~0123456789";

export function AsciiReveal({
  text,
  className = "",
  scrambleChars = DEFAULT_CHARS,
  durationMs = 600,
}: AsciiRevealProps) {
  const [displayText, setDisplayText] = useState(text);
  const isRevealedRef = useRef(false);

  useEffect(() => {
    if (!text) return;

    let frame = 0;
    const totalFrames = Math.max(15, Math.floor(durationMs / 35));
    const charsLength = text.length;

    const interval = setInterval(() => {
      frame += 1;
      const progress = frame / totalFrames;
      const revealedCount = Math.floor(progress * charsLength);

      let scrambled = "";
      for (let i = 0; i < charsLength; i++) {
        const char = text[i];
        if (char === " " || char === "\n") {
          scrambled += char;
        } else if (i < revealedCount) {
          scrambled += char;
        } else {
          scrambled += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        }
      }

      setDisplayText(scrambled);

      if (frame >= totalFrames) {
        clearInterval(interval);
        setDisplayText(text);
        isRevealedRef.current = true;
      }
    }, 35);

    return () => clearInterval(interval);
  }, [text, durationMs, scrambleChars]);

  return (
    <span className={className} aria-label={text}>
      {displayText}
    </span>
  );
}

