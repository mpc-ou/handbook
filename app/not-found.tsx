"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  const t = useTranslations("nav.notFound");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        <FileQuestion className="size-6" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        404 · {t("title")}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
        {t("description")}
      </p>
      <div className="mt-5">
        <Button asChild size="sm">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
