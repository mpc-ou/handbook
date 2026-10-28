import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary-server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const isAdmin =
      userRole === "ADMIN" ||
      isSuperAdminEmail(session?.user?.email);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin permission required." },
        { status: 403 }
      );
    }

    // 1. Fetch Cloudinary Account Usage via Admin API
    let usageData: any = null;
    let apiError: string | null = null;

    try {
      usageData = await cloudinary.api.usage();
    } catch (cErr: any) {
      console.warn("Cloudinary usage API error:", cErr);
      apiError = cErr?.message || "Could not fetch usage from Cloudinary API";
    }

    // 2. Query Local Database Stats for uploaded files
    const [totalTracked, attachedCount, orphanCount, totalBytesResult] = await Promise.all([
      prisma.uploadedFile.count(),
      prisma.uploadedFile.count({ where: { isAttached: true } }),
      prisma.uploadedFile.count({ where: { isAttached: false } }),
      prisma.uploadedFile.aggregate({ _sum: { bytes: true } }),
    ]);

    const cutoff2h = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const readyToCleanCount = await prisma.uploadedFile.count({
      where: {
        isAttached: false,
        createdAt: { lt: cutoff2h },
      },
    });

    return NextResponse.json({
      success: true,
      cloudinary: {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        configured: Boolean(
          process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        ),
        usage: usageData,
        error: apiError,
      },
      dbTracking: {
        totalTracked,
        attachedCount,
        orphanCount,
        readyToCleanCount,
        totalBytes: totalBytesResult._sum.bytes || 0,
        totalMegabytes: Number(
          ((totalBytesResult._sum.bytes || 0) / (1024 * 1024)).toFixed(2)
        ),
      },
    });
  } catch (error: any) {
    console.error("Cloudinary usage query error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
