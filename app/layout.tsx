import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import { HandbookProvider } from "@/context/HandbookContext";
import { Companion } from "@/components/companion/Companion";
import { SITE_URL } from "@/lib/seo";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const OG_LOCALE: Record<string, string> = { vi: "vi_VN", en: "en_US" };

/**
 * Metadata mặc định = trang chủ (là trang DUY NHẤT cho phép lập chỉ mục).
 * Mọi trang khác tự ghi đè `robots` thành noindex; middleware cũng gắn X-Robots-Tag.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [t, tSeo, locale] = await Promise.all([
    getTranslations("common.meta"),
    getTranslations("seo"),
    getLocale(),
  ]);
  const title = t("title");
  const description = t("description");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: tSeo("titleTemplate", { title: "%s" }) },
    description,
    applicationName: tSeo("siteName"),
    referrer: "no-referrer-when-downgrade",
    icons: { icon: "/icon.svg", shortcut: "/favicon.ico" },
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: "/",
      siteName: tSeo("siteName"),
      type: "website",
      locale: OG_LOCALE[locale] ?? "vi_VN",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`dark ${plusJakarta.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased bg-background text-foreground"
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <HandbookProvider>
            {children}
            <Companion />
          </HandbookProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
