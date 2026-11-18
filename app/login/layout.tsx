import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("login");
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
