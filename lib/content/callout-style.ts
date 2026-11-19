import { AlertTriangle, CheckCircle2, Info, ShieldAlert, type LucideIcon } from "lucide-react";
import type { CalloutVariant } from "@/types";

/** Dùng chung cho khối callout ở trình soạn và trang đọc. */
export const CALLOUT_VARIANTS: CalloutVariant[] = ["info", "warning", "success", "danger"];

export const CALLOUT_STYLE: Record<CalloutVariant, { icon: LucideIcon; box: string; iconColor: string }> = {
  info: { icon: Info, box: "border-sky-500/30 bg-sky-500/5", iconColor: "text-sky-600 dark:text-sky-400" },
  warning: { icon: AlertTriangle, box: "border-amber-500/30 bg-amber-500/5", iconColor: "text-amber-600 dark:text-amber-400" },
  success: { icon: CheckCircle2, box: "border-emerald-500/30 bg-emerald-500/5", iconColor: "text-emerald-600 dark:text-emerald-400" },
  danger: { icon: ShieldAlert, box: "border-red-500/30 bg-red-500/5", iconColor: "text-red-600 dark:text-red-400" },
};

export function calloutStyle(variant: unknown) {
  return CALLOUT_STYLE[variant as CalloutVariant] ?? CALLOUT_STYLE.info;
}
