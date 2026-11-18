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
  // Cho phép nhiều đoạn transform (f_auto,q_auto/…) và version (v123/) trước public id
  const match = url.match(/\/upload\/(?:[^\/]+\/)*?(?:v\d+\/)?(mpc_handbook_assets\/[^.?#]+)/);
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

function scanForCloudinaryUrls(data: unknown, urls: string[]) {
  if (!data) return;
  if (typeof data === "string") {
    if (data.includes("cloudinary.com") && data.includes("mpc_handbook_assets")) {
      urls.push(data);
    }
  } else if (Array.isArray(data)) {
    for (const entry of data) scanForCloudinaryUrls(entry, urls);
  } else if (typeof data === "object") {
    for (const val of Object.values(data)) scanForCloudinaryUrls(val, urls);
  }
}

/** URL Cloudinary đang dùng bởi ảnh bìa (Course/Lesson). */
export function extractCloudinaryUrlsFromCover(coverImage?: string | null): string[] {
  const urls: string[] = [];
  scanForCloudinaryUrls(coverImage, urls);
  return urls;
}

/** URL Cloudinary đang dùng trong nội dung và tệp đính kèm của Item. */
export function extractCloudinaryUrlsFromItem(item: {
  content?: unknown;
  attachments?: unknown;
}): string[] {
  const urls: string[] = [];
  scanForCloudinaryUrls(item.content, urls);
  scanForCloudinaryUrls(item.attachments, urls);
  return Array.from(new Set(urls));
}

export type AttachmentOwner =
  | { courseId: string }
  | { lessonId: string }
  | { itemId: string };

/**
 * Đồng bộ file của một owner (Course/Lesson/Item):
 * - file đang dùng: isAttached = true và gắn vào owner;
 * - file từng gắn vào owner nhưng không còn dùng: gỡ attach để cron cleanup xóa.
 */
export async function syncAttachments(owner: AttachmentOwner, activeUrls: string[]) {
  const activePublicIds = activeUrls
    .map(extractPublicIdFromUrl)
    .filter((id): id is string => Boolean(id));

  if (activePublicIds.length > 0) {
    await prisma.uploadedFile.updateMany({
      where: { publicId: { in: activePublicIds } },
      data: { isAttached: true, ...owner },
    });
  }

  await prisma.uploadedFile.updateMany({
    where: { ...owner, publicId: { notIn: activePublicIds } },
    data: { isAttached: false },
  });
}

