"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("nav.error");
  const tActions = useTranslations("common.actions");

  useEffect(() => {
    console.error("App Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background text-foreground">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-bold tracking-tight">{t("title")}</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("description")}
          </p>
          {error?.digest && (
            <p className="text-[11px] font-mono text-muted-foreground/60 pt-1">
              {t("digest", { id: error.digest })}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-2.5 pt-1">
          <Button
            size="sm"
            onClick={() => reset()}
            className="gap-1.5 font-semibold cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            <span>{tActions("retry")}</span>
          </Button>
          <Button asChild variant="ghost" size="sm" className="cursor-pointer">
            <Link href="/">{t("backHome")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
