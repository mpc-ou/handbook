"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { AtSign } from "lucide-react";

interface CommentContentRendererProps {
  content: string;
  allUsers?: {
    id: string;
    fullName: string;
  }[];
}

export function CommentContentRenderer({
  content,
  allUsers = [],
}: CommentContentRendererProps) {
  const t = useTranslations("reader.comments");
  const mentionRegex = /<@([a-zA-Z0-9_-]+)>/g;
  const lines = content.split("\n");

  const userMap = new Map<string, string>();
  for (const u of allUsers) {
    userMap.set(u.id, u.fullName);
  }

  return (
    <div className="text-sm leading-relaxed text-foreground/90 break-words whitespace-pre-wrap space-y-1">
      {lines.map((line, lineIdx) => {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        mentionRegex.lastIndex = 0;

        while ((match = mentionRegex.exec(line)) !== null) {
          const matchStart = match.index;
          const matchEnd = mentionRegex.lastIndex;
          const mentionedId = match[1];

          if (matchStart > lastIndex) {
            parts.push(line.slice(lastIndex, matchStart));
          }

          const targetName =
            userMap.get(mentionedId) || t("fallbackMember");

          parts.push(
            <span
              key={`${lineIdx}-${matchStart}`}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary align-baseline select-none"
            >
              <AtSign className="size-3 shrink-0" />
              <span>{targetName}</span>
            </span>
          );

          lastIndex = matchEnd;
        }

        if (lastIndex < line.length) {
          parts.push(line.slice(lastIndex));
        }

        return (
          <p key={lineIdx} className="min-h-[1.25rem]">
            {parts.length > 0 ? parts : "\u00A0"}
          </p>
        );
      })}
    </div>
  );
}
