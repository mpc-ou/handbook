"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useHandbook } from "@/context/HandbookContext";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Moon,
  Sun,
  User,
} from "lucide-react";

function LoginForm() {
  const t = useTranslations("auth");
  const tNav = useTranslations("nav.header");
  const tRoles = useTranslations("nav.roles");
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
      setErrorMessage(t("errors.missingFields"));
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
            ? t("errors.invalidCredentials")
            : res.error;
        setErrorMessage(errorText);
        showToast(t("errors.failedToast"), "error");
      } else {
        showToast(t("successToast"), "success");
        if (typeof window !== "undefined") {
          localStorage.removeItem("mpc_auth_state");
        }
        window.location.href = callbackUrl;
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("errors.generic")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {/* Minimal Header */}
      <header className="flex h-14 items-center justify-between px-4 sm:px-8 border-b border-border/60">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="MPClub" className="size-6" />
          <span>
            MPClub <span className="text-primary font-semibold">Handbook</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <LanguageSwitcher />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label={tNav("toggleTheme")}
            title={tNav("toggleTheme")}
            className="cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="size-4 text-amber-400" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {user ? (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4 text-center">
              <div className="size-11 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <User className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {t("signedIn.label")}
                </p>
                <h1 className="text-base font-bold text-foreground">
                  {user.fullName}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {tRoles(user.role)}
                  {user.department ? ` · ${user.department}` : ""}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  {user.email}
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <Button asChild className="w-full font-semibold">
                  <Link href={callbackUrl}>
                    <span>{t("signedIn.continue")}</span>
                    <ArrowRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void logout();
                  }}
                  className="w-full text-xs text-muted-foreground hover:text-destructive gap-1.5 cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>{t("signedIn.signOut")}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1.5 text-center">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {t("title")}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {isEmailLoginActive
                    ? t("subtitleWithEmail")
                    : t("subtitleSsoOnly")}
                </p>
              </div>

              {/* Primary Action: MPC-SSO */}
              <Button
                type="button"
                size="lg"
                onClick={handleSsoLogin}
                className="w-full h-10 gap-2 font-semibold cursor-pointer text-sm"
              >
                <KeyRound className="size-4" />
                <span>{t("ssoButton")}</span>
              </Button>

              {isEmailLoginActive && (
                <>
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <span className="relative bg-background px-3 text-[11px] text-muted-foreground">
                      {t("orEmail")}
                    </span>
                  </div>

                  <form onSubmit={handleCredentialsLogin} className="space-y-4">
                    {errorMessage && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                        {errorMessage}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-medium">
                        {t("emailLabel")}
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t("emailPlaceholder")}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pl-9 text-xs h-9"
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-xs font-medium">
                        {t("passwordLabel")}
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t("passwordPlaceholder")}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pl-9 pr-9 text-xs h-9"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={
                            showPassword
                              ? t("hidePassword")
                              : t("showPassword")
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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
                      variant="outline"
                      disabled={isSubmitting}
                      className="w-full h-9 font-semibold text-xs cursor-pointer gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span>{t("submitting")}</span>
                        </>
                      ) : (
                        <span>{t("submit")}</span>
                      )}
                    </Button>
                  </form>

                  <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                    {t("noPublicRegistration")}
                  </p>
                </>
              )}

              <div className="text-center pt-1">
                <Link
                  href="/"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("backHome")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  const t = useTranslations("auth");
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-xs">
          {t("loading")}
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
