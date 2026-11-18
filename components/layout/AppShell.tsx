"use client";

import React, { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { TopHeader } from "./TopHeader";
import { AppSidebar } from "./AppSidebar";
import { CommandSearch } from "./CommandSearch";
import { Footer } from "./Footer";
import { useHandbook } from "@/context/HandbookContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AppShellProps {
  children: React.ReactNode;
  hideLeftSidebar?: boolean;
  hideRightSidebar?: boolean;
}

/**
 * AppShell: Khung giao diện chính (Header, Sidebar khóa học đang xem, CommandSearch, Footer).
 * Sidebar chỉ hiển thị trên các trang `/learn/[course]/...` (trừ trang chứng nhận hoặc khi ép ẩn),
 * hỗ trợ cả khách lẫn thành viên đã đăng nhập.
 */
export function AppShell({ children, hideLeftSidebar = false }: AppShellProps) {
  const pathname = usePathname();
  const t = useTranslations("nav.sidebar");
  const { courses } = useHandbook();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const hasActiveLearnCourse = useMemo(() => {
    if (!pathname.startsWith("/learn/")) return false;
    const segments = pathname
      .replace(/^\/learn\/?/, "")
      .split("/")
      .filter(Boolean)
      .map((s) => decodeURIComponent(s));
    const [courseSlug, secondSegment] = segments;
    if (!courseSlug || secondSegment === "certificate") return false;
    return courses.some((c) => c.slug === courseSlug || c.id === courseSlug);
  }, [pathname, courses]);

  const shouldHideSidebar = hideLeftSidebar || !hasActiveLearnCourse;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <TopHeader
          onOpenMobileSidebar={
            shouldHideSidebar ? undefined : () => setMobileSidebarOpen(true)
          }
        />

        <CommandSearch />

        {!shouldHideSidebar && (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar">
              <SheetHeader className="sr-only">
                <SheetTitle>{t("sheetTitle")}</SheetTitle>
                <SheetDescription>{t("sheetDescription")}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-hidden h-full">
                <AppSidebar onNavigate={() => setMobileSidebarOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        )}

        <div className="flex flex-1">
          {!shouldHideSidebar && (
            <div className="hidden lg:block shrink-0">
              <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
                <AppSidebar />
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col">
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
