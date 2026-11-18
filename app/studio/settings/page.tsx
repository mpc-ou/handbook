"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { CountUp, ProgressBar } from "@/components/ui/animated-progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHandbook } from "@/context/HandbookContext";
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  Server,
  Trash2,
} from "lucide-react";

interface StorageData {
  cloudinary?: {
    cloudName?: string;
    configured?: boolean;
    usage?: {
      plan?: string;
      last_updated?: string;
      transformations?: { usage?: number; credits_usage?: number };
      objects?: { usage?: number };
      bandwidth?: { usage?: number; credits_usage?: number };
      storage?: { usage?: number; credits_usage?: number };
      credits?: { usage?: number; limit?: number; used_percent?: number };
    };
    error?: string | null;
  };
  dbTracking?: {
    totalTracked: number;
    attachedCount: number;
    orphanCount: number;
    readyToCleanCount: number;
    totalBytes: number;
    totalMegabytes: number;
  };
}

export default function StudioSettingsPage() {
  const t = useTranslations("studio");
  const ts = useTranslations("studio.settings");
  const { showToast } = useHandbook();

  const [data, setData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const fetchStorageData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/studio/storage", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      } else {
        showToast(json.error || ts("toasts.loadFailed"), "error");
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : ts("toasts.serverError"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [showToast, ts]);

  useEffect(() => {
    void fetchStorageData();
  }, [fetchStorageData]);

  const handleCleanOrphans = async () => {
    setCleaning(true);
    try {
      const res = await fetch("/api/upload/cleanup?hours=0", {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          ts("toasts.cleanSuccess", {
            count: json.deletedCount ?? 0,
            mb: json.freedMegabytes ?? 0,
          }),
          "success"
        );
        void fetchStorageData();
      } else {
        showToast(json.error || ts("toasts.cleanFailed"), "error");
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : ts("toasts.cleanFailed"),
        "error"
      );
    } finally {
      setCleaning(false);
    }
  };

  const usage = data?.cloudinary?.usage;
  const storageUsageBytes = usage?.storage?.usage || 0;
  const storageUsageMb = (storageUsageBytes / (1024 * 1024)).toFixed(2);
  const bandwidthUsageMb = (
    (usage?.bandwidth?.usage || 0) /
    (1024 * 1024)
  ).toFixed(2);
  const creditsPercent = usage?.credits?.used_percent || 0;
  const orphanCount = data?.dbTracking?.orphanCount || 0;

  return (
    <AdminLayout
      breadcrumbs={[{ label: t("nav.settings") }]}
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStorageData}
          disabled={loading}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{ts("refresh")}</span>
        </Button>
      }
    >
      <div className="space-y-6">
        <PageHeader title={ts("title")} description={ts("description")} />

        {/* 1. Cloudinary Quota Overview */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Cloud className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2 flex-wrap">
                  <span>{ts("cloudinary.heading")}</span>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {ts("cloudinary.plan", {
                      plan: usage?.plan || ts("cloudinary.defaultPlan"),
                    })}
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground font-mono">
                  {ts("cloudinary.cloudName", {
                    name: data?.cloudinary?.cloudName || "—",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={
                  data?.cloudinary?.configured ? "outline" : "destructive"
                }
                className="text-xs"
              >
                {data?.cloudinary?.configured ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    <span>{ts("cloudinary.connected")}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    <span>{ts("cloudinary.unconfigured")}</span>
                  </span>
                )}
              </Badge>
            </div>
          </div>

          {data?.cloudinary?.error && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
              {ts("cloudinary.apiError", { error: data.cloudinary.error })}
            </div>
          )}

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-1.5">
              <span className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{ts("cloudinary.storageLabel")}</span>
                <HardDrive className="size-3.5 text-muted-foreground" />
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                {storageUsageMb} MB
              </p>
              <p className="text-xs text-muted-foreground">
                {ts("cloudinary.storageHint")}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-1.5">
              <span className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{ts("cloudinary.bandwidthLabel")}</span>
                <Server className="size-3.5 text-muted-foreground" />
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                {bandwidthUsageMb} MB
              </p>
              <p className="text-xs text-muted-foreground">
                {ts("cloudinary.bandwidthHint")}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/15 space-y-2">
              <span className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{ts("cloudinary.creditsLabel")}</span>
                <span className="text-xs font-mono tabular-nums">
                  {creditsPercent}%
                </span>
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                <CountUp value={creditsPercent} suffix="%" />
              </p>
              <ProgressBar
                value={creditsPercent}
                label={ts("cloudinary.creditsLabel")}
              />
            </div>
          </div>
        </div>

        {/* 2. Orphan Uploads & Automated Garbage Collection */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Database className="size-4 text-primary shrink-0" />
                <span>{ts("orphans.heading")}</span>
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                {ts("orphans.description")}
              </p>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleCleanOrphans}
              disabled={cleaning || orphanCount === 0}
              className="gap-2 text-xs font-semibold shrink-0 cursor-pointer"
            >
              {cleaning ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{ts("orphans.cleaning")}</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  <span>
                    {ts("orphans.cleanButton", { count: orphanCount })}
                  </span>
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-lg border border-border bg-muted/15 space-y-1">
              <span className="text-xs text-muted-foreground">
                {ts("orphans.totalTracked")}
              </span>
              <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                <CountUp value={data?.dbTracking?.totalTracked || 0} />
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-muted/15 space-y-1">
              <span className="text-xs text-muted-foreground">
                {ts("orphans.attachedCount")}
              </span>
              <p className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                <CountUp value={data?.dbTracking?.attachedCount || 0} />
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-muted/15 space-y-1">
              <span className="text-xs text-muted-foreground">
                {ts("orphans.orphanCount")}
              </span>
              <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                <CountUp value={orphanCount} />
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-muted/15 space-y-1">
              <span className="text-xs text-muted-foreground">
                {ts("orphans.trackedVolume")}
              </span>
              <p className="text-xl font-bold font-mono tabular-nums text-foreground">
                {data?.dbTracking?.totalMegabytes || 0} MB
              </p>
            </div>
          </div>

          {/* Cron Instruction */}
          <div className="rounded-lg bg-muted/30 p-3.5 border border-border text-xs space-y-1.5">
            <p className="font-medium text-foreground">
              {ts("orphans.cronTitle")}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {ts("orphans.cronDescription")}
            </p>
            <div className="p-2 rounded bg-background border border-border font-mono text-[11px] select-all overflow-x-auto text-primary">
              POST /api/upload/cleanup?hours=2
            </div>
            <p className="text-[11px] text-muted-foreground">
              {ts("orphans.cronHint")}
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
