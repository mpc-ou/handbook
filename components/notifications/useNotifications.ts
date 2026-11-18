"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useHandbook } from "@/context/HandbookContext";
import { apiRequest } from "@/lib/api-client";
import type { NotificationRecord } from "@/types";

const PAGE_LIMIT = 20;
const POLL_INTERVAL_MS = 60_000;
const FOCUS_THROTTLE_MS = 3_000;

interface NotificationsResponse {
  success: boolean;
  notifications: NotificationRecord[];
  unreadCount: number;
  hasMore: boolean;
}

interface MutationResponse {
  success: boolean;
  updated?: number;
  deleted?: number;
  unreadCount: number;
}

interface StoreState {
  userId: string | null;
  notifications: NotificationRecord[];
  unreadCount: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  initialized: boolean;
}

const INITIAL_STATE: StoreState = {
  userId: null,
  notifications: [],
  unreadCount: 0,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,
  initialized: false,
};

let state: StoreState = { ...INITIAL_STATE };
const listeners = new Set<() => void>();

let pollTimer: ReturnType<typeof setInterval> | null = null;
let windowListenersAttached = false;
let inFlightFetch: Promise<void> | null = null;
let lastFetchedAt = 0;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(updater: Partial<StoreState> | ((prev: StoreState) => StoreState)) {
  state = typeof updater === "function" ? updater(state) : { ...state, ...updater };
  emit();
}

function getSnapshot(): StoreState {
  return state;
}

/**
 * Hợp nhất trang mới với danh sách hiện tại mà không làm nhấp nháy hay mất các mục đã tải thêm.
 * Giữ thứ tự giảm dần theo `createdAt`.
 */
function mergeNotifications(
  existing: NotificationRecord[],
  incoming: NotificationRecord[],
  mode: "replace_head" | "append"
): NotificationRecord[] {
  if (existing.length === 0) return incoming;
  const incomingMap = new Map(incoming.map((item) => [item.id, item]));

  if (mode === "append") {
    const existingIds = new Set(existing.map((item) => item.id));
    const appended = incoming.filter((item) => !existingIds.has(item.id));
    const updatedExisting = existing.map((item) => incomingMap.get(item.id) ?? item);
    return [...updatedExisting, ...appended];
  }

  // mode === "replace_head": đưa các mục mới lên đầu, cập nhật mục trùng và giữ lại các mục cũ hơn đã phân trang
  const oldestIncomingTime =
    incoming.length > 0
      ? new Date(incoming[incoming.length - 1].createdAt).getTime()
      : Infinity;

  const tail = existing.filter((item) => {
    if (incomingMap.has(item.id)) return false;
    const t = new Date(item.createdAt).getTime();
    return t < oldestIncomingTime;
  });

  return [...incoming, ...tail];
}

async function fetchLatest(opts?: { silent?: boolean }): Promise<void> {
  if (!state.userId) return;
  if (inFlightFetch) return inFlightFetch;

  const targetUserId = state.userId;
  const showLoading = !state.initialized && !opts?.silent;

  if (showLoading) {
    setState({ loading: true, error: null });
  }

  inFlightFetch = (async () => {
    try {
      const res = await apiRequest<NotificationsResponse>(
        `/api/notifications?limit=${PAGE_LIMIT}`
      );
      if (state.userId !== targetUserId) return;

      lastFetchedAt = Date.now();
      setState((prev) => {
        const merged = mergeNotifications(
          prev.notifications,
          res.notifications ?? [],
          "replace_head"
        );
        const keepExistingHasMore = prev.notifications.length > PAGE_LIMIT;
        return {
          ...prev,
          notifications: merged,
          unreadCount:
            typeof res.unreadCount === "number"
              ? res.unreadCount
              : merged.filter((n) => !n.read).length,
          hasMore: keepExistingHasMore ? prev.hasMore : Boolean(res.hasMore),
          loading: false,
          error: null,
          initialized: true,
        };
      });
    } catch (err) {
      if (state.userId !== targetUserId) return;
      const message =
        err instanceof Error ? err.message : "Failed to load notifications";
      setState((prev) => ({
        ...prev,
        loading: false,
        error: prev.initialized ? prev.error : message,
        initialized: true,
      }));
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}

function handleVisibilityOrFocus() {
  if (typeof document === "undefined") return;
  if (document.visibilityState !== "visible") return;
  if (!state.userId) return;
  if (Date.now() - lastFetchedAt < FOCUS_THROTTLE_MS) return;
  void fetchLatest({ silent: true });
}

function startBackgroundSync() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  if (!pollTimer) {
    pollTimer = setInterval(() => {
      if (document.visibilityState === "visible" && state.userId) {
        void fetchLatest({ silent: true });
      }
    }, POLL_INTERVAL_MS);
  }

  if (!windowListenersAttached) {
    windowListenersAttached = true;
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
  }
}

function stopBackgroundSync() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (windowListenersAttached && typeof window !== "undefined") {
    windowListenersAttached = false;
    window.removeEventListener("focus", handleVisibilityOrFocus);
    document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && state.userId) {
    startBackgroundSync();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopBackgroundSync();
    }
  };
}

function syncUser(userId: string | null) {
  if (state.userId === userId) return;
  inFlightFetch = null;
  lastFetchedAt = 0;

  if (!userId) {
    stopBackgroundSync();
    setState({ ...INITIAL_STATE });
    return;
  }

  setState({
    ...INITIAL_STATE,
    userId,
    loading: true,
  });

  if (listeners.size > 0) {
    startBackgroundSync();
  }
  void fetchLatest();
}

