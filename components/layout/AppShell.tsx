"use client";

import React, { useState } from "react";
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
 * AppShell: Main layout shell (Header, Sidebar, Command Search Ctrl+K, Mobile Drawer).
 * Sidebar is visible only for authenticated club members; for guests or restricted views,
 * sidebar is completely hidden to protect internal curriculum privacy.
 */
export function AppShell({ children, hideLeftSidebar = false }: AppShellProps) {
  const { user } = useHandbook();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // If hideLeftSidebar is explicitly requested OR user is not logged in (guest), hide the sidebar
  const shouldHideSidebar = hideLeftSidebar || !user;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <TopHeader
          onOpenMobileSidebar={
            shouldHideSidebar ? undefined : () => setMobileSidebarOpen(true)
          }
        />

        <CommandSearch />

        {/* Mobile Sidebar Sheet (Shadcn Drawer) - Only active when logged in */}
        {!shouldHideSidebar && (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar">
              <SheetHeader className="px-4 py-3 text-left">
                <SheetTitle>MPC Handbook Navigation</SheetTitle>
                <SheetDescription>
                  Training curriculum and club operating guidelines
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-hidden">
                <AppSidebar onNavigate={() => setMobileSidebarOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Main Content Workspace */}
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
