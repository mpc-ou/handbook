import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/**
 * Extracts publicId from standard Cloudinary secure URL:
 * https://res.cloudinary.com/<cloud_name>/image/upload/.../mpc_handbook_assets/abcxyz.png
 */
export function extractPublicIdFromUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(?:[^\/]+\/)?(mpc_handbook_assets\/[^.]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Delete asset from Cloudinary by public ID
 */
export async function deleteCloudinaryAsset(publicId: string): Promise<boolean> {
  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
    });
    return res?.result === "ok" || res?.result === "not found";
  } catch (err) {
    console.error(`Failed to delete Cloudinary asset (${publicId}):`, err);
    return false;
  }
}

/**
 * Scans article content, attachments, and cover image to extract all active Cloudinary URLs
 */
export function extractCloudinaryUrlsFromArticle(article: {
  coverImage?: string | null;
  content?: any;
  attachments?: any;
}): string[] {
  const urls: string[] = [];
  if (article.coverImage) urls.push(article.coverImage);

  const scanJson = (data: any) => {
    if (!data) return;
    if (typeof data === "string") {
      if (data.includes("cloudinary.com") && data.includes("mpc_handbook_assets")) {
        urls.push(data);
      }
    } else if (Array.isArray(data)) {
      for (const item of data) scanJson(item);
    } else if (typeof data === "object") {
      for (const val of Object.values(data)) scanJson(val);
    }
  };

  scanJson(article.content);
  scanJson(article.attachments);
  return Array.from(new Set(urls));
}

/**
 * Sync active files for an article: Marks active files as isAttached = true,
 * and if any previous file was removed from the article, marks or cleans it up.
 */
export async function syncArticleAttachments(articleId: string, activeUrls: string[]) {
  const activePublicIds = activeUrls
    .map(extractPublicIdFromUrl)
    .filter((id): id is string => Boolean(id));

  if (activePublicIds.length > 0) {
    await prisma.uploadedFile.updateMany({
      where: {
        publicId: { in: activePublicIds },
      },
      data: {
        isAttached: true,
        articleId,
      },
    });
  }
}