export function useNotifications() {
  const { user, showToast } = useHandbook();
  const t = useTranslations("notifications");
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const userId = user?.uid ?? null;

  useEffect(() => {
    syncUser(userId);
  }, [userId]);

  const markRead = useCallback(
    async (idsInput: string | string[]) => {
      const ids = (Array.isArray(idsInput) ? idsInput : [idsInput]).filter(Boolean);
      if (ids.length === 0 || !state.userId) return;

      const idSet = new Set(ids);
      const newlyReadCount = state.notifications.filter(
        (n) => idSet.has(n.id) && !n.read
      ).length;

      const prevNotifications = state.notifications;
      const prevUnreadCount = state.unreadCount;

      if (newlyReadCount > 0) {
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) =>
            idSet.has(n.id) ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - newlyReadCount),
        }));
      }

      try {
        const res = await apiRequest<MutationResponse>("/api/notifications", {
          method: "PATCH",
          body: { ids },
        });
        setState((prev) => ({
          ...prev,
          unreadCount:
            typeof res.unreadCount === "number" ? res.unreadCount : prev.unreadCount,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          notifications: prevNotifications,
          unreadCount: prevUnreadCount,
        }));
        const msg = err instanceof Error && err.message ? err.message : t("toast.updateFailed");
        showToast(msg, "error");
      }
    },
    [showToast, t]
  );

  const markAllRead = useCallback(async () => {
    if (!state.userId || state.unreadCount === 0) return;

    const prevNotifications = state.notifications;
    const prevUnreadCount = state.unreadCount;

    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.read ? n : { ...n, read: true })),
      unreadCount: 0,
    }));

    try {
      const res = await apiRequest<MutationResponse>("/api/notifications", {
        method: "PATCH",
        body: { all: true },
      });
      setState((prev) => ({
        ...prev,
        unreadCount:
          typeof res.unreadCount === "number" ? res.unreadCount : 0,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        notifications: prevNotifications,
        unreadCount: prevUnreadCount,
      }));
      const msg = err instanceof Error && err.message ? err.message : t("toast.updateFailed");
      showToast(msg, "error");
    }
  }, [showToast, t]);

  const remove = useCallback(
    async (id: string) => {
      if (!id || !state.userId) return;

      const target = state.notifications.find((n) => n.id === id);
      const prevNotifications = state.notifications;
      const prevUnreadCount = state.unreadCount;

      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.filter((n) => n.id !== id),
        unreadCount:
          target && !target.read
            ? Math.max(0, prev.unreadCount - 1)
            : prev.unreadCount,
      }));

      try {
        const res = await apiRequest<MutationResponse>(
          `/api/notifications?id=${encodeURIComponent(id)}`,
          { method: "DELETE" }
        );
        setState((prev) => ({
          ...prev,
          unreadCount:
            typeof res.unreadCount === "number" ? res.unreadCount : prev.unreadCount,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          notifications: prevNotifications,
          unreadCount: prevUnreadCount,
        }));
        const msg = err instanceof Error && err.message ? err.message : t("toast.updateFailed");
        showToast(msg, "error");
      }
    },
    [showToast, t]
  );

  const clearRead = useCallback(async () => {
    if (!state.userId) return;

    const prevNotifications = state.notifications;
    const prevUnreadCount = state.unreadCount;

    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => !n.read),
    }));

    try {
      const res = await apiRequest<MutationResponse>(
        "/api/notifications?read=true",
        { method: "DELETE" }
      );
      setState((prev) => ({
        ...prev,
        unreadCount:
          typeof res.unreadCount === "number" ? res.unreadCount : prev.unreadCount,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        notifications: prevNotifications,
        unreadCount: prevUnreadCount,
      }));
      const msg = err instanceof Error && err.message ? err.message : t("toast.updateFailed");
      showToast(msg, "error");
    }
  }, [showToast, t]);

  const loadMore = useCallback(
    async (options?: { unreadOnly?: boolean }) => {
      if (!state.userId || state.loading || state.loadingMore) return;

      const unreadOnly = Boolean(options?.unreadOnly);
      const sourceList = unreadOnly
        ? state.notifications.filter((n) => !n.read)
        : state.notifications;
      const lastItem = sourceList[sourceList.length - 1];
      if (!lastItem && !unreadOnly) return;

      setState({ loadingMore: true });

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_LIMIT),
        });
        if (unreadOnly) {
          params.set("unread", "true");
        }
        if (lastItem) {
          params.set("before", lastItem.createdAt);
        }

        const res = await apiRequest<NotificationsResponse>(
          `/api/notifications?${params.toString()}`
        );

        setState((prev) => ({
          ...prev,
          notifications: mergeNotifications(
            prev.notifications,
            res.notifications ?? [],
            "append"
          ),
          unreadCount:
            typeof res.unreadCount === "number"
              ? res.unreadCount
              : prev.unreadCount,
          hasMore: unreadOnly ? prev.hasMore || Boolean(res.hasMore) : Boolean(res.hasMore),
          loadingMore: false,
        }));
      } catch (err) {
        setState({ loadingMore: false });
        const msg = err instanceof Error && err.message ? err.message : t("toast.loadFailed");
        showToast(msg, "error");
      }
    },
    [showToast, t]
  );

  const refresh = useCallback(async () => {
    await fetchLatest({ silent: true });
  }, []);

  return {
    notifications: snapshot.notifications,
    unreadCount: snapshot.unreadCount,
    hasMore: snapshot.hasMore,
    loading: snapshot.loading,
    loadingMore: snapshot.loadingMore,
    error: snapshot.error,
    markRead,
    markAllRead,
    remove,
    clearRead,
    loadMore,
    refresh,
  };
}
