"use client";

import React from "react";
import { ArticleRecord, UserProgressRecord } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, HelpCircle, ListTree } from "lucide-react";

interface TableOfContentsProps {
  article: ArticleRecord;
  progress?: UserProgressRecord;
}

export function TableOfContents({ article, progress }: TableOfContentsProps) {
  const headings = (article.content || []).filter(
    (block) =>
      block.type === "heading_1" ||
      block.type === "heading_2" ||
      block.type === "heading_3"
  );

  const hasScrolled = Boolean(progress?.hasScrolledBottom);
  const scrollOk = hasScrolled || !article.requireScrollToBottom;
  const quizRequired = (article.passScorePercent || 0) > 0;
  const highestScore = progress?.highestQuizScore ?? 0;
  const quizPassed = !quizRequired || highestScore >= article.passScorePercent;

  return (
    <aside className="hidden xl:block w-64 shrink-0">
      <div className="sticky top-20 space-y-6">
        {/* Auto Table of Contents (H1, H2, H3) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-tight text-foreground">
            <ListTree className="size-3.5 text-primary" />
            <span>Table of Contents</span>
          </div>

          {headings.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Short article without subheadings.
            </p>
          ) : (
            <ul className="space-y-1.5 border-l border-border pl-3 text-xs">
              {headings.map((h) => (
                <li
                  key={h.id}
                  className={
                    h.type === "heading_3"
                      ? "pl-4"
                      : h.type === "heading_2"
                      ? "pl-2"
                      : "font-medium text-foreground"
                  }
                >
                  <a
                    href={`#block-${h.id}`}
                    className="block py-0.5 text-muted-foreground hover:text-primary transition-colors line-clamp-2"
                  >
                    {h.content}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Reading & Quiz Progression Card */}
        <Card className="p-4 gap-3 bg-muted/30">
          <CardHeader className="p-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold">
                Reading Progress
              </CardTitle>
              <Badge
                variant={scrollOk && quizPassed ? "success" : "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                {scrollOk && quizPassed ? "Completed" : "In Progress"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0 space-y-3 text-xs">
            {/* Scroll Check */}
            <div className="flex items-start gap-2.5">
              {scrollOk ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />
              ) : (
                <Clock className="size-4 shrink-0 text-amber-500 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="font-medium text-foreground">
                  {scrollOk
                    ? "Finished reading"
                    : "Scroll through to complete"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Estimated read: {article.readingTime} min
                </p>
              </div>
            </div>

            <Separator />

            {/* Quiz Check */}
            {quizRequired ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  {quizPassed ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                  ) : (
                    <HelpCircle className="size-4 shrink-0 text-amber-500 mt-0.5" />
                  )}
                  <div className="space-y-0.5 flex-1">
                    <p className="font-medium text-foreground">
                      Quiz: {article.passScorePercent}% required
                    </p>
                    <p className="text-[11px] font-mono tabular-nums text-muted-foreground">
                      Highest score: {highestScore}%
                    </p>
                  </div>
                </div>
                <Progress
                  value={Math.min(100, highestScore)}
                  className="h-1.5"
                  indicatorClassName={
                    quizPassed ? "bg-emerald-500" : "bg-amber-500"
                  }
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                <span>No quiz required</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
