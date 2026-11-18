"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("nav.footer");
  const repoUrl = "https://github.com/mpc-club/handbook";
  const mainSiteUrl = "https://mpclub.dev";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-background text-muted-foreground select-none">
      <div className="mx-auto max-w-6xl px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="MPClub" className="size-4" />
            <span>MPClub Handbook</span>
          </div>
          <p className="text-muted-foreground">{t("tagline")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="hover:text-foreground transition-colors"
          >
            {t("home")}
          </Link>
          <a
            href={mainSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            {t("website")}
          </a>
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            {t("github")}
          </a>
          <span className="text-muted-foreground/70">
            {t("copyright", { year: currentYear })}
          </span>
        </div>
      </div>
    </footer>
  );
}
