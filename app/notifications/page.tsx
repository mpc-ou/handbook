"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { useHandbook } from "@/context/HandbookContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/components/notifications/useNotifications";
import { NotificationList } from "@/components/notifications/NotificationList";

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const { user, dataLoading, signInWithMpcOidc } = useHandbook();

  const {
    notifications,
    unreadCount,
    hasMore,
    loading,
    loadingMore,
    markRead,
    markAllRead,
    remove,
    clearRead,
    loadMore,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [confirmingClearRead, setConfirmingClearRead] = useState(false);

  const unreadList = useMemo(
    () => notifications.filter((n) => !n.read),
    [notifications]
  );

  const readCount = useMemo(
    () => notifications.filter((n) => n.read).length,
    [notifications]
  );

  if (!user && !dataLoading) {
    return (
      <AppShell hideLeftSidebar>
        <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Bell className="size-5" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {t("page.guest.title")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("page.guest.description")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                void signInWithMpcOidc("/notifications");
              }}
              className="cursor-pointer"
            >
              {t("page.guest.signInSso")}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">{t("page.guest.signInPage")}</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const displayedNotifications =
    activeTab === "unread" ? unreadList : notifications;
  const emptyMessage =
    activeTab === "unread" ? t("page.emptyUnread") : t("page.emptyAll");
  const canLoadMore =
    activeTab === "unread"
      ? hasMore || unreadCount > unreadList.length
      : hasMore;

  const handleConfirmClearRead = async () => {
    setConfirmingClearRead(false);
    await clearRead();
  };

  return (
    <AppShell hideLeftSidebar>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 space-y-5">
        {/* Title & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t("page.title")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("page.subtitle", { count: unreadCount })}
          </p>
        </div>

        {/* Toolbar: Tabs + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={activeTab}
            onValueChange={(val) =>
              setActiveTab(val === "unread" ? "unread" : "all")
            }
          >
            <TabsList>
              <TabsTrigger value="all" className="text-xs cursor-pointer">
                {t("page.tabs.all")}
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="text-xs gap-1.5 cursor-pointer"
              >
                <span>{t("page.tabs.unread")}</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.2 text-[10px] font-semibold text-primary tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-1.5">
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void markAllRead();
                }}
                className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <CheckCheck className="size-3.5" />
                <span>{t("page.markAllRead")}</span>
              </Button>
            )}

            {readCount > 0 && !confirmingClearRead && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingClearRead(true)}
                className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>{t("page.clearRead")}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Inline confirmation bar for clearing read notifications */}
        {confirmingClearRead && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2 text-xs">
            <span className="text-foreground font-medium">
              {t("page.clearReadConfirm")}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setConfirmingClearRead(false)}
                className="h-7 px-2 text-xs cursor-pointer"
              >
                {tCommon("actions.cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="xs"
                onClick={() => {
                  void handleConfirmClearRead();
                }}
                className="h-7 px-2.5 text-xs cursor-pointer"
              >
                {tCommon("actions.confirm")}
              </Button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <NotificationList
            notifications={displayedNotifications}
            loading={loading}
            emptyMessage={emptyMessage}
            onMarkRead={(id) => {
              void markRead(id);
            }}
            onRemove={(id) => {
              void remove(id);
            }}
          />
        </div>

        {/* Load More */}
        {canLoadMore && displayedNotifications.length > 0 && (
          <div className="flex justify-center pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loadingMore}
              onClick={() => {
                void loadMore({ unreadOnly: activeTab === "unread" });
              }}
              className="text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {loadingMore && <Loader2 className="size-3.5 animate-spin" />}
              <span>{t("page.loadMore")}</span>
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
