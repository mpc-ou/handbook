"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyEditorRedirect() {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = params?.id || "new";

  useEffect(() => {
    router.replace(`/studio/items/${id}`);
  }, [id, router]);

  return null;
}
