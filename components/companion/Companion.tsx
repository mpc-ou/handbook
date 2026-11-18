/* Fox mascot art & original NPC logic © 2026 MPClub (MIT) — ported to React. */
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import "./companion.css";
import {
  type ActiveLine,
  type CompanionEventDetail,
  COMPANION_EVENTS,
  COMPANION_STORAGE_KEYS,
  NUDGE_KEYS,
  TIP_KEYS,
  createGreetingLine,
  createNudgeLine,
  createTipLine,
  isCompanionRoute,
  pickEventLine,
  resolveActiveLine,
} from "./lines";

const POSE_IDLE = "/npc/fox-think.png";
const POSE_TALK = "/npc/fox-idea.png";

const TYPE_MS = 22;
const AUTO_CLOSE_MS = 8000;
const GREET_DELAY_MS = 1000;
const IDLE_MS = 60000;
const MAX_NUDGES = NUDGE_KEYS.length;
const AUTO_COOLDOWN_MS = 4000;
const HOP_DURATION_MS = 460;
const ACTIVITY_THROTTLE_MS = 1000;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (private mode / blocked)
  }
}

function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

export function Companion() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("companion");
  const reducedMotionHook = useReducedMotion();

  const allowedRoute = useMemo(() => isCompanionRoute(pathname), [pathname]);

  const [mounted, setMounted] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [activeLine, setActiveLine] = useState<ActiveLine | null>(null);
  const [isWaving, setIsWaving] = useState(false);
  const [typedProgress, setTypedProgress] = useState<{
    target: string;
    count: number;
  }>({ target: "", count: 0 });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const tipIndexRef = useRef<number>(0);
  const nudgeCountRef = useRef<number>(0);
  const greetedSessionRef = useRef<boolean>(false);
  const lastAutoSpeakAtRef = useRef<number>(0);
  const lastEventKeyRef = useRef<string | undefined>(undefined);
  const lastActivityResetRef = useRef<number>(0);

  const isHiddenRef = useRef<boolean>(isHidden);
  const allowedRouteRef = useRef<boolean>(allowedRoute);
  const activeLineRef = useRef<ActiveLine | null>(activeLine);

  useEffect(() => {
    isHiddenRef.current = isHidden;
  }, [isHidden]);

  useEffect(() => {
    allowedRouteRef.current = allowedRoute;
  }, [allowedRoute]);

  useEffect(() => {
    activeLineRef.current = activeLine;
  }, [activeLine]);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSpeechTimers = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (typeTimerRef.current) {
      clearTimeout(typeTimerRef.current);
      typeTimerRef.current = null;
    }
    if (waveTimerRef.current) {
      clearTimeout(waveTimerRef.current);
      waveTimerRef.current = null;
    }
  }, []);

  const closeBubble = useCallback(() => {
    clearSpeechTimers();
    setActiveLine(null);
    setIsWaving(false);
  }, [clearSpeechTimers]);

  const triggerHop = useCallback(() => {
    if (waveTimerRef.current) {
      clearTimeout(waveTimerRef.current);
    }
    setIsWaving(true);
    waveTimerRef.current = setTimeout(() => {
      setIsWaving(false);
      waveTimerRef.current = null;
    }, HOP_DURATION_MS);
  }, []);

  const sayLine = useCallback(
    (line: ActiveLine, options?: { isAuto?: boolean }): boolean => {
      const now = Date.now();
      if (options?.isAuto) {
        if (now - lastAutoSpeakAtRef.current < AUTO_COOLDOWN_MS) {
          return false;
        }
      }
      lastAutoSpeakAtRef.current = now;

      if (line.kind === "single") {
        lastEventKeyRef.current = line.key;
      }

      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }

      setActiveLine(line);
      triggerHop();

      closeTimerRef.current = setTimeout(() => {
        closeBubble();
      }, AUTO_CLOSE_MS);

      return true;
    },
    [closeBubble, triggerHop]
  );

  const hideMascot = useCallback(() => {
    closeBubble();
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (greetTimerRef.current) {
      clearTimeout(greetTimerRef.current);
      greetTimerRef.current = null;
    }
    writeStorage(COMPANION_STORAGE_KEYS.HIDDEN, "1");
    setIsHidden(true);
  }, [closeBubble]);

  const showMascot = useCallback(
    (withGreeting = true) => {
      removeStorage(COMPANION_STORAGE_KEYS.HIDDEN);
      setIsHidden(false);
      if (withGreeting) {
        greetedSessionRef.current = true;
        writeStorage(COMPANION_STORAGE_KEYS.GREETED, "1");
        sayLine(createGreetingLine(false), { isAuto: false });
      }
    },
    [sayLine]
  );

  const handleNextTip = useCallback(() => {
    const idx = tipIndexRef.current;
    tipIndexRef.current = (idx + 1) % TIP_KEYS.length;
    sayLine(createTipLine(idx), { isAuto: false });
  }, [sayLine]);

  // Mount: read localStorage & preload talking pose image
  useEffect(() => {
    const storedHidden = readStorage(COMPANION_STORAGE_KEYS.HIDDEN) === "1";
    const preloadImg = new window.Image();
    preloadImg.src = POSE_TALK;

    const timer = setTimeout(() => {
      setIsHidden(storedHidden);
      setMounted(true);
    }, 0);

    return () => {
      clearTimeout(timer);
      clearSpeechTimers();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (greetTimerRef.current) clearTimeout(greetTimerRef.current);
    };
  }, [clearSpeechTimers]);

  // Resolve full translated string for the active line
  const fullText = useMemo(() => {
    if (!activeLine) return "";
    // locale is included so switching languages re-resolves the open bubble
    void locale;
    return resolveActiveLine(
      (key, values) => t(key as Parameters<typeof t>[0], values),
      activeLine
    );
  }, [activeLine, locale, t]);

  const fullChars = useMemo(() => Array.from(fullText), [fullText]);

  const isReducedMotion = Boolean(reducedMotionHook);

  // Character-by-character typing effect (22ms/char using Array.from)
  useEffect(() => {
    if (typeTimerRef.current) {
      clearTimeout(typeTimerRef.current);
      typeTimerRef.current = null;
    }

    if (!fullText || isReducedMotion) {
      return;
    }

    const total = fullChars.length;
    let current = 1;

    const step = () => {
      current += 1;
      setTypedProgress({ target: fullText, count: current });
      if (current < total) {
        typeTimerRef.current = setTimeout(step, TYPE_MS);
      } else {
        typeTimerRef.current = null;
      }
    };

    if (total > 1) {
      typeTimerRef.current = setTimeout(step, TYPE_MS);
    }

    return () => {
      if (typeTimerRef.current) {
        clearTimeout(typeTimerRef.current);
        typeTimerRef.current = null;
      }
    };
  }, [fullText, fullChars.length, isReducedMotion]);

  const displayedText = useMemo(() => {
    if (!fullText) return "";
    if (isReducedMotion) return fullText;
    const count =
      typedProgress.target === fullText ? typedProgress.count : 1;
    if (count >= fullChars.length) return fullText;
    return fullChars.slice(0, count).join("");
  }, [fullText, fullChars, isReducedMotion, typedProgress]);

  const handleFinishTypingOrNextTip = useCallback(() => {
    if (!fullText) return;
    if (!isReducedMotion && displayedText.length < fullText.length) {
      if (typeTimerRef.current) {
        clearTimeout(typeTimerRef.current);
        typeTimerRef.current = null;
      }
      setTypedProgress({ target: fullText, count: fullChars.length });
    }
  }, [displayedText.length, fullChars.length, fullText, isReducedMotion]);

  // Initial time-of-day greeting ~1s after page load
  useEffect(() => {
    if (!mounted || !allowedRoute || isHidden || greetedSessionRef.current) {
      return;
    }

    greetTimerRef.current = setTimeout(() => {
      greetTimerRef.current = null;
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }
      if (isHiddenRef.current || !allowedRouteRef.current) {
        return;
      }
      greetedSessionRef.current = true;
      const hasGreetedBefore =
        readStorage(COMPANION_STORAGE_KEYS.GREETED) === "1";
      if (!hasGreetedBefore) {
        writeStorage(COMPANION_STORAGE_KEYS.GREETED, "1");
      }
      sayLine(createGreetingLine(!hasGreetedBefore), { isAuto: true });
    }, GREET_DELAY_MS);

    return () => {
      if (greetTimerRef.current) {
        clearTimeout(greetTimerRef.current);
        greetTimerRef.current = null;
      }
    };
  }, [mounted, allowedRoute, isHidden, sayLine]);

  // Idle nudge timer (~60s without interaction, max 2 times per session, paused when hidden or tab inactive)
  useEffect(() => {
    if (!mounted || !allowedRoute || isHidden) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }

    const clearIdle = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const scheduleIdle = () => {
      clearIdle();
      if (
        nudgeCountRef.current >= MAX_NUDGES ||
        isHiddenRef.current ||
        !allowedRouteRef.current ||
        (typeof document !== "undefined" &&
          document.visibilityState !== "visible")
      ) {
        return;
      }

      idleTimerRef.current = setTimeout(() => {
        idleTimerRef.current = null;
        if (
          isHiddenRef.current ||
          !allowedRouteRef.current ||
          (typeof document !== "undefined" &&
            document.visibilityState !== "visible")
        ) {
          return;
        }

        if (!activeLineRef.current && nudgeCountRef.current < MAX_NUDGES) {
          const idx = nudgeCountRef.current;
          const spoke = sayLine(createNudgeLine(idx), { isAuto: true });
          if (spoke) {
            nudgeCountRef.current += 1;
          }
        }

        if (nudgeCountRef.current < MAX_NUDGES) {
          scheduleIdle();
        }
      }, IDLE_MS);
    };

    const onUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityResetRef.current < ACTIVITY_THROTTLE_MS) {
        return;
      }
      lastActivityResetRef.current = now;
      scheduleIdle();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleIdle();
      } else {
        clearIdle();
      }
    };

    scheduleIdle();

    window.addEventListener("pointerdown", onUserActivity, { passive: true });
    window.addEventListener("keydown", onUserActivity, { passive: true });
    window.addEventListener("scroll", onUserActivity, {
      passive: true,
      capture: true,
    });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearIdle();
      window.removeEventListener("pointerdown", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
      window.removeEventListener("scroll", onUserActivity, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [mounted, allowedRoute, isHidden, sayLine]);

  // Listen for window "mpc:companion-toggle" and "mpc:companion" events
  useEffect(() => {
    if (!mounted) return;

    const handleToggle = (event: Event) => {
      const custom = event as CustomEvent<{ hidden?: boolean } | undefined>;
      const targetHidden =
        typeof custom.detail?.hidden === "boolean"
          ? custom.detail.hidden
          : !isHiddenRef.current;

      if (targetHidden) {
        hideMascot();
      } else {
        showMascot(true);
      }
    };

    const handleCompanionEvent = (event: Event) => {
      if (
        !allowedRouteRef.current ||
        isHiddenRef.current ||
        (typeof document !== "undefined" &&
          document.visibilityState !== "visible")
      ) {
        return;
      }
      const custom = event as CustomEvent<CompanionEventDetail | undefined>;
      const line = pickEventLine(custom.detail, lastEventKeyRef.current);
      if (line) {
        sayLine(line, { isAuto: true });
      }
    };

    window.addEventListener(COMPANION_EVENTS.TOGGLE, handleToggle);
    window.addEventListener(COMPANION_EVENTS.EVENT, handleCompanionEvent);

    return () => {
      window.removeEventListener(COMPANION_EVENTS.TOGGLE, handleToggle);
      window.removeEventListener(COMPANION_EVENTS.EVENT, handleCompanionEvent);
    };
  }, [mounted, hideMascot, showMascot, sayLine]);

  // Close bubble when clicking outside or pressing Escape
  useEffect(() => {
    if (!activeLine) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        closeBubble();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeBubble();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
      passive: true,
    });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeLine, closeBubble]);

  if (!mounted || !allowedRoute) {
    return null;
  }

  if (isHidden) {
    return (
      <button
        type="button"
        className="mpc-fox-peek"
        onClick={() => showMascot(true)}
        aria-label={t("aria.showMascot")}
        title={t("aria.showMascot")}
      >
        <Image
          src={POSE_IDLE}
          alt=""
          width={400}
          height={461}
          priority={false}
          unoptimized
          draggable={false}
          className="mpc-fox-peek-img"
        />
      </button>
    );
  }

  const isTalking = activeLine !== null;
  const pose = isTalking ? "talk" : "think";

  return (
    <>
      <div
        ref={rootRef}
        className={`mpc-fox-root${isWaving ? " mpc-fox-waving" : ""}`}
        data-pose={pose}
      >
        <div className="mpc-fox-figure">
          {isTalking && (
            <div className="mpc-fox-bubble">
              <button
                type="button"
                className="mpc-fox-bubble-close"
                onClick={closeBubble}
                aria-label={t("aria.closeBubble")}
              >
                &times;
              </button>
              <div
                className="mpc-fox-text-wrap"
                onClick={handleFinishTypingOrNextTip}
              >
                <span className="mpc-fox-text-sizer" aria-hidden="true">
                  {fullText}
                </span>
                <p className="mpc-fox-text" aria-hidden="true">
                  {displayedText}
                </p>
              </div>
              <div className="mpc-fox-actions">
                <button
                  type="button"
                  className="mpc-fox-btn-tip"
                  onClick={handleNextTip}
                >
                  {t("actions.nextTip")}
                </button>
                <button
                  type="button"
                  className="mpc-fox-btn"
                  onClick={hideMascot}
                  aria-label={t("aria.hideMascot")}
                >
                  {t("actions.hide")}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="mpc-fox-body"
            onClick={handleNextTip}
            aria-label={t("aria.foxButton")}
          >
            <span className="mpc-fox-art">
              <Image
                src={isTalking ? POSE_TALK : POSE_IDLE}
                alt=""
                width={400}
                height={461}
                priority={false}
                unoptimized
                draggable={false}
                className="mpc-fox-img"
              />
              <span className="mpc-fox-lid mpc-fox-lid-l" aria-hidden="true" />
              <span className="mpc-fox-lid mpc-fox-lid-r" aria-hidden="true" />
              <span className="mpc-fox-lens mpc-fox-lens-l" aria-hidden="true" />
              <span className="mpc-fox-lens mpc-fox-lens-r" aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>

      <p className="mpc-fox-sr" aria-live="polite" aria-atomic="true">
        {fullText}
      </p>
    </>
  );
}
