"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useHandbook } from "@/context/HandbookContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  KeyRound,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  User,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const {
    user,
    theme,
    toggleTheme,
    signInWithMpcOidc,
    logout,
  } = useHandbook();

  const handleSsoLogin = () => {
    signInWithMpcOidc(callbackUrl);
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background">
      {/* Left Column: Login Form (shadcn login-02 structure, tuned for MPC-SSO) */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        {/* Brand Header + Theme Switcher */}
        <div className="flex justify-between items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-foreground hover:opacity-90 transition-opacity"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <BookOpen className="size-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight">
                MPClub Handbook
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Where there are bugs, there is MPC
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="size-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Toggle Light / Dark mode"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>
        </div>

        {/* Center: Form Container */}
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-sm space-y-6">
            {/* If user is already authenticated */}
            {user ? (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4 text-center">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <User className="size-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    You are currently signed in as:
                  </p>
                  <h3 className="text-base font-bold text-foreground">
                    {user.fullName}
                  </h3>
                  <div className="flex items-center justify-center gap-1.5 pt-0.5">
                    <Badge variant="outline" className="text-xs">
                      {user.department}
                    </Badge>
                    <Badge
                      variant={user.role === "ADMIN" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {user.role === "ADMIN"
                        ? "Admin"
                        : user.role === "EDITOR"
                        ? "Editor"
                        : "Member"}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground pt-1">
                    {user.email}
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button asChild size="default" className="w-full font-semibold">
                    <Link href={callbackUrl}>
                      <span>Continue to MPC Handbook</span>
                      <ArrowRight className="size-4 ml-1.5" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="w-full text-xs text-muted-foreground hover:text-destructive gap-1.5 cursor-pointer"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign out</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Heading */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <ShieldCheck className="size-6" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    MPC Internal Sign-In Portal
                  </h1>
                  <p className="text-balance text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Online handbook and curriculum roadmap reserved for Academic Programming Club (MPC) members. Centralized authentication via MPC-SSO.
                  </p>
                </div>

                {/* Primary: MPC SSO Button */}
                <Button
                  type="button"
                  size="lg"
                  onClick={handleSsoLogin}
                  className="w-full h-11 gap-2.5 font-semibold cursor-pointer shadow-sm hover:shadow-md transition-all text-sm"
                >
                  <KeyRound className="size-4.5" />
                  <span>Sign in with MPC-SSO</span>
                  <ExternalLink className="size-3.5 ml-auto opacity-70" />
                </Button>

                {/* Terms & Regulations Footer */}
                <p className="text-center text-[11px] text-muted-foreground leading-relaxed pt-2">
                  By signing in, you agree to abide by the{" "}
                  <Link
                    href="/docs/quy-tac-ung-xu-mpc"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    Code of Conduct & Culture
                  </Link>{" "}
                  of the Academic Programming Club.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Featured Image Side (login-bg.jpg with overlay) */}
      <div className="relative hidden bg-zinc-950 lg:block overflow-hidden select-none">
        {/* Background Image: /login-bg.jpg */}
        <img
          src="/login-bg.jpg"
          alt="MPC Club Handbook Background"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.7] brightness-[0.85] transition-opacity duration-700"
          onError={(e) => {
            // Graceful fallback if image has not yet been placed into /public
            (e.target as HTMLElement).style.opacity = "0";
          }}
        />

        {/* Ambient fallback gradient if image not present */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-600/25 via-zinc-950/85 to-zinc-950 -z-10" />

        {/* Ambient atmospheric glows */}
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-amber-500/15 blur-3xl" />

        {/* Overlay Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white bg-gradient-to-t from-black/85 via-black/35 to-black/20">
          <div className="flex items-center gap-2">

          </div>

          <div className="space-y-4 max-w-lg">
            <blockquote className="space-y-2">
              <p className="text-2xl font-bold tracking-tight text-white leading-snug drop-shadow-sm font-sans">
                &ldquo;Where there are bugs, there is MPC.&rdquo;
              </p>
              <footer className="text-sm text-zinc-300 leading-relaxed drop-shadow-xs">
                Internal handbook & member training roadmap — Academic foundation, knowledge sharing, and teamwork.
              </footer>
            </blockquote>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-xs">
          Loading sign-in portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
