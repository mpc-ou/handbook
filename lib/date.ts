import { format, formatDistanceToNowStrict, isValid } from "date-fns";

/**
 * Safely parse any date input (ISO string, timestamp, Date instance) into a valid Date object or null.
 */
export function parseSafeDate(input: string | number | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isValid(d) ? d : null;
}

/**
 * Standardized Date display across MPC Handbook.
 * Default pattern: "MMM d, yyyy" (e.g. "Oct 27, 2026")
 */
export function formatDate(
  input: string | number | Date | null | undefined,
  pattern = "MMM d, yyyy",
  fallback = "—"
): string {
  const d = parseSafeDate(input);
  if (!d) return fallback;
  try {
    return format(d, pattern);
  } catch {
    return fallback;
  }
}

/**
 * Standardized Date & Time display across tables, logs, and submissions.
 * Default pattern: "MMM d, yyyy, h:mm a" (e.g. "Oct 27, 2026, 10:25 PM")
 */
export function formatDateTime(
  input: string | number | Date | null | undefined,
  pattern = "MMM d, yyyy, h:mm a",
  fallback = "—"
): string {
  const d = parseSafeDate(input);
  if (!d) return fallback;
  try {
    return format(d, pattern);
  } catch {
    return fallback;
  }
}

/**
 * Standardized Time display for editor auto-save timestamps.
 * Default pattern: "h:mm:ss a" (e.g. "10:25:30 PM")
 */
export function formatTime(
  input: string | number | Date | null | undefined,
  pattern = "h:mm:ss a",
  fallback = "—"
): string {
  const d = parseSafeDate(input);
  if (!d) return fallback;
  try {
    return format(d, pattern);
  } catch {
    return fallback;
  }
}

/**
 * Friendly relative time display for discussions and comments.
 * Examples: "just now", "5m ago", "2h ago", "3d ago", or standard date if older than 30 days.
 */
export function formatRelativeTime(
  input: string | number | Date | null | undefined,
  fallback = "just now"
): string {
  const d = parseSafeDate(input);
  if (!d) return fallback;
  try {
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 30000 && diffMs >= 0) {
      return "just now";
    }
    // If older than 30 days, fallback to clean standard date format
    if (diffMs > 30 * 24 * 60 * 60 * 1000) {
      return format(d, "MMM d, yyyy");
    }
    return formatDistanceToNowStrict(d, { addSuffix: true });
  } catch {
    return fallback;
  }
}

