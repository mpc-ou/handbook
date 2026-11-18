import { prisma } from "@/lib/prisma";

const FALLBACK_SITE_URL = "https://handbook.mpclub.dev";

/** URL gốc của site (dùng cho canonical, og:url, sitemap). Lấy từ APP_URL, bỏ qua giá trị mẫu. */
export const SITE_URL = (() => {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  return (/^https?:\/\//.test(raw) ? raw : FALLBACK_SITE_URL).replace(/\/+$/, "");
})();

/** Rút gọn văn bản thành đoạn trích ngắn, cắt ở ranh giới từ. */
export function excerpt(text: string | null | undefined, max = 160): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!?-]+$/, "")}…`;
}

export type PreviewKind = "course" | "lesson" | "item";

export interface PreviewTarget {
  kind: PreviewKind;
  /** true = nội dung công khai, được phép lộ tiêu đề + đoạn trích + ảnh bìa. */
  isPublic: boolean;
  title?: string;
  description?: string;
  /** Ảnh bìa của khóa học/bài học (chỉ khi công khai). */
  coverUrl?: string;
  /** Dòng nhỏ phía trên tiêu đề, ví dụ "Khóa học › Bài học". */
  trail?: string[];
  itemType?: "CONTENT" | "QUIZ" | "ASSIGNMENT";
}

/**
 * Link preview chạy ở phía crawler (Facebook, Zalo, Slack, Discord…): không có cookie/đăng nhập,
 * nên CHỈ được lộ những gì ai cũng xem được. Công khai khi và chỉ khi:
 *   khóa học PUBLISHED + visibility PUBLIC + audience FREE + không giới hạn nhóm,
 *   bài học đã xuất bản, chương đã xuất bản.
 * Mọi trường hợp khác (nháp, nội bộ, giới hạn nhóm, không tồn tại) đều trả về "không công khai"
 * với cùng một kết quả nên không lộ việc nội dung có tồn tại hay không.
 */
export async function resolvePreview(
  courseSlug: string,
  lessonSlug?: string,
  itemSlug?: string
): Promise<PreviewTarget> {
  const kind: PreviewKind = itemSlug ? "item" : lessonSlug ? "lesson" : "course";
  const hidden: PreviewTarget = { kind, isPublic: false };

  try {
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
      select: {
        id: true,
        title: true,
        summary: true,
        coverImage: true,
        status: true,
        visibility: true,
        audience: true,
        allowedGroups: true,
      },
    });
    if (!course) return hidden;

    const groups = Array.isArray(course.allowedGroups) ? course.allowedGroups : [];
    const coursePublic =
      course.status === "PUBLISHED" &&
      course.visibility === "PUBLIC" &&
      course.audience === "FREE" &&
      groups.length === 0;
    if (!coursePublic) return hidden;

    if (kind === "course") {
      return {
        kind,
        isPublic: true,
        title: course.title,
        description: excerpt(course.summary),
        coverUrl: course.coverImage ?? undefined,
      };
    }

    const lesson = await prisma.lesson.findUnique({
      where: { courseId_slug: { courseId: course.id, slug: lessonSlug! } },
      select: { id: true, title: true, summary: true, coverImage: true, isPublished: true },
    });
    if (!lesson || !lesson.isPublished) return hidden;

    if (kind === "lesson") {
      return {
        kind,
        isPublic: true,
        title: lesson.title,
        description: excerpt(lesson.summary || course.summary),
        // Bài học không có ảnh bìa riêng thì dùng ảnh của khóa học
        coverUrl: lesson.coverImage ?? course.coverImage ?? undefined,
        trail: [course.title],
      };
    }

    const item = await prisma.item.findUnique({
      where: { lessonId_slug: { lessonId: lesson.id, slug: itemSlug! } },
      select: { title: true, summary: true, plainText: true, type: true, status: true },
    });
    if (!item || item.status !== "PUBLISHED") return hidden;

    // Chỉ chương đọc mới có đoạn trích nội dung; trắc nghiệm/bài tập không bao giờ lộ câu hỏi
    const description =
      item.type === "CONTENT" ? excerpt(item.summary || item.plainText) : excerpt(item.summary);

    return {
      kind,
      isPublic: true,
      title: item.title,
      description,
      // Chương không có ảnh bìa: dùng ảnh của bài học/khóa học
      coverUrl: lesson.coverImage ?? course.coverImage ?? undefined,
      trail: [course.title, lesson.title],
      itemType: item.type,
    };
  } catch (error) {
    console.error("resolvePreview failed:", error);
    return hidden;
  }
}

/**
 * Ảnh bìa dùng làm nền ảnh xem trước: chỉ nhận ảnh Cloudinary (đổi sang jpg 1200×630 để bộ vẽ ảnh đọc được).
 * `preset:*` và URL ngoài → null (dùng nền gradient thương hiệu).
 */
export function ogCoverUrl(cover?: string | null): string | null {
  if (!cover || !/^https:\/\/res\.cloudinary\.com\//.test(cover)) return null;
  const transform = "c_fill,g_auto,w_1200,h_630,f_jpg,q_80";
  return cover.replace(
    /\/upload\/(?:[^/]+\/)*?(?=v\d+\/|mpc_handbook_assets\/)/,
    `/upload/${transform}/`
  );
}
