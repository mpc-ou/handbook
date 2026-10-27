"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  Compass,
  ExternalLink,
  Github,
  Globe,
  Heart,
  Sparkles,
} from "lucide-react";

export function Footer() {
  const repoUrl = "https://github.com/mpc-club/handbook";
  const mainSiteUrl = "https://mpclub.dev";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-muted/20 dark:bg-card/30 text-foreground transition-colors select-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-md">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity"
            >
              <span className="flex size-7 items-center justify-center rounded-lg shadow-xs shadow-orange-500/20">
                <img src="/icon.svg" alt="MPClub Logo" className="size-6" />
              </span>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-base font-extrabold tracking-tight">MPClub</span>
                <span className="text-xs font-semibold text-primary">Handbook</span>
              </div>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Internal Handbook & Training Curriculum platform for the Academic Programming Club (MPC).
              Published as an open-source initiative.
            </p>

            <div className="flex items-center gap-2 pt-0.5">
              <Badge
                variant="outline"
                className="gap-1 text-[10px] font-mono border-primary/30 text-primary bg-primary/5 py-0 px-2"
              >
                <Code2 className="size-3" />
                <span>Open Source</span>
              </Badge>
              <Badge
                variant="secondary"
                className="text-[10px] font-mono py-0 px-2 text-muted-foreground"
              >
                MIT License
              </Badge>
            </div>
          </div>

          {/* Quick Navigation & External Links */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
            <a
              href={mainSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-medium group"
            >
              <Globe className="size-3.5 text-primary/80 group-hover:text-primary transition-colors" />
              <span>mpclub.dev</span>
              <ExternalLink className="size-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>

            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium group"
            >
              <Github className="size-3.5 group-hover:text-foreground transition-colors" />
              <span>GitHub Repository</span>
              <ExternalLink className="size-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <Compass className="size-3.5" />
              <span>Curriculum Roadmap</span>
            </Link>
          </div>
        </div>

        {/* Bottom Micro Bar */}
        <div className="border-t border-border/40 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-muted-foreground">
          <p>
            &copy; {currentYear}{" "}
            <a
              href={mainSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline"
            >
              Mobile Programming Club (MPC)
            </a>
            . Open-source software.
          </p>

          <div className="flex items-center gap-1 text-muted-foreground/80">
            <span>Where there are bugs, there is MPC!</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
