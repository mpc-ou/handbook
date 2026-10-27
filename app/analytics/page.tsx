"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyAnalyticsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/studio/members");
  }, [router]);

  return null;
}
