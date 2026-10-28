import { NextResponse } from "next/server";
import { isMpcSsoConfigured } from "@/lib/auth";
import { isEmailLoginEnabled, getSuperAdminEmails } from "@/lib/constants";

export async function GET() {
  const cloudinaryConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

  return NextResponse.json({
    mpcSsoConfigured: isMpcSsoConfigured,
    issuer: process.env.MPC_SSO_ISSUER || "https://sso.mpclub.dev",
    clientIdConfigured: Boolean(process.env.MPC_SSO_CLIENT_ID),
    cloudinaryConfigured,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || null,
    emailLoginEnabled: isEmailLoginEnabled(),
    superAdminEmails: getSuperAdminEmails(),
  });
}
