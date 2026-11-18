import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { resolvePreview, type PreviewTarget } from "@/lib/seo";

const OG_LOCALE: Record<string, string> = { vi: "vi_VN", en: "en_US" };

/** Mọi trang ngoài trang chủ: không cho công cụ tìm kiếm lập chỉ mục (kèm header X-Robots-Tag ở middleware). */
export const NOINDEX = { index: false, follow: false, nocache: true } as const;

/**
 * Metadata + Open Graph + Twitter cho trang nội dung học tập.
 * Ảnh xem trước do `opengraph-image.tsx` cùng segment sinh ra (cùng quy tắc riêng tư).
 * Nội dung không công khai chỉ nhận metadata chung "Nội dung nội bộ", không lộ tiêu đề/mô tả.
 */
export async function previewMetadata(target: PreviewTarget, path: string): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("seo"), getLocale()]);

  const title = target.isPublic && target.title ? target.title : t("private.title");
  const description = target.isPublic
    ? target.description || t("tagline")
    : t("private.description");
  const fullTitle = target.isPublic ? t("titleTemplate", { title }) : title;

  return {
    title: { absolute: fullTitle },
    description,
    robots: NOINDEX,
    // canonical chỉ cho nội dung công khai (không để lộ đường dẫn của nội dung nội bộ)
    ...(target.isPublic ? { alternates: { canonical: path } } : {}),
    openGraph: {
      title: fullTitle,
      description,
      url: target.isPublic ? path : undefined,
      siteName: t("siteName"),
      type: target.isPublic && target.kind === "item" ? "article" : "website",
      locale: OG_LOCALE[locale] ?? "vi_VN",
    },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}

/** Metadata theo đường dẫn slug, dùng cho layout/page của /learn. */
export async function learnMetadata(
  path: string,
  courseSlug: string,
  lessonSlug?: string,
  itemSlug?: string
): Promise<Metadata> {
  return previewMetadata(await resolvePreview(courseSlug, lessonSlug, itemSlug), path);
}

/** Trang riêng tư của ứng dụng (đăng nhập, hồ sơ, studio, chứng nhận): tiêu đề chung + noindex. */
export async function privatePageMetadata(
  page: "login" | "profile" | "studio" | "certificate"
): Promise<Metadata> {
  const t = await getTranslations("seo");
  return {
    title: t(`pages.${page}`),
    robots: NOINDEX,
    openGraph: { title: t("titleTemplate", { title: t(`pages.${page}`) }), siteName: t("siteName") },
  };
}
