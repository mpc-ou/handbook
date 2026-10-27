# 03. GIAI ĐOẠN 1: KHỞI TẠO DỰ ÁN, TÍCH HỢP MPC-SSO & PHÂN QUYỀN

Tài liệu này hướng dẫn từng bước khởi tạo codebase, cài đặt thư viện, kết nối `MPC-SSO` cho tên miền `.mpclub.dev`, và thiết lập phân quyền (RBAC).

---

## 1. Khởi tạo Dự án & Cài đặt Dependencies

Chạy các lệnh sau trong terminal:

```bash
# 1. Tạo dự án Next.js (App Router, TypeScript, Tailwind CSS)
npx create-next-app@latest mpc-handbook --typescript --tailwind --eslint --app --src-dir

cd mpc-handbook

# 2. Cài đặt Prisma & Supabase Client
npm install @prisma/client
npm install -D prisma

# 3. Cài đặt Auth.js v5 (NextAuth) để nối MPC-SSO
npm install next-auth@beta

# 4. Cài đặt Trình soạn thảo BlockNote & Giao diện
npm install @blocknote/core @blocknote/react @blocknote/mantine
npm install lucide-react clsx tailwind-merge canvas-confetti
npm install -D @types/canvas-confetti

# 5. Khởi tạo Shadcn UI
npx shadcn@latest init
npx shadcn@latest add button dialog dropdown-menu input label progress scroll-area separator sheet skeleton switch tabs toast tooltip command badge
```

---

## 2. Cấu hình Biến Môi trường (`.env.example`)

Tạo file `.env` dựa trên mẫu sau:

```env
# --- DATABASE (Supabase Serverless Postgres) ---
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.supabase.co:5432/postgres"

# --- AUTHENTICATION & MPC-SSO ---
AUTH_SECRET="sinh_chuoi_ngau_nhien_32_ky_tu_bang_openssl_rand_base64_32"
NEXTAUTH_URL="https://docs.mpclub.dev"

# Thông tin kết nối OAuth2/OIDC từ hệ thống MPC-SSO
MPC_SSO_CLIENT_ID="mpc-handbook-client"
MPC_SSO_CLIENT_SECRET="secret_cua_mpc_sso"
MPC_SSO_ISSUER="https://sso.mpclub.dev"

# --- CLOUDINARY (Upload ảnh trong Editor) ---
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="mpclub-cloud"
CLOUDINARY_API_KEY="1234567890"
CLOUDINARY_API_SECRET="cloudinary_secret_key"
CLOUDINARY_UPLOAD_PRESET="mpc_docs_preset"
```

---

## 3. Tích hợp Đăng nhập Nội bộ qua `MPC-SSO` (`src/lib/auth.ts`)

Vì sổ tay chỉ dùng nội bộ, toàn bộ route sẽ bắt buộc đăng nhập qua `MPC-SSO`. Khi user đăng nhập thành công, hệ thống tự động đồng bộ thông tin vào bảng `User` trong Database.

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: "mpc-sso",
      name: "MPC Single Sign-On",
      type: "oidc", // Hoặc "oauth" tùy cấu hình của sso.mpclub.dev
      issuer: process.env.MPC_SSO_ISSUER,
      clientId: process.env.MPC_SSO_CLIENT_ID,
      clientSecret: process.env.MPC_SSO_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          ssoId: profile.sub,
          name: profile.name || profile.preferred_username,
          email: profile.email,
          image: profile.picture,
          department: profile.department || "Thành viên CLB",
          // Nếu MPC-SSO trả sẵn role của BCN thì map tự động, không thì mặc định MEMBER
          role: profile.is_bcn ? Role.ADMIN : Role.MEMBER,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // Tự động tạo hoặc cập nhật thông tin thành viên CLB vào DB Sổ tay
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          fullName: user.name ?? "MPC Member",
          avatarUrl: user.image,
        },
        create: {
          ssoId: (user as any).ssoId ?? user.id,
          email: user.email,
          fullName: user.name ?? "MPC Member",
          avatarUrl: user.image,
          department: (user as any).department,
          role: (user as any).role ?? Role.MEMBER,
        },
      });
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, role: true, department: true },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          (session.user as any).role = dbUser.role;
          (session.user as any).department = dbUser.department;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
```

---

## 4. Middleware Bảo vệ Toàn bộ Sổ tay (`src/middleware.ts`)

Không cho phép người ngoài CLB xem bất kỳ bài viết nào nếu chưa đăng nhập qua `MPC-SSO`:

```typescript
// src/middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/api/auth");

  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Bảo vệ khu vực Admin/Studio (Chỉ ADMIN và EDITOR mới được vào)
  if (req.nextUrl.pathname.startsWith("/studio") || req.nextUrl.pathname.startsWith("/editor")) {
    const userRole = (req.auth?.user as any)?.role;
    if (userRole !== "ADMIN" && userRole !== "EDITOR") {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

---

## 5. Hàm Kiểm tra Quyền Chỉnh sửa theo Thư mục (RBAC Helper)

Trưởng ban (`EDITOR`) chỉ được sửa các bài viết thuộc ban hoặc sự kiện mình phụ trách, trong khi BCN (`ADMIN`) sửa được tất cả:

```typescript
// src/lib/permissions.ts
import { prisma } from "@/lib/prisma";

export async function canUserManageCategory(userId: string, categoryId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { managedCategories: true },
  });

  if (!user) return false;
  if (user.role === "ADMIN") return true; // BCN có toàn quyền

  if (user.role === "EDITOR") {
    // Kiểm tra xem Editor có quyền trực tiếp trên category này không
    const hasDirectAccess = user.managedCategories.some((mc) => mc.categoryId === categoryId);
    if (hasDirectAccess) return true;

    // Nếu category này là Tầng 2, kiểm tra xem Editor có quyền trên Thư mục cha (Tầng 1) không
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { parentId: true },
    });

    if (category?.parentId) {
      return user.managedCategories.some((mc) => mc.categoryId === category.parentId);
    }
  }

  return false;
}
```
