"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import confetti from "canvas-confetti";
import { useHandbook } from "@/context/HandbookContext";
import { AppShell } from "@/components/layout/AppShell";
import { ProgressBar } from "@/components/ui/animated-progress";
import { getCourseItemsInOrder, getCourseProgress } from "@/lib/progression";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Award, Lock, Printer } from "lucide-react";

interface CertificatePageProps {
  params: Promise<{
    course: string;
  }>;
}

function buildVerificationCode(uid: string, courseId: string): string {
  const input = `${uid}:${courseId}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (n: number) => {
    let s = "";
    let v = n >>> 0;
    for (let i = 0; i < 4; i++) {
      s += alphabet[v % alphabet.length];
      v = Math.floor(v / alphabet.length);
    }
    return s;
  };
  return `MPC-${part(h1)}-${part(h2)}`;
}

export default function CourseCertificatePage({
  params,
}: CertificatePageProps) {
  const { course: courseSlug } = React.use(params);
  const t = useTranslations("certificate");
  const format = useFormatter();
  const reduceMotion = useReducedMotion();

  const {
    user,
    courses,
    lessons,
    items,
    progressMap,
    dataLoading,
    authLoading,
    signInWithMpcOidc,
  } = useHandbook();

  const course = courses.find((c) => c.slug === courseSlug);

  const courseProgress = course
    ? getCourseProgress(course.id, lessons, items, progressMap)
    : { completed: 0, total: 0, percent: 0 };

  const isEligible = Boolean(
    user && course && courseProgress.total > 0 && courseProgress.percent === 100
  );

  const firedConfettiRef = useRef(false);

  useEffect(() => {
    if (isEligible && !firedConfettiRef.current && !reduceMotion) {
      firedConfettiRef.current = true;
      try {
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    }
  }, [isEligible, reduceMotion]);

  if (dataLoading || authLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  if (!course) {
    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
          <h1 className="text-xl font-bold text-foreground">
            {t("notFoundTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("notFoundDesc")}</p>
          <Button asChild size="sm">
            <Link href="/">
              <ArrowLeft className="size-4 mr-1.5" />
              <span>{t("backToHome")}</span>
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell hideLeftSidebar={true} hideRightSidebar={true}>
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
          <Lock className="size-8 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">
            {t("locked.loginTitle")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("locked.loginDesc")}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={() =>
                signInWithMpcOidc(`/learn/${course.slug}/certificate`)
              }
              className="cursor-pointer"
            >
              {t("locked.loginBtn")}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/learn/${course.slug}`}>{t("backToCourse")}</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!isEligible) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-6 py-20 text-center space-y-5">
          <Award className="size-9 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">
              {t("locked.incompleteTitle")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("locked.incompleteDesc", {
                completed: courseProgress.completed,
                total: courseProgress.total,
                percent: courseProgress.percent,
                title: course.title,
              })}
            </p>
          </div>

          <ProgressBar value={courseProgress.percent} heightClassName="h-2" />

          <div className="pt-2">
            <Button asChild className="font-semibold">
              <Link href={`/learn/${course.slug}`}>
                {t("locked.continueCourseBtn")}
              </Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const orderedItems = getCourseItemsInOrder(course.id, lessons, items);
  const completedTimestamps = orderedItems
    .map((it) => progressMap[it.id]?.completedAt)
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d).getTime())
    .filter((time) => Number.isFinite(time));

  const latestCompletedDate =
    completedTimestamps.length > 0
      ? new Date(Math.max(...completedTimestamps))
      : new Date();

  const formattedCompletionDate = format.dateTime(latestCompletedDate, {
    dateStyle: "long",
  });

  const verificationCode = buildVerificationCode(user.uid, course.id);

  return (
    <AppShell>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #mpc-certificate-card,
          #mpc-certificate-card * {
            visibility: visible !important;
          }
          #mpc-certificate-card {
            position: fixed !important;
            inset: 0 !important;
            margin: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Top Action Bar (hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Button asChild variant="ghost" size="sm" className="gap-1.5">
            <Link href={`/learn/${course.slug}`}>
              <ArrowLeft className="size-4" />
              <span>{t("backToCourse")}</span>
            </Link>
          </Button>

          <Button
            type="button"
            onClick={() => window.print()}
            className="gap-2 font-semibold cursor-pointer"
          >
            <Printer className="size-4" />
            <span>{t("printBtn")}</span>
          </Button>
        </div>

        {/* Certificate Card */}
        <motion.div
          id="mpc-certificate-card"
          initial={
            reduceMotion ? false : { opacity: 0, y: 12, scale: 0.985 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }
          }
          className="rounded-2xl border border-stone-300 bg-stone-50 p-4 sm:p-6 text-stone-900 shadow-sm"
        >
          <div className="rounded-xl border border-stone-200 px-6 py-10 sm:px-14 sm:py-14 text-center space-y-8">
            {/* Organization Header */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                {t("card.organization")}
              </p>
              <h1 className="text-lg sm:text-xl font-semibold tracking-wide text-stone-800 uppercase">
                {t("card.badge")}
              </h1>
            </div>

            {/* Recipient */}
            <div className="space-y-3 py-2">
              <p className="text-xs sm:text-sm text-stone-500 italic">
                {t("card.presentedTo")}
              </p>
              <p className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-stone-900">
                {user.fullName}
              </p>
              <div className="mx-auto h-px w-48 bg-stone-300" />
            </div>

            {/* Course Info */}
            <div className="space-y-2 max-w-xl mx-auto">
              <p className="text-xs sm:text-sm text-stone-600">
                {t("card.completedCourse")}
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 text-balance">
                {course.title}
              </h2>
            </div>

            {/* Footer Meta: Date, Issuer, Verification Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-stone-200 text-xs">
              <div className="space-y-1">
                <span className="text-stone-500 block">
                  {t("card.dateLabel")}
                </span>
                <span className="font-medium text-stone-800">
                  {formattedCompletionDate}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-stone-500 block">
                  {t("card.issuerLabel")}
                </span>
                <span className="font-semibold text-stone-800">
                  {t("card.issuerValue")}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-stone-500 block">
                  {t("card.codeLabel")}
                </span>
                <span className="font-mono font-semibold text-stone-800 tracking-wider">
                  {verificationCode}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
