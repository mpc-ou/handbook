import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** Chỉ trang chủ được lập chỉ mục nên sitemap chỉ có một URL. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 }];
}
