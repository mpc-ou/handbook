import type { Metadata } from "next";
import { privatePageMetadata } from "@/lib/seo-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return privatePageMetadata("certificate");
}

export default function CertificateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
