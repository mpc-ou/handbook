import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("studio");
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
