import NextAuth from "next-auth";
import type { Role } from "@/types";

export const isMpcSsoConfigured = Boolean(
  process.env.MPC_SSO_ISSUER &&
    process.env.MPC_SSO_CLIENT_ID &&
    process.env.MPC_SSO_CLIENT_SECRET
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || "mpc-handbook-default-dev-secret-key-2026",
  providers: [
    {
      id: "mpc-sso",
      name: "MPC Single Sign-On",
      type: "oidc",
      issuer: process.env.MPC_SSO_ISSUER || "https://auth.mpclub.dev",
      clientId: process.env.MPC_SSO_CLIENT_ID || "",
      clientSecret: process.env.MPC_SSO_CLIENT_SECRET || "",
      authorization: { params: { scope: "openid email profile" } },
      checks: ["pkce", "state"],
      profile(profile: Record<string, unknown>) {
        const isBcn =
          Boolean(profile.is_bcn) ||
          profile.role === "ADMIN" ||
          profile.email === "trieukon1011@gmail.com";
        const role: Role = isBcn ? "ADMIN" : "MEMBER";

        const rawAvatar =
          profile.picture ||
          profile.avatar_url ||
          profile.avatar ||
          profile.avatarUrl ||
          profile.image ||
          profile.photo ||
          (Array.isArray(profile.photos) && (profile.photos as Array<{ value?: string }>)[0]?.value) ||
          (profile.user_metadata as Record<string, unknown> | undefined)?.avatar_url ||
          (profile.user_metadata as Record<string, unknown> | undefined)?.picture;

        const displayName = String(
          profile.name || profile.preferred_username || profile.email || "MPC Member"
        );

        const avatar = rawAvatar
          ? String(rawAvatar)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f97316&color=fff&bold=true`;

        return {
          id: String(profile.sub || ""),
          ssoId: String(profile.sub || ""),
          name: displayName,
          email: String(profile.email || ""),
          image: avatar,
          department: String(
            profile.department || (isBcn ? "Executive Board" : "Academic Team")
          ),
          role,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user) {
        token.ssoId =
          (user as unknown as Record<string, unknown>).ssoId || user.id;
        token.role =
          (user as unknown as Record<string, unknown>).role || "MEMBER";
        token.department =
          (user as unknown as Record<string, unknown>).department ||
          "Academic Team";
        if (user.image) {
          token.picture = user.image;
        }
      }
      if (profile) {
        const prof = profile as Record<string, unknown>;
        const pPic =
          prof.picture ||
          prof.avatar_url ||
          prof.avatar ||
          prof.avatarUrl ||
          prof.image ||
          prof.photo ||
          (Array.isArray(prof.photos) && (prof.photos as Array<{ value?: string }>)[0]?.value) ||
          (prof.user_metadata as Record<string, unknown> | undefined)?.avatar_url ||
          (prof.user_metadata as Record<string, unknown> | undefined)?.picture;
        if (pPic) {
          token.picture = String(pPic);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub || token.ssoId || "");
        (session.user as unknown as Record<string, unknown>).ssoId =
          token.ssoId;
        (session.user as unknown as Record<string, unknown>).role =
          token.role || "MEMBER";
        (session.user as unknown as Record<string, unknown>).department =
          token.department || "Academic Team";
        if (token.picture) {
          session.user.image = String(token.picture);
          (session.user as unknown as Record<string, unknown>).avatarUrl = String(token.picture);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
