import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { publicId, url, bytes, format } = body;

    if (!publicId || !url) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    let uploaderId: string | undefined;
    if (session?.user?.email) {
      const u = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (u) uploaderId = u.id;
    }

    const file = await prisma.uploadedFile.upsert({
      where: { publicId },
      update: {
        url,
        bytes: bytes || null,
        format: format || null,
        uploaderId,
      },
      create: {
        publicId,
        url,
        bytes: bytes || null,
        format: format || null,
        uploaderId,
        isAttached: false, // Initially unattached until article or draft is saved
      },
    });

    return NextResponse.json({ success: true, file });
  } catch (error: any) {
    console.error("Failed to register uploaded file:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

