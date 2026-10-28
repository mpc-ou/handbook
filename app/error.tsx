"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Next.js App Error Boundary Caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background text-foreground">
      <Card className="max-w-md w-full p-8 text-center space-y-4 border-border shadow-xs">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error?.message && !error.message.includes("Server Components render")
              ? error.message
              : "An unexpected error occurred while loading this page. Please try refreshing."}
          </p>
          {error?.digest && (
            <p className="text-[10px] font-mono text-muted-foreground/60 pt-1">
              Digest: {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            size="sm"
            onClick={() => reset()}
            className="gap-1.5 font-semibold cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            <span>Try again</span>
          </Button>
          <Button asChild variant="outline" size="sm" className="cursor-pointer">
            <Link href="/">
              <ArrowLeft className="size-3.5 mr-1" />
              <span>Back Home</span>
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

