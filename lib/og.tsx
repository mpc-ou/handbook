import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { excerpt, ogCoverUrl, type PreviewTarget } from "@/lib/seo";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

const FONT_FILES = [
  { file: "plus-jakarta-sans-latin-500-normal.woff", weight: 500 },
  { file: "plus-jakarta-sans-vietnamese-500-normal.woff", weight: 500 },
  { file: "plus-jakarta-sans-latin-700-normal.woff", weight: 700 },
  { file: "plus-jakarta-sans-vietnamese-700-normal.woff", weight: 700 },
] as const;

type OgFont = { name: string; data: Buffer; weight: 500 | 700; style: "normal" };
let fontCache: Promise<OgFont[]> | null = null;

/** Font có glyph tiếng Việt (satori không tự có). Đọc một lần rồi giữ trong bộ nhớ. */
function loadFonts(): Promise<OgFont[]> {
  fontCache ??= Promise.all(
    FONT_FILES.map(async ({ file, weight }) => ({
      name: "Jakarta",
      data: await readFile(path.join(process.cwd(), "assets", "fonts", file)),
      weight,
      style: "normal" as const,
    }))
  );
  return fontCache;
}

interface OgContent {
  badge: string;
  title: string;
  description?: string;
  trail?: string;
  coverUrl: string | null;
  domain: string;
  locked: boolean;
}

function clampTitle(title: string): { text: string; size: number } {
  const text = excerpt(title, 110);
  const size = text.length > 70 ? 52 : text.length > 40 ? 60 : 72;
  return { text, size };
}

function OgCard({ c }: { c: OgContent }) {
  const { text, size } = clampTitle(c.title);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        fontFamily: "Jakarta",
        color: "#fafafa",
        background: "linear-gradient(135deg, #0c0a09 0%, #1c1210 55%, #3a1706 100%)",
      }}
    >
      {c.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.coverUrl}
          width={1200}
          height={630}
          alt=""
          style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            right: -140,
            top: -140,
            width: 520,
            height: 520,
            borderRadius: 520,
            background: "rgba(249,115,22,0.22)",
          }}
        />
      )}
      {/* Lớp tối để chữ luôn đọc được trên mọi ảnh bìa */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1200,
          height: 630,
          background: c.coverUrl
            ? "linear-gradient(180deg, rgba(10,8,7,0.45) 0%, rgba(10,8,7,0.92) 78%)"
            : "transparent",
        }}
      />

      <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", padding: "56px 72px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 700 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "#f97316" }} />
            <span>MPC Handbook</span>
          </div>
          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: 999,
              border: "2px solid rgba(250,250,250,0.35)",
              fontSize: 24,
              fontWeight: 500,
              color: c.locked ? "#fdba74" : "#fafafa",
            }}
          >
            {c.badge}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {c.trail ? (
            <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: "#fdba74" }}>{excerpt(c.trail, 90)}</div>
          ) : null}
          <div style={{ display: "flex", fontSize: size, fontWeight: 700, lineHeight: 1.12, letterSpacing: -1 }}>{text}</div>
          {c.description ? (
            <div style={{ display: "flex", fontSize: 30, fontWeight: 500, lineHeight: 1.35, color: "rgba(250,250,250,0.82)" }}>
              {excerpt(c.description, 150)}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: "rgba(250,250,250,0.6)" }}>{c.domain}</div>
      </div>
    </div>
  );
}

/**
 * Vẽ ảnh xem trước liên kết (1200×630).
 * - `target = null`: ảnh chung của trang chủ.
 * - target công khai: tên + đoạn trích + ảnh bìa.
 * - target không công khai: ảnh "nội dung nội bộ" chung, không lộ tiêu đề/nội dung.
 */
export async function renderOgImage(target: PreviewTarget | null): Promise<ImageResponse> {
  const t = await getTranslations("seo");
  const domain = t("domain");

  let content: OgContent;
  if (!target) {
    content = { badge: t("siteName"), title: t("siteName"), description: t("tagline"), coverUrl: null, domain, locked: false };
  } else if (!target.isPublic) {
    content = {
      badge: t("private.badge"),
      title: t("siteName"),
      description: t("private.description"),
      coverUrl: null,
      domain,
      locked: true,
    };
  } else {
    content = {
      badge: t(`kind.${target.kind === "item" ? (target.itemType ?? "CONTENT") : target.kind}`),
      title: target.title ?? t("siteName"),
      description: target.description || undefined,
      trail: target.trail?.join("  ›  "),
      coverUrl: ogCoverUrl(target.coverUrl),
      domain,
      locked: false,
    };
  }

  return new ImageResponse(<OgCard c={content} />, { ...OG_SIZE, fonts: await loadFonts() });
}
