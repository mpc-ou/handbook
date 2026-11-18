"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { Bell, CheckCheck } from "lucide-react";
import { useHandbook } from "@/context/HandbookContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "./useNotifications";
import { NotificationList } from "./NotificationList";

export function NotificationBell() {
  const { user } = useHandbook();
  const t = useTranslations("notifications");
  const reduceMotion = useReducedMotion();

  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    remove,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const prevUnreadRef = useRef<number>(unreadCount);
  const [bumpKey, setBumpKey] = useState(0);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setBumpKey((k) => k + 1);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  if (!user) return null;

  const badgeText = unreadCount > 9 ? "9+" : String(unreadCount);
  const ariaLabel =
    unreadCount > 0
      ? t("bell.labelWithUnread", { count: unreadCount })
      : t("bell.label");

  const recentNotifications = notifications.slice(0, 8);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={ariaLabel}
          title={ariaLabel}
          className="relative cursor-pointer"
        >
          <Bell className="size-4 text-foreground" />
          {unreadCount > 0 && (
            <motion.span
              key={bumpKey}
              initial={
                reduceMotion || bumpKey === 0 ? false : { scale: 1.35, y: -2 }
              }
              animate={{ scale: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 380, damping: 15 }
              }
              className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground tabular-nums"
            >
              {badgeText}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-2rem)] sm:w-[380px] max-h-[70vh] p-0 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3.5 py-2.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-xs font-semibold text-foreground">
              {t("bell.title")}
            </h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                {unreadCount}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                void markAllRead();
              }}
              className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <CheckCheck className="size-3" />
              <span>{t("bell.markAllRead")}</span>
            </Button>
          )}
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto">
          <NotificationList
            notifications={recentNotifications}
            loading={loading}
            emptyMessage={t("bell.empty")}
            compact
            onMarkRead={(id) => {
              void markRead(id);
            }}
            onRemove={(id) => {
              void remove(id);
            }}
            onItemNavigate={() => setOpen(false)}
          />
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 px-3.5 py-2 text-center shrink-0 bg-muted/20">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="inline-block text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("bell.viewAll")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
