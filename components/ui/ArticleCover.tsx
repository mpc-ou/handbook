"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface ArticleCoverProps {
  src?: string | null;
  coverImage?: string | null;
  title: string;
  seedId?: string;
  className?: string;
  aspectRatio?: "3/1" | "16/9" | "auto";
  showLabel?: boolean;
}

const VECTOR_PATTERNS = [
  {
    id: "pattern-code",
    gradient: "from-orange-600 via-amber-600 to-slate-950",
    accent: "#F97316",
    render: () => (
      <g opacity="0.25">
        <path
          d="M30 40L10 60L30 80M70 40L90 60L70 80M55 35L45 85"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="85" cy="25" r="3" fill="currentColor" />
        <circle cx="15" cy="25" r="2" fill="currentColor" />
        <circle cx="50" cy="15" r="2" fill="currentColor" />
      </g>
    ),
  },
  {
    id: "pattern-cube",
    gradient: "from-amber-600 via-orange-500 to-zinc-900",
    accent: "#EA580C",
    render: () => (
      <g opacity="0.3">
        {/* Isometric Cube Wireframe */}
        <path
          d="M50 15L85 35V75L50 95L15 75V35L50 15Z"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <path d="M50 15V55M50 55L85 35M50 55L15 35" stroke="currentColor" strokeWidth="2" />
        <path d="M50 55V95" stroke="currentColor" strokeWidth="2" />
      </g>
    ),
  },
  {
    id: "pattern-mesh",
    gradient: "from-orange-700 via-red-600 to-stone-950",
    accent: "#C2410C",
    render: () => (
      <g opacity="0.2">
        <circle cx="20" cy="30" r="15" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="80" cy="70" r="18" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <line x1="20" y1="30" x2="50" y2="50" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="50" y1="50" x2="80" y2="70" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
      </g>
    ),
  },
  {
    id: "pattern-terminal",
    gradient: "from-zinc-800 via-neutral-900 to-orange-950",
    accent: "#FB923C",
    render: () => (
      <g opacity="0.3">
        <rect x="15" y="20" width="70" height="55" rx="5" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="15" y1="35" x2="85" y2="35" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="23" cy="27.5" r="2" fill="currentColor" />
        <circle cx="30" cy="27.5" r="2" fill="currentColor" />
        <circle cx="37" cy="27.5" r="2" fill="currentColor" />
        <path d="M25 47L33 53L25 59" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="37" y1="59" x2="48" y2="59" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: "pattern-circuit",
    gradient: "from-orange-600 via-stone-900 to-amber-950",
    accent: "#F97316",
    render: () => (
      <g opacity="0.25">
        <path
          d="M10 50H35L45 30H65L75 70H90"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="35" cy="50" r="3" fill="currentColor" />
        <circle cx="65" cy="30" r="3" fill="currentColor" />
        <circle cx="75" cy="70" r="3" fill="currentColor" />
      </g>
    ),
  },
  {
    id: "pattern-galaxy",
    gradient: "from-amber-700 via-neutral-900 to-orange-900",
    accent: "#F59E0B",
    render: () => (
      <g opacity="0.25">
        <polygon points="50,20 62,40 85,42 67,58 73,80 50,67 27,80 33,58 15,42 38,40" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </g>
    ),
  },
];

export function getPatternBySeed(seed: string) {
  const exact = VECTOR_PATTERNS.find((p) => p.id === seed);
  if (exact) return exact;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % VECTOR_PATTERNS.length;
  return VECTOR_PATTERNS[index];
}

export function ArticleCover({
  src,
  coverImage,
  title,
  seedId,
  className,
  aspectRatio = "3/1",
  showLabel = true,
}: ArticleCoverProps) {
  const [imageError, setImageError] = useState(false);

  const isPreset = coverImage?.startsWith("preset:");
  const resolvedSrc = src ?? (isPreset ? undefined : coverImage);
  const resolvedSeed =
    seedId ||
    (isPreset ? coverImage?.replace("preset:", "") : undefined) ||
    title ||
    "mpc-handbook";

  const pattern = getPatternBySeed(resolvedSeed);

  const aspectClass =
    aspectRatio === "3/1"
      ? "aspect-[3/1]"
      : aspectRatio === "16/9"
      ? "aspect-video"
      : "";

  if (resolvedSrc && !imageError) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden bg-muted/40",
          aspectClass,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedSrc}
          alt={title}
          onError={() => setImageError(true)}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-gradient-to-r text-white select-none transition-transform duration-500 group-hover:scale-105",
        pattern.gradient,
        aspectClass,
        className
      )}
    >
      {/* Background SVG vector motif */}
      <svg
        viewBox="0 0 300 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full text-white pointer-events-none"
      >
        <defs>
          <pattern
            id={`grid-${resolvedSeed.replace(/[^a-zA-Z0-9_-]/g, "")}`}
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 12 0 L 0 0 0 12"
              fill="none"
              stroke="white"
              strokeWidth="0.4"
              strokeOpacity="0.08"
            />
          </pattern>
        </defs>
        <rect
          width="300"
          height="100"
          fill={`url(#grid-${resolvedSeed.replace(/[^a-zA-Z0-9_-]/g, "")})`}
        />
        {/* Motif kept at its native 1:1 proportions, anchored to the right third */}
        <g transform="translate(185 -5) scale(1.1)">{pattern.render()}</g>
      </svg>

      {/* MPClub Branding Watermark Overlay */}
      {showLabel && (
        <div className="absolute right-3.5 bottom-2.5 flex items-center gap-1.5 opacity-40 text-[10px] font-mono tracking-wider">
          <span className="size-1.5 rounded-full bg-orange-400" />
          <span>{title ? `MPC - ${title}` : "MPC - Handbook"}</span>
        </div>
      )}
    </div>
  );
}

export { VECTOR_PATTERNS };

