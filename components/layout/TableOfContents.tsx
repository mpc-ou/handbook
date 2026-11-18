"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ItemRecord, UserProgressRecord } from "@/types";

interface TableOfContentsProps {
  item: ItemRecord;
  progress?: UserProgressRecord;
}

export function TableOfContents({ item }: TableOfContentsProps) {
  const t = useTranslations("reader.toc");

  const headings = (item.content || []).filter(
    (block) =>
      block.type === "heading_1" ||
      block.type === "heading_2" ||
      block.type === "heading_3"
  );

  if (headings.length === 0) {
    return null;
  }

  return (
    <aside className="hidden xl:block w-56 shrink-0">
      <div className="sticky top-20 space-y-2.5">
        <p className="text-xs font-semibold tracking-tight text-foreground">
          {t("title")}
        </p>

        <ul className="space-y-1.5 border-l border-border/70 pl-3 text-xs">
          {headings.map((h) => (
            <li
              key={h.id}
              className={
                h.type === "heading_3"
                  ? "pl-3"
                  : h.type === "heading_2"
                  ? "pl-1.5"
                  : "font-medium text-foreground"
              }
            >
              <a
                href={`#block-${h.id}`}
                className="block py-0.5 text-muted-foreground hover:text-foreground transition-colors line-clamp-2"
              >
                {h.content}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
