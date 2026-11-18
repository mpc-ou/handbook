"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bell, Loader2 } from "lucide-react";
import type { NotificationRecord } from "@/types";
import { NotificationItem } from "./NotificationItem";
import { cn } from "@/lib/utils";

interface NotificationListProps {
  notifications: NotificationRecord[];
  loading?: boolean;
  emptyMessage: string;
  compact?: boolean;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
  onItemNavigate?: () => void;
  className?: string;
}

export function NotificationList({
  notifications,
  loading = false,
  emptyMessage,
  compact = false,
  onMarkRead,
  onRemove,
  onItemNavigate,
  className,
}: NotificationListProps) {
  const tCommon = useTranslations("common");
  const reduceMotion = useReducedMotion();

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-xs">{tCommon("actions.loading")}</span>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 text-center text-muted-foreground",
          compact ? "px-4 py-10" : "px-6 py-14"
        )}
      >
        <div className="flex size-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
          <Bell className="size-4" />
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("divide-y divide-border/60", className)}>
      <AnimatePresence initial={false}>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={
              reduceMotion ? false : { opacity: 0, y: -6 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.18, ease: "easeOut" }
            }
          >
            <NotificationItem
              notification={notification}
              compact={compact}
              onMarkRead={onMarkRead}
              onRemove={onRemove}
              onNavigate={onItemNavigate}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
