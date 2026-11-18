/* Fox mascot art & original NPC logic © 2026 MPClub (MIT) — ported to React. */

export const COMPANION_STORAGE_KEYS = {
  HIDDEN: "mpc_companion_hidden",
  GREETED: "mpc_companion_greeted",
} as const;

export const COMPANION_EVENTS = {
  EVENT: "mpc:companion",
  TOGGLE: "mpc:companion-toggle",
} as const;

export type TimeOfDayKey = "morning" | "noon" | "afternoon" | "evening" | "late";

export type CompanionItemType = "CONTENT" | "QUIZ" | "ASSIGNMENT";

export type CompanionEventDetail =
  | { type: "item_completed"; itemType?: CompanionItemType | string }
  | { type: "quiz_passed"; score?: number }
  | { type: "quiz_failed"; score?: number }
  | { type: "assignment_submitted" }
  | { type: "course_completed" }
  | { type: "streak"; days?: number };

export const TIP_KEYS = [
  "tips.1",
  "tips.2",
  "tips.3",
  "tips.4",
  "tips.5",
  "tips.6",
] as const;

export const NUDGE_KEYS = ["nudges.1", "nudges.2"] as const;

const EVENT_POOLS = {
  itemCompleted: [
    "events.itemCompleted.1",
    "events.itemCompleted.2",
    "events.itemCompleted.3",
  ],
  itemCompletedQuiz: [
    "events.itemCompletedQuiz.1",
    "events.itemCompletedQuiz.2",
    "events.itemCompleted.1",
    "events.itemCompleted.2",
  ],
  itemCompletedAssignment: [
    "events.itemCompletedAssignment.1",
    "events.itemCompletedAssignment.2",
    "events.itemCompleted.1",
    "events.itemCompleted.2",
  ],
  quizPassed: [
    "events.quizPassed.1",
    "events.quizPassed.2",
    "events.quizPassed.3",
  ],
  quizPassedNoScore: [
    "events.quizPassedNoScore.1",
    "events.quizPassedNoScore.2",
  ],
  quizFailed: [
    "events.quizFailed.1",
    "events.quizFailed.2",
    "events.quizFailed.3",
  ],
  quizFailedNoScore: [
    "events.quizFailedNoScore.1",
    "events.quizFailedNoScore.2",
  ],
  assignmentSubmitted: [
    "events.assignmentSubmitted.1",
    "events.assignmentSubmitted.2",
    "events.assignmentSubmitted.3",
  ],
  courseCompleted: [
    "events.courseCompleted.1",
    "events.courseCompleted.2",
    "events.courseCompleted.3",
  ],
  streak: [
    "events.streak.1",
    "events.streak.2",
    "events.streak.3",
  ],
} as const;

export type ActiveLine =
  | {
      kind: "greeting";
      timeKey: TimeOfDayKey;
      visitKey: "firstVisit" | "welcomeBack";
    }
  | {
      kind: "single";
      key: string;
      values?: Record<string, string | number>;
    };

export type CompanionTranslateFn = (
  key: string,
  values?: Record<string, string | number>
) => string;

/**
 * Checks whether the companion is allowed to appear on the current route.
 * Allowed: "/" and "/learn/*" (except "/learn/*&#47;certificate").
 * Disallowed: "/studio*", "/login", "/learn/*&#47;certificate", and any other route.
 */
export function isCompanionRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/studio") || pathname.startsWith("/login")) {
    return false;
  }
  if (pathname === "/") return true;
  if (pathname === "/learn" || pathname.startsWith("/learn/")) {
    if (
      pathname.endsWith("/certificate") ||
      pathname.includes("/certificate/")
    ) {
      return false;
    }
    return true;
  }
  return false;
}

export function getTimeOfDayKey(date: Date = new Date()): TimeOfDayKey {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 13) return "noon";
  if (hour >= 13 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "late";
}

export function createGreetingLine(isFirstVisit: boolean): ActiveLine {
  return {
    kind: "greeting",
    timeKey: getTimeOfDayKey(),
    visitKey: isFirstVisit ? "firstVisit" : "welcomeBack",
  };
}

