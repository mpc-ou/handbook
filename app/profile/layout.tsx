import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("profile");
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
