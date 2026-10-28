"use client";

import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  const { showToast } = useHandbook();
  const [data, setData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  const fetchStorageData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/studio/storage", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      } else {
        showToast(json.error || "Không thể tải dữ liệu dung lượng.", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Lỗi kết nối máy chủ.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, []);

  const handleCleanOrphans = async () => {
    setCleaning(true);
    try {
      const res = await fetch("/api/upload/cleanup?hours=0", {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          `Đã dọn dẹp thành công ${json.deletedCount} tệp rác (giải phóng ~${json.freedMegabytes} MB).`,
          "success"
        );
        fetchStorageData();
      } else {
        showToast(json.error || "Dọn dẹp tệp rác thất bại.", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi gọi API dọn dẹp.", "error");
    } finally {
      setCleaning(false);
    }
  };

  const usage = data?.cloudinary?.usage;
  const storageUsageBytes = usage?.storage?.usage || 0;
  const storageUsageMb = (storageUsageBytes / (1024 * 1024)).toFixed(2);
  const bandwidthUsageMb = ((usage?.bandwidth?.usage || 0) / (1024 * 1024)).toFixed(2);
  const creditsPercent = usage?.credits?.used_percent || 0;

  return (
    <AdminLayout
      breadcrumbs={[
        { label: "Studio", href: "/studio" },
        { label: "Storage & Settings" },
      ]}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStorageData}
          disabled={loading}
          className="gap-1.5 text-xs cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </Button>
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="Cloud Storage & Asset Lifecycle"
          description="Quản lý hạn mức lưu trữ Cloudinary CDN, tự động dọn dẹp tệp tải lên mồ côi (chưa lưu bài viết)."
        />

        {/* 1. Cloudinary Quota Overview */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Cloud className="size-5.5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Cloudinary Media CDN</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Plan: {usage?.plan || "Free / Developer"}
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Cloud Name: {data?.cloudinary?.cloudName || "y2h4qe5e"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={data?.cloudinary?.configured ? "default" : "destructive"}
                className="text-xs"
              >
                {data?.cloudinary?.configured ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> API Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="size-3" /> Chưa cấu hình API
                  </span>
                )}
              </Badge>
            </div>
          </div>

          {data?.cloudinary?.error && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
              Lưu ý API Admin: {data.cloudinary.error}
            </div>
          )}

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <span className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Dung lượng lưu trữ</span>
                <HardDrive className="size-3.5 text-primary" />
              </span>
              <p className="text-2xl font-bold font-mono text-foreground">
                {storageUsageMb} MB
              </p>
              <p className="text-[11px] text-muted-foreground">
                Tổng file ảnh / tài liệu đang lưu trên cloud
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <span className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Băng thông (Bandwidth)</span>
                <Server className="size-3.5 text-blue-500" />
              </span>
              <p className="text-2xl font-bold font-mono text-foreground">
                {bandwidthUsageMb} MB
              </p>
              <p className="text-[11px] text-muted-foreground">
                Lượng truyền tải trong chu kỳ 30 ngày
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <span className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Hạn mức Credits đã dùng</span>
                <Badge variant="outline" className="text-[10px]">
                  {creditsPercent}%
                </Badge>
              </span>
              <p className="text-2xl font-bold font-mono text-foreground">
                {creditsPercent}%
              </p>
              <Progress value={creditsPercent} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* 2. Orphan Uploads & Automated Garbage Collection */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Database className="size-4.5 text-primary" />
                <span>Cơ chế dọn dẹp tệp rác tự động (Orphan Files Lifecycle)</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Khi tác giả upload ảnh vào BlockNote hoặc ảnh bìa nhưng sau đó F5 làm mới trang, đóng tab hoặc không bấm lưu, các file đó sẽ được đánh dấu là tệp mồ côi (chưa gắn vào bài viết nào). Hệ thống sẽ tự động quét và xóa sạch khỏi Cloudinary để tiết kiệm dung lượng.
              </p>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleCleanOrphans}
              disabled={cleaning || (data?.dbTracking?.orphanCount || 0) === 0}
              className="gap-2 text-xs font-semibold shrink-0 cursor-pointer"
            >
              {cleaning ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Đang dọn dẹp...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  <span>Dọn dẹp ngay ({data?.dbTracking?.orphanCount || 0} tệp rác)</span>
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-3.5 rounded-xl border border-border bg-muted/10 space-y-1">
              <span className="text-xs text-muted-foreground">Tổng tệp đã track</span>
              <p className="text-xl font-bold font-mono text-foreground">
                {data?.dbTracking?.totalTracked || 0}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-emerald-500/5 space-y-1">
              <span className="text-xs text-emerald-700 dark:text-emerald-400">Đã lưu trong bài viết</span>
              <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {data?.dbTracking?.attachedCount || 0}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-amber-500/5 space-y-1">
              <span className="text-xs text-amber-700 dark:text-amber-400">Tệp mồ côi (chưa lưu)</span>
              <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {data?.dbTracking?.orphanCount || 0}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/10 space-y-1">
              <span className="text-xs text-muted-foreground">Dung lượng track trong DB</span>
              <p className="text-xl font-bold font-mono text-foreground">
                {data?.dbTracking?.totalMegabytes || 0} MB
              </p>
            </div>
          </div>

          {/* Webhook / Cron Instruction */}
          <div className="rounded-xl bg-muted/40 p-4 border border-border text-xs space-y-2">
            <p className="font-semibold text-foreground">
              Thiết lập Cronjob tự động theo định kỳ:
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Bạn có thể gọi tự động vào endpoint sau (sử dụng Vercel Cron, GitHub Actions, hoặc cron server):
            </p>
            <div className="p-2.5 rounded-lg bg-background border border-border font-mono text-[11px] select-all overflow-x-auto text-primary">
              POST /api/upload/cleanup?hours=2
            </div>
            <p className="text-[11px] text-muted-foreground">
              Mặc định xóa các tệp mồ côi đã tạo quá 2 giờ mà không được lưu vào bài viết.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