export function createTipLine(index: number): ActiveLine {
  const safeIndex = ((index % TIP_KEYS.length) + TIP_KEYS.length) % TIP_KEYS.length;
  return {
    kind: "single",
    key: TIP_KEYS[safeIndex],
  };
}

export function createNudgeLine(index: number): ActiveLine {
  const safeIndex =
    ((index % NUDGE_KEYS.length) + NUDGE_KEYS.length) % NUDGE_KEYS.length;
  return {
    kind: "single",
    key: NUDGE_KEYS[safeIndex],
  };
}

function pickRandomKey(pool: readonly string[], avoidKey?: string): string {
  if (pool.length === 0) return "tips.1";
  if (pool.length === 1) return pool[0];
  const candidates = avoidKey ? pool.filter((k) => k !== avoidKey) : pool;
  const list = candidates.length > 0 ? candidates : pool;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}

export function pickEventLine(
  detail: CompanionEventDetail | null | undefined,
  lastKey?: string
): ActiveLine | null {
  if (!detail || typeof detail !== "object" || !("type" in detail)) {
    return null;
  }

  switch (detail.type) {
    case "item_completed": {
      const pool =
        detail.itemType === "QUIZ"
          ? EVENT_POOLS.itemCompletedQuiz
          : detail.itemType === "ASSIGNMENT"
            ? EVENT_POOLS.itemCompletedAssignment
            : EVENT_POOLS.itemCompleted;
      return {
        kind: "single",
        key: pickRandomKey(pool, lastKey),
      };
    }

    case "quiz_passed": {
      const hasScore =
        typeof detail.score === "number" && Number.isFinite(detail.score);
      if (hasScore) {
        const roundedScore = Math.max(0, Math.min(100, Math.round(detail.score!)));
        return {
          kind: "single",
          key: pickRandomKey(EVENT_POOLS.quizPassed, lastKey),
          values: { score: roundedScore },
        };
      }
      return {
        kind: "single",
        key: pickRandomKey(EVENT_POOLS.quizPassedNoScore, lastKey),
      };
    }

    case "quiz_failed": {
      const hasScore =
        typeof detail.score === "number" && Number.isFinite(detail.score);
      if (hasScore) {
        const roundedScore = Math.max(0, Math.min(100, Math.round(detail.score!)));
        return {
          kind: "single",
          key: pickRandomKey(EVENT_POOLS.quizFailed, lastKey),
          values: { score: roundedScore },
        };
      }
      return {
        kind: "single",
        key: pickRandomKey(EVENT_POOLS.quizFailedNoScore, lastKey),
      };
    }

    case "assignment_submitted": {
      return {
        kind: "single",
        key: pickRandomKey(EVENT_POOLS.assignmentSubmitted, lastKey),
      };
    }

    case "course_completed": {
      return {
        kind: "single",
        key: pickRandomKey(EVENT_POOLS.courseCompleted, lastKey),
      };
    }

    case "streak": {
      const days =
        typeof detail.days === "number" &&
        Number.isFinite(detail.days) &&
        detail.days > 0
          ? Math.round(detail.days)
          : 1;
      return {
        kind: "single",
        key: pickRandomKey(EVENT_POOLS.streak, lastKey),
        values: { days },
      };
    }

    default:
      return null;
  }
}

export function resolveActiveLine(
  t: CompanionTranslateFn,
  line: ActiveLine | null
): string {
  if (!line) return "";
  if (line.kind === "greeting") {
    return `${t(`greeting.${line.timeKey}`)} ${t(`greeting.${line.visitKey}`)}`;
  }
  return t(line.key, line.values);
}

/**
 * Helper to dispatch a companion learning event from anywhere in the client app.
 */
export function dispatchCompanionEvent(detail: CompanionEventDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CompanionEventDetail>(COMPANION_EVENTS.EVENT, { detail })
  );
}

/**
 * Helper to toggle or explicitly set the companion hidden state via window event.
 */
export function toggleCompanion(hidden?: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ hidden?: boolean }>(COMPANION_EVENTS.TOGGLE, {
      detail: typeof hidden === "boolean" ? { hidden } : undefined,
    })
  );
}
