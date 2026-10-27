# 00. TỔNG QUAN & KIẾN TRÚC HỆ THỐNG (MPC HANDBOOK / DOCS)

## 1. Mục tiêu Dự án
Xây dựng hệ thống Sổ tay Nội bộ kết hợp LMS thu nhỏ (`docs.mpclub.dev` hoặc `handbook.mpclub.dev`) dành riêng cho Câu lạc bộ Lập trình Học thuật (MPC).
- **Mục đích:** Lưu trữ quy định CLB, quy trình tổ chức sự kiện (WebDesign, Tuyển thành viên,...), tài liệu hướng dẫn kỹ thuật và kỹ năng mềm từ các Trưởng ban (chụp ảnh, viết content, thiết kế,...).
- **Đặc thù hoạt động:** 
  - Nội bộ 100% (Yêu cầu đăng nhập qua **MPC-SSO**).
  - Cấu trúc thư mục tối đa **2 tầng** (`Tầng 1 > Tầng 2 > Bài viết` hoặc `Tầng 1 > Bài viết`).
  - Hỗ trợ **Đọc theo lộ trình (Sequential Learning)**: Có thể cấu hình bắt buộc cuộn hết trang (`Scroll-to-bottom`) và/hoặc vượt qua bài kiểm tra trắc nghiệm cuối bài (`Quiz >= X%`) mới mở khóa bài tiếp theo.
  - Trình soạn thảo mạnh mẽ kiểu Notion (hỗ trợ text, code block, upload ảnh qua Cloudinary, nhúng video YouTube, đính kèm link Google Drive/Figma).

---

## 2. Tech Stack (100% Serverless)

| Tầng (Layer) | Công nghệ sử dụng | Chi tiết & Lý do chọn |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router)** | React Server Components (RSC) giúp tải tài liệu nhanh, SEO/Preview nội bộ tốt, dùng Server Actions xử lý chấm điểm Quiz bảo mật mà không cần tách Backend riêng. |
| **Language** | **TypeScript (Strict mode)** | Đảm bảo an toàn kiểu dữ liệu cho cấu trúc JSON của Editor và Quiz. |
| **Database** | **Supabase (Serverless PostgreSQL)** | Hỗ trợ `JSONB` tốc độ cao cho nội dung bài viết, tích hợp sẵn Full-Text Search và Connection Pooling (Supavisor). |
| **ORM** | **Prisma ORM** | Quản lý schema rõ ràng, dễ dàng chạy migration và truy vấn quan hệ 2 tầng. |
| **Authentication** | **NextAuth.js (Auth.js v5) + MPC-SSO** | Tích hợp luồng OAuth2/OIDC hoặc JWT Callback trực tiếp từ hệ thống `MPC-SSO` sẵn có của hệ sinh thái `.mpclub.dev`. |
| **Rich-Text Editor** | **BlockNote (`@blocknote/react`)** | Trình soạn thảo dạng khối (Block-based) giống Notion, hỗ trợ Slash Menu (`/`), kéo thả khối, custom block cho YouTube/Drive, tích hợp sẵn hook upload ảnh. |
| **Media Storage** | **Cloudinary** | Lưu trữ hình ảnh trong bài viết, tự động tối ưu hóa dung lượng (`f_auto,q_auto`) sang WebP/AVIF. |
| **UI & Design System** | **Tailwind CSS + Shadcn UI + Lucide Icons** | Dễ tùy biến Dark/Light mode, hỗ trợ sẵn Sidebar đa cấp, Command Palette (`Ctrl+K`), Dialog, Toast. |
| **Deployment** | **Vercel** | Tự động CI/CD theo nhánh Git, Serverless Functions co giãn tự động. |

---

## 3. Sơ đồ Kiến trúc Tổng thể (System Architecture)

