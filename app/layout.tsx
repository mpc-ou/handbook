import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { HandbookProvider } from "@/context/HandbookContext";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  referrer: "no-referrer-when-downgrade",
  title: "MPC Handbook — Internal Handbook & Curriculum Roadmap",
  description:
    "Standardized internal handbook and sequential curriculum system for the Academic Programming Club (MPC), featuring MPC-SSO, BlockNote editor, and assessments.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "MPC Handbook — Internal Handbook & Curriculum Roadmap",
    description:
      "Standardized internal handbook and sequential curriculum system for the Academic Programming Club (MPC), featuring MPC-SSO, BlockNote editor, and assessments.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MPC Handbook — Internal Handbook & Curriculum Roadmap",
    description:
      "Standardized internal handbook and sequential curriculum system for the Academic Programming Club (MPC), featuring MPC-SSO, BlockNote editor, and assessments.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${plusJakarta.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased bg-background text-foreground"
        suppressHydrationWarning
      >
        <HandbookProvider>{children}</HandbookProvider>
      </body>
    </html>
  );
}
