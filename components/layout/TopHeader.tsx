"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useHandbook } from "@/context/HandbookContext";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { StreakChip } from "@/components/layout/StreakChip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Search,
  Sparkles,
  Sun,
  User,
} from "lucide-react";

interface TopHeaderProps {
  onOpenMobileSidebar?: () => void;
}

export function TopHeader({ onOpenMobileSidebar }: TopHeaderProps) {
  const pathname = usePathname();
  const t = useTranslations("nav.header");
  const tRoles = useTranslations("nav.roles");
  const {
    user,
    theme,
    toggleTheme,
    setIsSearchOpen,
    logout,
    courses,
    lessons,
    items,
  } = useHandbook();

  const canAccessStudio = user?.role === "ADMIN" || user?.role === "EDITOR";
  const isReadingActive = pathname.startsWith("/learn/");

  const learnSegments = useMemo(() => {
    if (!isReadingActive) return [];
    return pathname
      .replace(/^\/learn\/?/, "")
      .split("/")
      .filter(Boolean)
      .map((s) => decodeURIComponent(s));
  }, [isReadingActive, pathname]);

  const [courseSlug, lessonSlug, itemSlug] = learnSegments;

  const currentCourse = useMemo(
    () =>
      isReadingActive && courseSlug
        ? courses.find((c) => c.slug === courseSlug || c.id === courseSlug)
        : undefined,
    [isReadingActive, courseSlug, courses]
  );

  const currentLesson = useMemo(
    () =>
      isReadingActive && lessonSlug && lessonSlug !== "certificate"
        ? lessons.find(
            (l) =>
              (l.slug === lessonSlug || l.id === lessonSlug) &&
              (!currentCourse || l.courseId === currentCourse.id)
          )
        : undefined,
    [isReadingActive, lessonSlug, lessons, currentCourse]
  );

  const currentItem = useMemo(
    () =>
      isReadingActive && itemSlug
        ? items.find(
            (i) =>
              (i.slug === itemSlug || i.id === itemSlug) &&
              (!currentLesson || i.lessonId === currentLesson.id)
          )
        : undefined,
    [isReadingActive, itemSlug, items, currentLesson]
  );

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(-2)
        .toUpperCase()
    : "MP";

  const handleToggleCompanion = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mpc:companion-toggle"));
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80 select-none">
      {/* Left: Mobile Sidebar Trigger + Brand + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onOpenMobileSidebar && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onOpenMobileSidebar}
            aria-label={t("openCurriculum")}
            className="lg:hidden shrink-0 cursor-pointer"
          >
            <Menu className="size-4" />
          </Button>
        )}

        <Link
          href="/"
          className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground whitespace-nowrap shrink-0 transition-opacity hover:opacity-90"
        >
          <span className="flex size-7 items-center justify-center rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="MPClub" className="size-6" />
          </span>
          <span className="text-sm sm:text-base font-bold tracking-tight">
            MPClub <span className="text-primary font-semibold">Handbook</span>
          </span>
        </Link>

        {/* Breadcrumb: ONLY on /learn/... */}
        {isReadingActive && currentCourse && (
          <nav
            aria-label={t("breadcrumbLabel")}
            className="hidden md:flex items-center gap-1.5 min-w-0 ml-2 text-xs"
          >
            <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0" />
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {t("coursesBreadcrumb")}
            </Link>

            <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0" />

            {currentLesson ? (
              <Link
                href={`/learn/${currentCourse.slug}`}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 max-w-[160px] truncate"
              >
                {currentCourse.title}
              </Link>
            ) : (
              <span className="font-medium text-foreground truncate max-w-[220px]">
                {currentCourse.title}
              </span>
            )}

            {currentLesson && (
              <>
                <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0" />
                {currentItem ? (
                  <Link
                    href={`/learn/${currentCourse.slug}/${currentLesson.slug}`}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0 max-w-[160px] truncate"
                  >
                    {currentLesson.title}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground truncate max-w-[220px]">
                    {currentLesson.title}
                  </span>
                )}
              </>
            )}

            {currentItem && (
              <>
                <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0" />
                <span className="font-medium text-foreground truncate max-w-[200px] lg:max-w-[280px]">
                  {currentItem.title}
                </span>
              </>
            )}
          </nav>
        )}
      </div>

      {/* Right: Search, StreakChip, Studio, Theme, Language, User Menu */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Desktop Search Trigger */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsSearchOpen(true)}
          className="hidden sm:inline-flex w-40 lg:w-52 justify-between text-muted-foreground font-normal bg-muted/30 hover:bg-muted/60 cursor-pointer h-8 px-2.5"
        >
          <span className="inline-flex items-center gap-1.5 truncate text-xs">
            <Search className="size-3.5 shrink-0" />
            <span>{t("searchPlaceholder")}</span>
          </span>
          <kbd className="pointer-events-none inline-flex h-5 items-center rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        </Button>

        {/* Mobile Search Icon */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsSearchOpen(true)}
          aria-label={t("searchShortcut")}
          className="sm:hidden cursor-pointer"
        >
          <Search className="size-4" />
        </Button>

        {/* Streak Chip */}
        <StreakChip />

        {/* Studio link (only ADMIN / EDITOR) */}
        {canAccessStudio && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Link href="/studio">{t("studio")}</Link>
          </Button>
        )}

        {/* Theme Switcher */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label={t("toggleTheme")}
              className="cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-foreground" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {theme === "dark" ? t("themeToLight") : t("themeToDark")}
          </TooltipContent>
        </Tooltip>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* User Profile Dropdown or Sign In */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-1.5 h-8 rounded-full cursor-pointer"
              >
                <Avatar className="size-7">
                  {user.avatarUrl && (
                    <AvatarImage
                      src={user.avatarUrl}
                      alt={user.fullName}
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden xl:inline text-xs font-medium text-foreground max-w-[110px] truncate">
                  {user.fullName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <DropdownMenuLabel className="font-normal px-2 py-1.5">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user.fullName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {tRoles(user.role)}
                  {user.department ? ` · ${user.department}` : ""}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild className="cursor-pointer text-xs">
                <Link href="/profile" className="flex items-center gap-2">
                  <User className="size-3.5" />
                  <span>{t("profile")}</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={handleToggleCompanion}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <Sparkles className="size-3.5" />
                <span>{t("toggleCompanion")}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={() => {
                  void logout();
                }}
                className="cursor-pointer text-destructive focus:text-destructive text-xs flex items-center gap-2"
              >
                <LogOut className="size-3.5" />
                <span>{t("signOut")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            asChild
            size="sm"
            className="h-8 px-3 text-xs font-semibold cursor-pointer"
          >
            <Link href="/login">{t("signIn")}</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
