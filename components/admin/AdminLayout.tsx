"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHandbook } from "@/context/HandbookContext";
import { CommandSearch } from "@/components/layout/CommandSearch";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  Award,
  BookOpen,
  FileText,
  FolderTree,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  Sun,
  Users,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export function AdminLayout({
  children,
  breadcrumbs = [],
  actions,
}: AdminLayoutProps) {
  const pathname = usePathname();
  const {
    user,
    articles,
    allUsers,
    theme,
    toggleTheme,
    setIsSearchOpen,
    logout,
  } = useHandbook();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const canAccess = user?.role === "ADMIN" || user?.role === "EDITOR";

  if (!canAccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-3">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Admin Workspace Access
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mt-1.5 mb-5">
          Only Executive Board members and Department Leaders have access to the MPClub Studio workspace.
        </p>
        <div className="flex items-center gap-2">
          {!user && (
            <Button asChild size="sm" className="cursor-pointer font-semibold">
              <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}>
                <KeyRound className="size-4 mr-1.5" />
                <span>Sign in with Admin Credentials</span>
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="cursor-pointer">
            <Link href="/">
              <ArrowLeft className="size-4 mr-1.5" />
              <span>Return to Handbook</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const contentLinks = [
    {
      label: "Overview",
      href: "/studio",
      icon: LayoutDashboard,
      isActive: pathname === "/studio",
      count: undefined,
    },
    {
      label: "Articles",
      href: "/studio/articles",
      icon: FileText,
      isActive: pathname.startsWith("/studio/articles"),
      count: articles.length,
    },
    {
      label: "Curriculum",
      href: "/studio/curriculum",
      icon: FolderTree,
      isActive: pathname.startsWith("/studio/curriculum"),
      count: undefined,
    },
    {
      label: "Quizzes & Assessments",
      href: "/studio/quizzes",
      icon: Award,
      isActive: pathname.startsWith("/studio/quizzes"),
      count: undefined,
    },
  ];

  const peopleLinks = [
    {
      label: "Members",
      href: "/studio/members",
      icon: Users,
      isActive: pathname.startsWith("/studio/members"),
      count: allUsers.length,
    },
  ];

  const renderSidebarContent = (isCollapsed: boolean) => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border select-none">
      {/* Brand Header */}
      <div
        className={`h-14 flex items-center border-b border-sidebar-border ${
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        }`}
      >
        <Link
          href="/studio"
          className="flex items-center gap-2.5 font-semibold tracking-tight text-sidebar-foreground cursor-pointer min-w-0"
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold truncate">MPClub Studio</span>
              <Badge
                variant="outline"
                className="font-mono text-xs px-1.5 py-0 h-5 text-primary border-primary/30"
              >
                {user?.role === "ADMIN" ? "BCN" : "Editor"}
              </Badge>
            </div>
          )}
        </Link>
      </div>

      {/* Top Primary Write Action */}
      <div className={isCollapsed ? "p-2" : "px-3 pt-3 pb-1"}>
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                size="icon"
                className="w-full h-9 cursor-pointer"
              >
                <Link href="/studio/articles/new">
                  <Plus className="size-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New Article</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            asChild
            size="sm"
            className="w-full justify-start gap-2 h-9 text-sm font-medium cursor-pointer"
          >
            <Link
              href="/studio/articles/new"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Plus className="size-4" />
              <span>New Article</span>
            </Link>
          </Button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
        {/* Group 1: Content */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">
              Content
            </p>
          )}
          {contentLinks.map((item) => {
            const Icon = item.icon;
            const linkNode = (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between gap-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  isCollapsed ? "justify-center p-2.5" : "px-2.5 py-2"
                } ${
                  item.isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium"
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="size-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </span>
                {!isCollapsed && item.count !== undefined && (
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                    {item.count}
                  </span>
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkNode}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return linkNode;
          })}
        </div>

        {/* Group 2: People */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">
              People
            </p>
          )}
          {peopleLinks.map((item) => {
            const Icon = item.icon;
            const linkNode = (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between gap-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  isCollapsed ? "justify-center p-2.5" : "px-2.5 py-2"
                } ${
                  item.isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium"
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="size-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </span>
                {!isCollapsed && item.count !== undefined && (
                  <span className="text-xs font-mono text-muted-foreground tabular-nums">
                    {item.count}
                  </span>
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkNode}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return linkNode;
          })}
        </div>
      </div>

      {/* Footer: Back to Reader + User Profile */}
      <div className="p-2.5 border-t border-sidebar-border space-y-2">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                className="flex items-center justify-center p-2 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-4 text-primary" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Back to Reader</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-4 text-primary shrink-0" />
            <span>Back to Reader</span>
          </Link>
        )}

        <Separator />

        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "justify-between gap-2 px-1"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="size-7 shrink-0">
              {user?.avatarUrl && (
                <AvatarImage src={user.avatarUrl} alt={user.fullName} referrerPolicy="no-referrer" />
              )}
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                {user?.fullName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">
                  {user?.fullName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.department || "Executive Board"}
                </p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={logout}
                  className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                >
                  <LogOut className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sign out</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Desktop Sidebar (232px expanded / 60px collapsed) */}
        <aside
          className={`hidden lg:block shrink-0 sticky top-0 h-screen transition-[width] duration-150 ${
            collapsed ? "w-[60px]" : "w-[232px]"
          }`}
        >
          {renderSidebarContent(collapsed)}
        </aside>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar">
            <SheetHeader className="sr-only">
              <SheetTitle>Admin Navigation</SheetTitle>
            </SheetHeader>
            {renderSidebarContent(false)}
          </SheetContent>
        </Sheet>

        {/* Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Admin Header Bar */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 sm:px-6 backdrop-blur">
            <div className="flex items-center gap-2.5 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden cursor-pointer"
              >
                <Menu className="size-4" />
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setCollapsed((prev) => !prev)}
                    className="hidden lg:inline-flex text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {collapsed ? (
                      <PanelLeftOpen className="size-4" />
                    ) : (
                      <PanelLeftClose className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle Sidebar (Ctrl+B)</TooltipContent>
              </Tooltip>

              {/* Dynamic Admin Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                <Link
                  href="/studio"
                  className="hover:text-foreground transition-colors cursor-pointer"
                >
                  Studio
                </Link>
                {breadcrumbs.map((b, i) => (
                  <React.Fragment key={i}>
                    <span className="text-muted-foreground/50">/</span>
                    {b.href ? (
                      <Link
                        href={b.href}
                        className="hover:text-foreground transition-colors cursor-pointer"
                      >
                        {b.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground truncate">
                        {b.label}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            </div>

            {/* Right Quick Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {actions}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSearchOpen(true)}
                className="hidden sm:inline-flex items-center gap-2 h-8 text-xs text-muted-foreground cursor-pointer"
              >
                <Search className="size-3.5" />
                <span>Quick Search...</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                  Ctrl K
                </kbd>
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={toggleTheme}
                    className="cursor-pointer"
                  >
                    {theme === "dark" ? (
                      <Sun className="size-4 text-amber-400" />
                    ) : (
                      <Moon className="size-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle Theme</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>

          <Footer />
        </div>

        <CommandSearch />
      </div>
    </TooltipProvider>
  );
}
