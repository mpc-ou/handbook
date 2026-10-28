import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryAsset } from "@/lib/cloudinary-server";
import { isSuperAdminEmail } from "@/lib/constants";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Cleanup orphan uploads:
 * Finds files where isAttached = false AND createdAt < (NOW - threshold)
 * Deletes them from Cloudinary and deletes record from PostgreSQL.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const session = await auth();

    // Verify permission: Either valid CRON_SECRET or Admin session
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const userRole = (session?.user as any)?.role;
    const isAdmin =
      userRole === "ADMIN" ||
      isSuperAdminEmail(session?.user?.email);

    if (!isCronAuthorized && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin or valid Cron Secret required." },
        { status: 401 }
      );
    }

    // Default threshold: files uploaded more than 2 hours ago that were never attached/saved
    const urlParams = req.nextUrl.searchParams;
    const hours = Math.max(0.5, Number(urlParams.get("hours")) || 2);
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const orphanFiles = await prisma.uploadedFile.findMany({
      where: {
        isAttached: false,
        createdAt: { lt: cutoffTime },
      },
      take: 100, // Process in batches of 100
    });

    let deletedCount = 0;
    let failedCount = 0;
    let freedBytes = 0;

    for (const file of orphanFiles) {
      const ok = await deleteCloudinaryAsset(file.publicId);
      if (ok) {
        await prisma.uploadedFile.delete({ where: { id: file.id } }).catch(() => {});
        deletedCount++;
        freedBytes += file.bytes || 0;
      } else {
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      cutoffTime: cutoffTime.toISOString(),
      orphansFound: orphanFiles.length,
      deletedCount,
      failedCount,
      freedBytes,
      freedMegabytes: Number((freedBytes / (1024 * 1024)).toFixed(2)),
    });
  } catch (error: any) {
    console.error("Cleanup orphan uploads error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Allow GET for Vercel Cron jobs or test triggering
  return POST(req);
}
