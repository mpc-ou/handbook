"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Parses markdown inline formatting:
 * - Links: [label](url)
 * - Bold: **text**
 * - Italic: *text* or _text_
 * - Underline: <u>text</u> or __text__
 * - Strikethrough: ~~text~~
 * - Inline code: `code`
 */
export function FormattedText({ text, className }: FormattedTextProps) {
  if (!text) return null;

  // Tokenize regex matching markdown formatting elements
  const pattern =
    /(\[[^\]]+\]\([^)]+\)|(?:\*\*|__)(.*?)(?:\*\*|__)|(?:\*|_)(.*?)(?:\*|_)|~~(.*?)~~|<u>(.*?)<\/u>|`([^`]+)`)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Plain text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const matchedStr = match[0];

    // Markdown link: [label](url)
    if (matchedStr.startsWith("[") && matchedStr.includes("](") && matchedStr.endsWith(")")) {
      const closingBracket = matchedStr.indexOf("]");
      const label = matchedStr.slice(1, closingBracket);
      const url = matchedStr.slice(closingBracket + 2, -1);
      const isExternal = url.startsWith("http://") || url.startsWith("https://");

      parts.push(
        <a
          key={match.index}
          href={url}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
        >
          <span>{label}</span>
          {isExternal && <ExternalLink className="size-3 text-primary/70 shrink-0 inline" />}
        </a>
      );
    }
    // Inline code: `code`
    else if (matchedStr.startsWith("`") && matchedStr.endsWith("`")) {
      const code = matchedStr.slice(1, -1);
      parts.push(
        <code
          key={match.index}
          className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-primary"
        >
          {code}
        </code>
      );
    }
    // Bold: **text** or __text__
    else if (
      (matchedStr.startsWith("**") && matchedStr.endsWith("**")) ||
      (matchedStr.startsWith("__") && matchedStr.endsWith("__"))
    ) {
      const content = matchedStr.slice(2, -2);
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {content}
        </strong>
      );
    }
    // Underline: <u>text</u>
    else if (matchedStr.startsWith("<u>") && matchedStr.endsWith("</u>")) {
      const content = matchedStr.slice(3, -4);
      parts.push(
        <u key={match.index} className="underline underline-offset-2">
          {content}
        </u>
      );
    }
    // Strikethrough: ~~text~~
    else if (matchedStr.startsWith("~~") && matchedStr.endsWith("~~")) {
      const content = matchedStr.slice(2, -2);
      parts.push(
        <del key={match.index} className="line-through text-muted-foreground">
          {content}
        </del>
      );
    }
    // Italic: *text* or _text_
    else if (
      (matchedStr.startsWith("*") && matchedStr.endsWith("*")) ||
      (matchedStr.startsWith("_") && matchedStr.endsWith("_"))
    ) {
      const content = matchedStr.slice(1, -1);
      parts.push(
        <em key={match.index} className="italic">
          {content}
        </em>
      );
    } else {
      parts.push(matchedStr);
    }

    lastIndex = pattern.lastIndex;
  }

  // Trailing plain text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
