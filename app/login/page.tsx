"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useHandbook } from "@/context/HandbookContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
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
    ssoStatus,
    showToast,
  } = useHandbook();

  const isEmailLoginActive = ssoStatus?.emailLoginEnabled ?? true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSsoLogin = () => {
    signInWithMpcOidc(callbackUrl);
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (res?.error) {
        const errorText =
          res.error === "CredentialsSignin"
            ? "Invalid email or password."
            : res.error;
        setErrorMessage(errorText);
        showToast("Sign in failed. Please check your credentials.", "error");
      } else {
        showToast("Signed in successfully!", "success");
        if (typeof window !== "undefined") {
          localStorage.removeItem("mpc_auth_state");
        }
        window.location.href = callbackUrl;
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An error occurred during sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background">
      {/* Left Column: Login Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        {/* Brand Header + Theme Switcher */}
        <div className="flex justify-between items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-foreground hover:opacity-90 transition-opacity"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
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
                    <img src="/logo.png" alt="MPC Logo" className="size-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    MPC Internal Sign-In Portal
                  </h1>
                  <p className="text-balance text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {isEmailLoginActive
                      ? "Sign in with your authorized MPC-SSO account or club member credentials."
                      : "Secure authentication portal for MPC club members via Single Sign-On."}
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

                {/* Email + Password Section (Only if isEmailLoginActive is true) */}
                {isEmailLoginActive && (
                  <>
                    {/* Divider */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <span className="relative bg-background px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        or sign in with email
                      </span>
                    </div>

                    {/* Email + Password Login Form */}
                    <form onSubmit={handleCredentialsLogin} className="space-y-4">
                      {errorMessage && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs leading-relaxed">
                          {errorMessage}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-medium">
                          Member Email
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="first.last@mpclub.dev"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="pl-9 text-xs h-10"
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password" className="text-xs font-medium">
                            Password
                          </Label>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="pl-9 pr-9 text-xs h-10"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-10 font-semibold text-xs cursor-pointer gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In</span>
                            <ArrowRight className="size-4 ml-0.5" />
                          </>
                        )}
                      </Button>
                    </form>

                    {/* Notice: No public registration */}
                    <div className="rounded-lg bg-muted/40 p-3 border border-border/60 text-center">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Public self-registration is closed. Accounts are provisioned by MPC Administrators or automatically linked upon MPC-SSO sign-in.
                      </p>
                    </div>
                  </>
                )}

                {/* Terms & Regulations Footer */}
                <p className="text-center text-[11px] text-muted-foreground leading-relaxed pt-1">
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

      {/* Right Column: Featured Image Side */}
      <div className="relative hidden bg-zinc-950 lg:block overflow-hidden select-none">
        <img
          src="/login-bg.jpg"
          alt="MPC Club Handbook Background"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.7] brightness-[0.85] transition-opacity duration-700"
          onError={(e) => {
            (e.target as HTMLElement).style.opacity = "0";
          }}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-600/25 via-zinc-950/85 to-zinc-950 -z-10" />
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-96 rounded-full bg-amber-500/15 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white bg-gradient-to-t from-black/85 via-black/35 to-black/20">
          <div className="flex items-center gap-2" />
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
