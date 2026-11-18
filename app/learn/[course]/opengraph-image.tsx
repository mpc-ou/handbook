import { renderOgImage } from "@/lib/og";
import { resolvePreview } from "@/lib/seo";

export const alt = "MPC Handbook";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params;
  return renderOgImage(await resolvePreview(course));
}
