"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ItemRecord } from "@/types";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ItemNavProps {
  prevItem: ItemRecord | null;
  nextItem: ItemRecord | null;
  getItemHref: (target: ItemRecord) => string;
}

export function ItemNav({ prevItem, nextItem, getItemHref }: ItemNavProps) {
  const t = useTranslations("reader.nav");

  if (!prevItem && !nextItem) return null;

  return (
    <nav className="grid gap-3 sm:grid-cols-2 pt-6 border-t border-border/60">
      {prevItem ? (
        <Link
          href={getItemHref(prevItem)}
          className="group flex flex-col gap-1 rounded-xl border border-border/70 bg-card/50 p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
        >
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{t("previous")}</span>
          </span>
          <span className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {prevItem.title}
          </span>
        </Link>
      ) : (
        <div />
      )}

      {nextItem ? (
        <Link
          href={getItemHref(nextItem)}
          className="group flex flex-col items-end text-right gap-1 rounded-xl border border-border/70 bg-card/50 p-4 transition-colors hover:border-primary/50 hover:bg-muted/30"
        >
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span>{t("next")}</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="text-sm font-medium text-foreground truncate max-w-full group-hover:text-primary transition-colors">
            {nextItem.title}
          </span>
        </Link>
      ) : null}
    </nav>
  );
}
