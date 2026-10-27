import { AppShell } from "@/components/layout/AppShell";
import { ArticleSkeleton } from "@/components/reader/ArticleSkeleton";

export default function Loading() {
  return (
    <AppShell>
      <ArticleSkeleton />
    </AppShell>
  );
}

