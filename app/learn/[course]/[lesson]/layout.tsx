import type { Metadata } from "next";
import { learnMetadata } from "@/lib/seo-metadata";

type Params = { course: string; lesson: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { course, lesson } = await params;
  return learnMetadata(`/learn/${course}/${lesson}`, course, lesson);
}

export default function LessonLayout({ children }: { children: React.ReactNode }) {
  return children;
}
