"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useHandbook } from "@/context/HandbookContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  ArrowRight,
  BarChart3,
  BookOpen,
  Compass,
  FileEdit,
  GraduationCap,
  LogOut,
  Menu,
  Moon,
  Search,
  Shield,
  Sun,
  User,
  UserCheck,
} from "lucide-react";

interface TopHeaderProps {
  onOpenMobileSidebar?: () => void;
}

export function TopHeader({ onOpenMobileSidebar }: TopHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    theme,
    toggleTheme,
    setIsSearchOpen,
    logout,
    articles,
    categories,
    progressMap,
  } = useHandbook();

  const canAccessStudio = user?.role === "ADMIN" || user?.role === "EDITOR";

  // Find next uncompleted or first article to read
  const firstArticle = articles.find((a) => {
    if (!a.isPublished) return false;
    if ((a.visibility || "").toUpperCase() === "UNPUBLIC") return false;
    if (!user && (a.audience || "INTERNAL").toUpperCase() === "INTERNAL") return false;
    return true;
  });
  const currentReadingSlug =
    articles.find(
      (a) =>
        !progressMap[a.id]?.isCompleted &&
        a.isPublished &&
        (a.visibility || "").toUpperCase() !== "UNPUBLIC" &&
        (user || (a.audience || "INTERNAL").toUpperCase() !== "INTERNAL")
    )?.slug ||
    firstArticle?.slug ||
    "quy-tac-ung-xu-mpc";

  const isReadingActive = pathname.startsWith("/docs");
  const isHomeActive = pathname === "/";

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(-2)
        .toUpperCase()
    : "MP";

  // Breadcrumb information for currently active reading article
  const currentArticle = isReadingActive
    ? articles.find(
        (a) =>
          pathname === `/docs/${a.slug}` ||
          pathname.endsWith(`/${a.slug}`) ||
          pathname.endsWith(`/${a.id}`)
      )
    : undefined;
  const currentCategory = currentArticle
    ? categories.find((c) => c.id === currentArticle.categoryId)
    : undefined;
  const parentCategory =
    currentCategory?.depth === 2 && currentCategory.parentId
      ? categories.find((c) => c.id === currentCategory.parentId)
      : null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80 select-none">
      {/* Zone 1: Brand Wordmark + Mobile Sidebar Trigger */}
      <div className="flex items-center gap-3 shrink-0">
        {onOpenMobileSidebar && (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onOpenMobileSidebar}
            aria-label="Open handbook sidebar"
            className="lg:hidden cursor-pointer"
          >
            <Menu className="size-4" />
          </Button>
        )}
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-base font-bold tracking-tight text-foreground whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 cursor-pointer"
        >
          {/* MPClub Isometric 3D Cube Icon */}
          <span className="flex size-8 items-center justify-center rounded-lg  text-white shadow-sm shadow-orange-500/20">
            <img src="/icon.svg" alt="MPClub Icon" />
          </span>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight">MPClub</span>
              <span className="text-xs font-semibold text-primary">Handbook</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">
              Where there are bugs, there is MPC!
            </span>
          </div>
        </Link>
      </div>

      {/* Zone 2: Breadcrumb on Reader View OR Nav Tabs on Other Pages */}
      {isReadingActive && currentArticle ? (
        <div className="hidden md:flex items-center gap-1.5 min-w-0 mr-auto ml-4 text-xs">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 font-medium"
          >
            MPC Handbook
          </Link>
          {parentCategory && (
            <>
              <span className="text-muted-foreground/40 shrink-0">/</span>
              <span className="text-muted-foreground shrink-0 max-w-[130px] truncate">
                {parentCategory.name}
              </span>
            </>
          )}
          {currentCategory && (
            <>
              <span className="text-muted-foreground/40 shrink-0">/</span>
              <span className="text-muted-foreground shrink-0 max-w-[150px] truncate">
                {currentCategory.name}
              </span>
            </>
          )}
          <span className="text-muted-foreground/40 shrink-0">/</span>
          <span className="font-semibold text-foreground truncate max-w-[220px] lg:max-w-[340px]">
            {currentArticle.title}
          </span>
        </div>
      ) : (
        <nav className="hidden md:flex items-center gap-1 h-full ml-6 mr-auto">
          <Link
            href="/"
            className={`relative flex items-center gap-1.5 px-3 h-14 text-xs font-medium transition-colors cursor-pointer ${
              isHomeActive
                ? "text-primary font-semibold border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Compass className="size-3.5" />
            <span>Curriculum Roadmap</span>
          </Link>

          <Link
            href={`/docs/${currentReadingSlug}`}
            className={`relative flex items-center gap-1.5 px-3 h-14 text-xs font-medium transition-colors cursor-pointer ${
              isReadingActive
                ? "text-primary font-semibold border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="size-3.5" />
            <span>Handbook Lessons</span>
          </Link>
        </nav>
      )}

      {/* Zone 3: Search, Edit Shortcut, Admin Switcher & User Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Quick Edit Article Button in Header when in Reader View */}
        {isReadingActive && currentArticle && canAccessStudio && (
          <Button
            asChild
            variant="outline"
            size="xs"
            className="hidden sm:inline-flex h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Link href={`/studio/articles/${currentArticle.id}`}>
              <FileEdit className="size-3.5" />
              <span>Edit Article</span>
            </Link>
          </Button>
        )}
        {/* Command Search Trigger */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsSearchOpen(true)}
          className="hidden sm:inline-flex w-44 lg:w-56 justify-between text-muted-foreground font-normal bg-muted/30 hover:bg-muted/70 cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 truncate text-xs">
            <Search className="size-3.5 shrink-0" />
            <span>Search handbook...</span>
          </span>
          <kbd className="pointer-events-none inline-flex h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            Ctrl K
          </kbd>
        </Button>

        {/* Mobile Search Icon */}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Quick search Ctrl+K"
          className="sm:hidden cursor-pointer"
        >
          <Search className="size-4" />
        </Button>

        {/* Dedicated Admin Portal Switcher */}
        {canAccessStudio && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary font-semibold text-xs cursor-pointer"
              >
                <Shield className="size-3.5" />
                <span className="hidden sm:inline">Admin</span>
                <span className="sm:hidden">Studio</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                Admin Workspace
              </DropdownMenuLabel>
              <DropdownMenuItem asChild className="cursor-pointer text-xs">
                <Link href="/studio" className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  <span>Dashboard Overview</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer text-xs">
                <Link href="/studio/articles" className="flex items-center gap-2">
                  <FileEdit className="size-4 text-foreground" />
                  <span>Manage Articles</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer text-xs">
                <Link href="/studio/curriculum" className="flex items-center gap-2">
                  <BookOpen className="size-4 text-foreground" />
                  <span>Curriculum Structure</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer text-xs">
                <Link href="/studio/members" className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-foreground" />
                  <span>Members & Progress</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Theme Switcher with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label="Toggle Light/Dark Theme"
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
            {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </TooltipContent>
        </Tooltip>

        {/* User Profile Dropdown */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-1.5 py-1 h-9 rounded-lg cursor-pointer"
              >
                <Avatar className="size-7">
                  {user.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} alt={user.fullName} referrerPolicy="no-referrer" />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden xl:flex flex-col items-start text-left leading-tight">
                  <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                    {user.fullName}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {user.department || user.role}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-2">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {user.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate font-mono">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {user.role}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {user.department}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild className="cursor-pointer text-xs">
                <Link href="/profile" className="flex items-center gap-2">
                  <User className="size-3.5" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              {canAccessStudio && (
                <>
                  <DropdownMenuItem asChild className="cursor-pointer text-xs">
                    <Link href="/studio" className="flex items-center gap-2 text-primary">
                      <Shield className="size-3.5" />
                      <span>Admin Workspace</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive text-xs"
              >
                <LogOut className="size-3.5 mr-2" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild size="sm" className="h-8 text-xs font-semibold cursor-pointer">
            <Link href="/login">
              <span>Sign in</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
