import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Công cụ tìm kiếm: chỉ trang chủ. Mọi trang khác bị chặn (và còn có noindex + X-Robots-Tag).
 *
 * Bot tạo link preview (Facebook, Zalo, Slack, Discord, Telegram, Twitter/X, LinkedIn, WhatsApp...)
 * không phải công cụ tìm kiếm nên được phép lấy trang /learn + ảnh xem trước. Họ không có đăng nhập,
 * nên chỉ thấy metadata công khai (xem lib/seo.ts), nội dung nội bộ luôn là thẻ chung.
 */
const LINK_PREVIEW_BOTS = [
  "facebookexternalhit",
  "Facebot",
  "meta-externalagent",
  "Twitterbot",
  "Slackbot",
  "Slackbot-LinkExpanding",
  "Slack-ImgProxy",
  "Discordbot",
  "TelegramBot",
  "WhatsApp",
  "LinkedInBot",
  "Pinterestbot",
  "Zalo",
  "ZaloBot",
  "SkypeUriPreview",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: LINK_PREVIEW_BOTS,
        allow: ["/$", "/learn/"],
        disallow: ["/studio", "/api/", "/login", "/profile"],
      },
      // Longest-match: "/$" (đúng trang chủ) thắng "/" (mọi thứ còn lại)
      { userAgent: "*", allow: "/$", disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
