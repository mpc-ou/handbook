"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useHandbook } from "@/context/HandbookContext";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  FilePlus2,
  FolderKanban,
  Home,
} from "lucide-react";

export function CommandSearch() {
  const router = useRouter();
  const {
    isSearchOpen,
    setIsSearchOpen,
    articles,
    categories,
    progressMap,
    user,
  } = useHandbook();

  const publishedArticles = articles
    .filter((a) => {
      const isUnpublic = (a.visibility || "").toUpperCase() === "UNPUBLIC";
      const isStaff = user?.role === "ADMIN" || user?.role === "EDITOR";
      if (isUnpublic) return isStaff;
      if (!user) {
        const aud = (a.audience || "INTERNAL").toUpperCase();
        if (aud === "INTERNAL") return false;
      }
      return a.isPublished;
    })
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const canManage = user?.role === "ADMIN" || user?.role === "EDITOR";

  const handleSelect = (href: string) => {
    setIsSearchOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog
      open={isSearchOpen}
      onOpenChange={setIsSearchOpen}
      title="Quick Search - MPC Handbook"
      description="Search regulations, playbooks, and club learning materials..."
    >
      <CommandInput placeholder="Search handbook, playbooks, guides (e.g. WebDesign, meeting)..." />
      <CommandList>
        <CommandEmpty>
          No matching articles or documents found.
        </CommandEmpty>

        <CommandGroup heading="Handbook Articles">
          {publishedArticles.map((item) => {
            const cat = categories.find((c) => c.id === item.categoryId);
            const isDone = Boolean(progressMap[item.id]?.isCompleted);

            return (
              <CommandItem
                key={item.id}
                value={`${item.title} ${cat?.name || ""} ${item.summary} ${item.plainText}`}
                onSelect={() => handleSelect(`/docs/${item.slug}`)}
                className="flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {isDone ? (
                    <CheckCircle2 className="mt-0.5 size-4 text-emerald-500 shrink-0" />
                  ) : (
                    <BookOpen className="mt-0.5 size-4 text-primary shrink-0" />
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">
                        {item.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {cat?.name || "Handbook"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.summary || item.plainText.slice(0, 120)}
                    </p>
                  </div>
                </div>
                <CommandShortcut>{item.readingTime}m read</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Navigation">
          <CommandItem
            value="Home Curriculum Roadmap MPC Handbook"
            onSelect={() => handleSelect("/")}
          >
            <Home className="size-4 text-muted-foreground" />
            <span>Home & Curriculum Roadmap</span>
          </CommandItem>

          {canManage && (
            <>
              <CommandItem
                value="Studio Dashboard Curriculum Articles Management"
                onSelect={() => handleSelect("/studio")}
              >
                <FolderKanban className="size-4 text-muted-foreground" />
                <span>Admin Studio & Overview</span>
              </CommandItem>
              <CommandItem
                value="New Article BlockNote Editor"
                onSelect={() => handleSelect("/studio/articles/new")}
              >
                <FilePlus2 className="size-4 text-muted-foreground" />
                <span>Create New Article</span>
              </CommandItem>
              <CommandItem
                value="Members Progress Analytics RBAC"
                onSelect={() => handleSelect("/studio/members")}
              >
                <BarChart3 className="size-4 text-muted-foreground" />
                <span>Members & Progress Analytics</span>
              </CommandItem>
            </>
          )}
        </CommandGroup>
      </CommandList>

      <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
        <span>Use ↑↓ keys to navigate, Enter to open</span>
        <span>ESC to close</span>
      </div>
    </CommandDialog>
  );
}
