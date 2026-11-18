"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

const clamp = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  className?: string;
  /** Màu phần đã đầy; mặc định là màu chủ đạo. Khi 100% tự chuyển sang xanh lá. */
  barClassName?: string;
  /** Chiều cao, mặc định h-1.5. */
  heightClassName?: string;
  label?: string;
}

/** Thanh tiến độ mảnh, đầy dần có hiệu ứng lò xo; tôn trọng `prefers-reduced-motion`. */
export function ProgressBar({
  value,
  className,
  barClassName,
  heightClassName = "h-1.5",
  label,
}: ProgressBarProps) {
  const reduce = useReducedMotion();
  const pct = clamp(value);
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("w-full overflow-hidden rounded-full bg-muted", heightClassName, className)}
    >
      <motion.div
        className={cn("h-full rounded-full", pct >= 100 ? "bg-emerald-500" : "bg-primary", barClassName)}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

interface ProgressRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Nội dung ở giữa vòng; mặc định hiện phần trăm. */
  children?: React.ReactNode;
}

/** Vòng tiến độ tròn, nét vẽ dần khi xuất hiện hoặc khi giá trị đổi. */
export function ProgressRing({ value, size = 56, strokeWidth = 5, className, children }: ProgressRingProps) {
  const reduce = useReducedMotion();
  const pct = clamp(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const done = pct >= 100;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className={done ? "stroke-emerald-500" : "stroke-primary"}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 18 }}
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular-nums">
        {children ?? `${Math.round(pct)}%`}
      </span>
    </div>
  );
}

interface CountUpProps {
  value: number;
  className?: string;
  /** Hậu tố, ví dụ "%". */
  suffix?: string;
}

/** Số đếm lên mượt khi giá trị đổi. */
export function CountUp({ value, className, suffix = "" }: CountUpProps) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(reduce ? value : 0);
  const text = useTransform(motionValue, (v) => `${Math.round(v)}${suffix}`);
  const first = useRef(true);

  useEffect(() => {
    if (reduce) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: first.current ? 0.9 : 0.5,
      ease: "easeOut",
    });
    first.current = false;
    return () => controls.stop();
  }, [value, reduce, motionValue]);

  return <motion.span className={cn("tabular-nums", className)}>{text}</motion.span>;
}
