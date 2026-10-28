import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail, isEmailLoginEnabled } from "@/lib/constants";
import type { Role } from "@/types";

export const isMpcSsoConfigured = Boolean(
  process.env.MPC_SSO_ISSUER &&
    process.env.MPC_SSO_CLIENT_ID &&
    process.env.MPC_SSO_CLIENT_SECRET
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || "mpc-handbook-default-dev-secret-key-2026",
  session: {
    strategy: "jwt",
  },
  providers: [
    // 1. Credentials Provider: Login with existing Email + Password (ONLY if enabled in ENV)
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!isEmailLoginEnabled()) {
          throw new Error("Tính năng đăng nhập bằng email & mật khẩu hiện đang bị vô hiệu hóa.");
        }

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Vui lòng nhập đầy đủ Email và Mật khẩu.");
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        // Find user in PostgreSQL
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          throw new Error("Tài khoản không tồn tại trên hệ thống.");
        }

        if (user.noPassword || !user.passwordHash) {
          throw new Error("Tài khoản này được đăng ký qua MPC-SSO hoặc chưa thiết lập mật khẩu.");
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          throw new Error("Mật khẩu không chính xác.");
        }

        const isBcn =
          user.role === "ADMIN" ||
          isSuperAdminEmail(user.email);
        const role: Role = isBcn ? "ADMIN" : (user.role as Role) || "MEMBER";

        const avatar = user.avatarUrl
          ? user.avatarUrl
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=f97316&color=fff&bold=true`;

        return {
          id: user.id,
          ssoId: user.ssoId,
          name: user.fullName,
          email: user.email,
          image: avatar,
          department: user.department || (isBcn ? "Executive Board" : "Academic Team"),
          role,
          noPassword: Boolean(user.noPassword),
        };
      },
    }),

    // 2. MPC-SSO Provider (OAuth2 / OIDC)
    {
      id: "mpc-sso",
      name: "MPC Single Sign-On",
      type: "oidc",
      issuer: process.env.MPC_SSO_ISSUER || "https://auth.mpclub.dev",
      clientId: process.env.MPC_SSO_CLIENT_ID || "",
      clientSecret: process.env.MPC_SSO_CLIENT_SECRET || "",
      authorization: { params: { scope: "openid email profile" } },
      checks: ["pkce", "state"],
      async profile(profile: Record<string, unknown>) {
        const email = String(profile.email || "").trim().toLowerCase();
        const ssoId = String(profile.sub || "");
        const isBcn =
          Boolean(profile.is_bcn) ||
          profile.role === "ADMIN" ||
          isSuperAdminEmail(email);
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
          profile.name || profile.preferred_username || email || "MPC Member"
        );

        const avatar = rawAvatar
          ? String(rawAvatar)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f97316&color=fff&bold=true`;

        const department = String(
          profile.department || (isBcn ? "Executive Board" : "Academic Team")
        );

        // Ensure user exists in database and mark noPassword = true for SSO accounts if not set
        try {
          const existing = await prisma.user.findFirst({
            where: {
              OR: [{ ssoId }, { email }],
            },
          });

          if (existing) {
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                fullName: displayName,
                avatarUrl: avatar,
                role: isBcn ? "ADMIN" : existing.role,
              },
            });
          } else {
            await prisma.user.create({
              data: {
                ssoId,
                email,
                fullName: displayName,
                avatarUrl: avatar,
                department,
                role,
                noPassword: true,
              },
            });
          }
        } catch (dbErr) {
          console.warn("Could not sync SSO profile into Postgres:", dbErr);
        }

        return {
          id: ssoId,
          ssoId,
          name: displayName,
          email,
          image: avatar,
          department,
          role,
          noPassword: true,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token.ssoId = u.ssoId || user.id;
        token.role = u.role || "MEMBER";
        token.department = u.department || "Academic Team";
        token.noPassword = Boolean(u.noPassword);
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
        const uRec = session.user as unknown as Record<string, unknown>;
        session.user.id = String(token.sub || token.ssoId || "");
        uRec.ssoId = token.ssoId;
        uRec.role = token.role || "MEMBER";
        uRec.department = token.department || "Academic Team";
        uRec.noPassword = Boolean(token.noPassword);
        if (token.picture) {
          session.user.image = String(token.picture);
          uRec.avatarUrl = String(token.picture);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
