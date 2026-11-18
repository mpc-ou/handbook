"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { NotificationRecord, NotificationType } from "@/types";
import {
  AtSign,
  Award,
  Check,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MessageSquare,
  MoreHorizontal,
  Reply,
  Trash2,
} from "lucide-react";

interface NotificationItemProps {
  notification: NotificationRecord;
  onMarkRead: (id: string) => void;
  onRemove: (id: string) => void;
  onNavigate?: () => void;
  compact?: boolean;
}

const TYPE_ICONS: Record<
  NotificationType,
  React.ComponentType<{ className?: string }>
> = {
  COMMENT: MessageSquare,
  REPLY: Reply,
  MENTION: AtSign,
  COURSE_COMPLETED: GraduationCap,
  CERTIFICATE_READY: Award,
  ASSIGNMENT_SUBMITTED: ClipboardCheck,
  ASSIGNMENT_GRADED: CheckCircle2,
};

function getInitials(name?: string): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(-2)
    .toUpperCase();
}

export function NotificationItem({
  notification,
  onMarkRead,
  onRemove,
  onNavigate,
  compact = false,
}: NotificationItemProps) {
  const router = useRouter();
  const t = useTranslations("notifications");
  const format = useFormatter();

  const { id, type, data, read, createdAt } = notification;
  const TypeIcon = TYPE_ICONS[type] || MessageSquare;

  const isSystemType =
    type === "CERTIFICATE_READY" || type === "ASSIGNMENT_GRADED";
  const hasActor = !isSystemType && Boolean(data.actorName || data.actorAvatarUrl);
  const initials = getInitials(data.actorName);

  const actor = data.actorName || t("fallback.actor");
  const item = data.itemTitle || t("fallback.item");
  const course = data.courseTitle || t("fallback.course");
  const score = typeof data.score === "number" ? data.score : 0;

  const showExcerpt =
    (type === "COMMENT" || type === "REPLY" || type === "MENTION") &&
    Boolean(data.excerpt?.trim());

  const relativeTime = (() => {
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return "";
    return format.relativeTime(d, new Date());
  })();

  const renderMessage = () => {
    const richTags = {
      b: (chunks: React.ReactNode) => (
        <strong className="font-semibold text-foreground">{chunks}</strong>
      ),
    };

    switch (type) {
      case "COMMENT":
        return t.rich("messages.COMMENT", { actor, item, ...richTags });
      case "REPLY":
        return t.rich("messages.REPLY", { actor, item, ...richTags });
      case "MENTION":
        return t.rich("messages.MENTION", { actor, item, ...richTags });
      case "COURSE_COMPLETED":
        return t.rich("messages.COURSE_COMPLETED", {
          actor,
          course,
          ...richTags,
        });
      case "CERTIFICATE_READY":
        return t.rich("messages.CERTIFICATE_READY", { course, ...richTags });
      case "ASSIGNMENT_SUBMITTED":
        return t.rich("messages.ASSIGNMENT_SUBMITTED", {
          actor,
          item,
          ...richTags,
        });
      case "ASSIGNMENT_GRADED":
        return t.rich("messages.ASSIGNMENT_GRADED", {
          item,
          score,
          ...richTags,
        });
      default:
        return item;
    }
  };

  const handleOpen = () => {
    if (!read) {
      onMarkRead(id);
    }
    onNavigate?.();
    const targetHref = data.href || "/";
    router.push(targetHref);
    if (
      typeof window !== "undefined" &&
      targetHref.includes("#") &&
      targetHref.split("#")[0] === window.location.pathname
    ) {
      const hashPart = targetHref.slice(targetHref.indexOf("#"));
      if (window.location.hash !== hashPart) {
        window.location.hash = hashPart;
      } else {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative flex items-start gap-3 text-left transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        compact ? "px-3.5 py-3" : "px-4 py-3.5",
        !read
          ? "bg-primary/[0.04] hover:bg-primary/[0.08]"
          : "hover:bg-muted/40"
      )}
    >
      {/* Avatar or System Type Icon */}
      {hasActor ? (
        <Avatar className="size-8 shrink-0 border border-border/60 mt-0.5">
          {data.actorAvatarUrl && (
            <AvatarImage
              src={data.actorAvatarUrl}
              alt={data.actorName || ""}
              referrerPolicy="no-referrer"
            />
          )}
          <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
            {initials || <TypeIcon className="size-3.5 text-muted-foreground" />}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border",
            type === "CERTIFICATE_READY" || type === "ASSIGNMENT_GRADED"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-primary/25 bg-primary/10 text-primary"
          )}
        >
          <TypeIcon className="size-4" />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs sm:text-[13px] leading-snug text-foreground/90 break-words">
          {renderMessage()}
        </p>

        {showExcerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2 break-words leading-relaxed">
            {data.excerpt}
          </p>
        )}

        {relativeTime && (
          <p className="text-[11px] text-muted-foreground/80">{relativeTime}</p>
        )}
      </div>

      {/* Right side: Unread dot + Actions menu */}
      <div
        className="flex items-center gap-1 shrink-0 self-start mt-0.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {!read && (
          <span
            aria-label={t("item.unreadDot")}
            title={t("item.unreadDot")}
            className="size-2 rounded-full bg-sky-500 shrink-0 mr-0.5"
          />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("item.moreActions")}
              className="size-6 rounded-md text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 p-1">
            {!read && (
              <DropdownMenuItem
                onSelect={() => onMarkRead(id)}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <Check className="size-3.5" />
                <span>{t("item.markRead")}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => onRemove(id)}
              className="cursor-pointer text-xs text-destructive focus:text-destructive flex items-center gap-2"
            >
              <Trash2 className="size-3.5" />
              <span>{t("item.delete")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
