/**
 * Tiện ích cho nội dung chương (JSON tài liệu BlockNote).
 * Không import @blocknote/* để dùng được ở server (API, seed) và trang đọc.
 */
import type {
  CalloutVariant,
  ContentBlock,
  ContentBlockType,
  ContentInline,
  ContentPropValue,
  ContentStyles,
  ContentTable,
  ContentTableCell,
  ContentText,
  GalleryImage,
} from "@/types";

// ─── Inline ──────────────────────────────────────────────────────────────────

const INLINE_PATTERN =
  /\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|~~(.+?)~~|<u>(.+?)<\/u>|`([^`]+)`|(?<![\w*])\*(?!\s)(.+?)\*(?!\w)|(?<!\w)_(?!\s)(.+?)_(?!\w)/g;

function text(value: string, styles: ContentStyles = {}): ContentText {
  return { type: "text", text: value, styles };
}

/**
 * Chuyển chuỗi có định dạng Markdown trong dòng (**đậm**, *nghiêng*, ~~gạch~~,
 * <u>gạch chân</u>, `code`, [nhãn](url)) thành inline content. Không lồng nhau.
 */
export function parseInline(source: string): ContentInline[] {
  const out: ContentInline[] = [];
  let last = 0;
  for (const m of source.matchAll(INLINE_PATTERN)) {
    const index = m.index ?? 0;
    if (index > last) out.push(text(source.slice(last, index)));
    if (m[1] !== undefined) out.push({ type: "link", href: m[2], content: [text(m[1])] });
    else if (m[3] !== undefined) out.push(text(m[3], { bold: true }));
    else if (m[4] !== undefined) out.push(text(m[4], { strike: true }));
    else if (m[5] !== undefined) out.push(text(m[5], { underline: true }));
    else if (m[6] !== undefined) out.push(text(m[6], { code: true }));
    else out.push(text(m[7] ?? m[8] ?? "", { italic: true }));
    last = index + m[0].length;
  }
  if (last < source.length) out.push(text(source.slice(last)));
  return out;
}

export function inlineToText(content: ContentInline[] | undefined): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((c) => (c.type === "link" ? c.content.map((t) => t.text).join("") : c.text ?? ""))
    .join("");
}

export function tableCellContent(cell: ContentInline[] | ContentTableCell): ContentInline[] {
  return Array.isArray(cell) ? cell : cell.content ?? [];
}

export function isTableContent(content: ContentBlock["content"]): content is ContentTable {
  return Boolean(content) && !Array.isArray(content) && (content as ContentTable).type === "tableContent";
}

export function parseGalleryImages(raw: ContentPropValue | undefined): GalleryImage[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is GalleryImage => Boolean(x) && typeof (x as GalleryImage).url === "string")
      .map((x) => ({ url: x.url, caption: typeof x.caption === "string" ? x.caption : undefined }));
  } catch {
    return [];
  }
}

export function splitLines(raw: ContentPropValue | undefined): string[] {
  return typeof raw === "string"
    ? raw.split("\n").map((s) => s.trim()).filter(Boolean)
    : [];
}

// ─── Builders (seed, nội dung mặc định) ──────────────────────────────────────

function block(
  type: ContentBlockType,
  props: Record<string, ContentPropValue> = {},
  content?: ContentBlock["content"]
): ContentBlock {
  return { id: "", type, props, ...(content !== undefined ? { content } : {}), children: [] };
}

export const p = (s: string) => block("paragraph", {}, parseInline(s));
export const h1 = (s: string) => block("heading", { level: 1 }, parseInline(s));
export const h2 = (s: string) => block("heading", { level: 2 }, parseInline(s));
export const h3 = (s: string) => block("heading", { level: 3 }, parseInline(s));
export const quote = (s: string) => block("quote", {}, parseInline(s));
export const ul = (items: string[]) => items.map((s) => block("bulletListItem", {}, parseInline(s)));
export const ol = (items: string[]) => items.map((s) => block("numberedListItem", {}, parseInline(s)));
export const todo = (s: string, checked = false) => block("checkListItem", { checked }, parseInline(s));
export const divider = () => block("divider");
export const code = (language: string, source: string) =>
  block("codeBlock", { language }, [text(source)]);
export const callout = (variant: CalloutVariant, s: string) =>
  block("callout", { variant }, parseInline(s));
export const image = (url: string, caption = "") => block("image", { url, caption });
export const youtube = (url: string, caption = "") => block("youtube", { url, caption });
export const gallery = (title: string, images: GalleryImage[]) =>
  block("gallery", { title, images: JSON.stringify(images) });
export const comparison = (c: {
  title?: string;
  leftTitle: string;
  leftPoints: string[];
  rightTitle: string;
  rightPoints: string[];
}) =>
  block("comparison", {
    title: c.title ?? "",
    leftTitle: c.leftTitle,
    leftPoints: c.leftPoints.join("\n"),
    rightTitle: c.rightTitle,
    rightPoints: c.rightPoints.join("\n"),
  });

/** Bảng: hàng đầu là tiêu đề. */
export const table = (rows: string[][]) =>
  block("table", {}, {
    type: "tableContent",
    columnWidths: (rows[0] ?? []).map(() => null),
    headerRows: 1,
    rows: rows.map((r) => ({
      cells: r.map<ContentTableCell>((c) => ({
        type: "tableCell",
        props: { backgroundColor: "default", textColor: "default", textAlignment: "left" },
        content: parseInline(c),
      })),
    })),
  });

/** Gộp các khối (một số builder trả mảng, ví dụ `ul`). */
export function doc(...parts: (ContentBlock | ContentBlock[])[]): ContentBlock[] {
  return parts.flat();
}

/** Gán id ổn định cho khối chưa có id (TOC dùng id làm anchor). */
export function withIds(blocks: ContentBlock[], prefix: string): ContentBlock[] {
  let n = 0;
  const walk = (list: ContentBlock[]): ContentBlock[] =>
    list.map((b) => ({ ...b, id: b.id || `${prefix}-${++n}`, children: walk(b.children ?? []) }));
  return walk(blocks);
}

// ─── Đọc / chuẩn hóa ─────────────────────────────────────────────────────────

function isContentBlock(value: unknown): value is ContentBlock {
  if (!value || typeof value !== "object") return false;
  const b = value as Partial<ContentBlock> & { content?: unknown };
  return (
    typeof b.id === "string" &&
    typeof b.type === "string" &&
    (b.content === undefined || typeof b.content === "object")
  );
}

/** Lọc JSON không rõ nguồn (DB, localStorage) thành ContentBlock[] hợp lệ. */
export function normalizeContent(value: unknown): ContentBlock[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isContentBlock).map((b) => ({
    ...b,
    props: b.props && typeof b.props === "object" ? b.props : {},
    children: normalizeContent(b.children),
  }));
}

export function countBlocks(blocks: ContentBlock[]): number {
  return blocks.reduce((n, b) => n + 1 + countBlocks(b.children ?? []), 0);
}

function blockText(b: ContentBlock): string {
  const props = b.props ?? {};
  switch (b.type) {
    case "divider":
      return "";
    case "image":
    case "youtube":
      return String(props.caption ?? "");
    case "gallery":
      return [props.title, ...parseGalleryImages(props.images).map((i) => i.caption)]
        .filter(Boolean)
        .join(" ");
    case "comparison":
      return [props.title, props.leftTitle, props.leftPoints, props.rightTitle, props.rightPoints]
        .filter(Boolean)
        .join(" ")
        .replace(/\n/g, " ");
    default:
      if (isTableContent(b.content)) {
        return b.content.rows
          .map((r) => r.cells.map((c) => inlineToText(tableCellContent(c))).join(" "))
          .join(" ");
      }
      return inlineToText(Array.isArray(b.content) ? b.content : undefined);
  }
}

export function extractPlainText(blocks: ContentBlock[]): string {
  const lines: string[] = [];
  const walk = (list: ContentBlock[]) => {
    for (const b of list) {
      const t = blockText(b).trim();
      if (t) lines.push(t);
      walk(b.children ?? []);
    }
  };
  walk(blocks);
  return lines.join("\n").slice(0, 95000);
}

export function estimateReadingTime(plainText: string, blocksCount = 0): number {
  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  // ~200 từ/phút, cộng thời gian xem khối media
  const minutes = Math.ceil(words / 200 + blocksCount * 0.05);
  return Math.max(1, Math.min(300, minutes));
}

export function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = /^\/(?:embed|shorts)\/([\w-]+)/.exec(parsed.pathname);
      return m ? `https://www.youtube.com/embed/${m[1]}` : null;
    }
  } catch {
    return null;
  }
  return null;
}