```text
+-----------------------------------------------------------------------+
|                         CLIENT (Browser / UI)                         |
|  +------------------+  +-------------------+  +--------------------+  |
|  | Reader View      |  | BlockNote Editor  |  | Admin Dashboard    |  |
|  | (Scroll Tracker, |  | (Slash Menu,      |  | (Category Tree,    |  |
|  |  Quiz UI)        |  |  Drag & Drop)     |  |  Role & Analytics) |  |
|  +--------+---------+  +---------+---------+  +---------+----------+  |
+-----------|----------------------|----------------------|-------------+
            |                      |Signed Upload         |
            |Server Actions        v                      |Server Actions
            |            +-------------------+            |
            |            |   Cloudinary API  |            |
            |            | (Image Hosting)   |            |
            v            +-------------------+            v
+-----------------------------------------------------------------------+
|                   NEXT.JS SERVERLESS (Vercel Edge/Node)               |
|  +------------------+  +-------------------+  +--------------------+  |
|  | Auth Middleware  |  | Progression Engine|  | Content & RBAC     |  |
|  | (MPC-SSO Verify) |  | (Quiz Grader,     |  | Service            |  |
|  |                  |  |  Unlock Checker)  |  | (2-Level Enforcer) |  |
|  +--------+---------+  +---------+---------+  +---------+----------+  |
+-----------|----------------------|----------------------|-------------+
            |                      |Prisma Client         |
            v                      v                      v
+-----------------------+    +------------------------------------------+
|   MPC-SSO Server      |    |    SUPABASE SERVERLESS POSTGRESQL        |
| (auth.mpclub.dev)     |    |  - Users & Roles                         |
+-----------------------+    |  - Categories (Self-relation max depth 2)|
                             |  - Articles (JSONB Content & Attachments)|
                             |  - Quizzes & UserProgress                |
                             +------------------------------------------+
```

---

## 4. Cấu trúc Thư mục Dự án (Folder Structure)

```text
mpc-handbook/
├── prisma/
│   ├── schema.prisma              # Định nghĩa Database Schema
│   └── seed.ts                    # Dữ liệu mẫu (Danh mục CLB, Bài viết mẫu)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx     # Trang điều hướng đăng nhập MPC-SSO
│   │   │   └── api/auth/[...nextauth]/route.ts
│   │   ├── (reader)/              # Giao diện đọc sổ tay (Tất cả thành viên)
│   │   │   ├── layout.tsx         # Layout 3 cột: Sidebar 2 tầng - Main - TOC
│   │   │   ├── page.tsx           # Trang chủ Sổ tay (Dashboard cá nhân & Tiến độ)
│   │   │   └── docs/[...slug]/page.tsx # Trang hiển thị bài viết + Quiz
│   │   ├── (admin)/               # Giao diện Quản trị & Soạn thảo (BCN & Trưởng ban)
│   │   │   ├── layout.tsx
│   │   │   ├── studio/            # Quản lý danh mục 2 tầng & Danh sách bài viết
│   │   │   ├── editor/[id]/page.tsx # Trình soạn thảo BlockNote + Cấu hình Lộ trình/Quiz
│   │   │   └── analytics/page.tsx # Thống kê tiến độ đọc của thành viên CLB
│   │   └── api/
│   │       └── upload/sign/route.ts # API tạo chữ ký upload Cloudinary
│   ├── components/
│   │   ├── ui/                    # Các component gốc của Shadcn UI
│   │   ├── layout/
│   │   │   ├── AppSidebar.tsx     # Cây thư mục 2 tầng + Trạng thái Khóa/Mở
│   │   │   ├── TableOfContents.tsx# Mục lục tự động bên phải (H2, H3)
│   │   │   └── CommandSearch.tsx  # Hộp thoại tìm kiếm nhanh Ctrl + K
│   │   ├── editor/
│   │   │   ├── BlockNoteEditor.tsx# Trình soạn thảo chính (Client Component)
│   │   │   ├── AttachmentManager.tsx # Quản lý link YouTube, Drive đính kèm
│   │   │   └── QuizBuilder.tsx    # Công cụ tạo câu hỏi trắc nghiệm cuối bài
│   │   └── reader/
│   │       ├── ArticleRenderer.tsx# Render bài viết ở chế độ Read-only
│   │       ├── ScrollTracker.tsx  # Theo dõi cuộn hết trang + Thời gian đọc
│   │       └── QuizRunner.tsx     # Giao diện làm bài tập cuối bài
│   ├── actions/                   # Next.js Server Actions
│   │   ├── category.actions.ts    # CRUD danh mục (kiểm tra giới hạn 2 tầng)
│   │   ├── article.actions.ts     # CRUD bài viết & phân quyền
│   │   └── progress.actions.ts    # Chấm điểm Quiz & Mở khóa bài tiếp theo
│   ├── lib/
│   │   ├── prisma.ts              # Khởi tạo Prisma Singleton
│   │   ├── auth.ts                # Cấu hình MPC-SSO & kiểm tra Role
│   │   ├── cloudinary.ts          # Helper upload ảnh lên Cloudinary
│   │   └── progression.ts         # Thuật toán kiểm tra mở khóa lộ trình
│   └── types/
│       └── index.ts               # Định nghĩa Type cho Quiz, Attachment, Role
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```
