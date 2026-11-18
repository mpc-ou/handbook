import type { Metadata } from "next";
import { learnMetadata } from "@/lib/seo-metadata";

type Params = { course: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { course } = await params;
  return learnMetadata(`/learn/${course}`, course);
}

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
