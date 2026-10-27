# 06. GIAI ĐOẠN 4: DASHBOARD QUẢN TRỊ, TÌM KIẾM (`CTRL+K`) & TRIỂN KHAI SERVERLESS

Giai đoạn cuối hoàn thiện trải nghiệm quản lý cho BCN, công cụ tra cứu nhanh cho thành viên, và checklist đưa hệ thống lên `docs.mpclub.dev`.

---

## 1. Tính năng Tìm kiếm Toàn văn (`Ctrl + K` / `Cmd + K`)

Khi thành viên CLB cần tìm gấp quy định hoặc hướng dẫn (VD: *"xin tài trợ"*, *"logo clb"*, *"quy trình phỏng vấn"*), chỉ cần nhấn `Ctrl + K`:

### A. Server Action Tìm kiếm (`src/actions/search.actions.ts`)
Sử dụng cột `plainText` và `title` trong PostgreSQL:

```typescript
// src/actions/search.actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function searchArticles(query: string) {
  const session = await auth();
  if (!session) return [];

  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  return await prisma.article.findMany({
    where: {
      isPublished: true,
      OR: [
        { title: { contains: cleanQuery, mode: "insensitive" } },
        { summary: { contains: cleanQuery, mode: "insensitive" } },
        { plainText: { contains: cleanQuery, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      category: {
        select: { name: true },
      },
    },
    take: 8,
  });
}
```

---

## 2. Dashboard Quản trị & Theo dõi Tiến độ cho BCN (`/analytics`)

BCN và Trưởng ban có một trang Dashboard để kiểm tra xem các thành viên trong CLB đã đọc quy định hay hoàn thành bài hướng dẫn sự kiện chưa:

### Các chỉ số hiển thị trên Dashboard:
1. **Tổng quan theo Bài viết / Sự kiện:**
   - Chọn một thư mục (VD: *Tất tần tật về Tuyển Thành Viên*).
   - Xem danh sách thành viên: Ai đã đọc xong `100%`, ai đang đọc dở, ai chưa mở bài, và điểm Quiz đạt bao nhiêu.
2. **Quản lý Phân quyền (`Role Management`):**
   - Bảng danh sách thành viên đã đăng nhập qua `MPC-SSO`.
   - BCN có thể nâng quyền một thành viên từ `MEMBER` $ightarrow$ `EDITOR` (Trưởng ban) và gán các Thư mục Tầng 1/Tầng 2 mà bạn đó được phép viết bài.
3. **Sắp xếp Cây thư mục Kéo-Thả:**
   - Thay đổi `orderIndex` của các bài viết trong lộ trình để điều chỉnh thứ tự bài nào cần đọc trước, bài nào đọc sau.

---

## 3. Mẫu Bài Viết Dựng Sẵn (Article Templates)

Để các Trưởng ban không bị bí ý tưởng trình bày khi bấm **"Tạo bài viết mới"**, hệ thống cung cấp sẵn 3 nút chọn Template khởi tạo nhanh mảng JSON cho BlockNote:
1. **Mẫu Quy trình Sự kiện (Event Playbook):**
   - Gồm các mục: *1. Mục tiêu & Timeline*, *2. Phân công nhân sự*, *3. Checklist trước - trong - sau sự kiện*, *4. Các lỗi thường gặp & Cách xử lý*, *5. Link Drive tài liệu mẫu*.
2. **Mẫu Sharing Kỹ năng (Skill Guide - Chụp ảnh / Design / Content):**
   - Gồm các mục: *1. Tiêu chuẩn chất lượng của CLB*, *2. Công cụ & Tài nguyên cần chuẩn bị*, *3. Hướng dẫn từng bước (Step-by-step)*, *4. Ví dụ Đúng (Do) & Sai (Don't)*.
3. **Mẫu Nội quy & Quy định CLB:**
   - Gồm các mục: *1. Phạm vi áp dụng*, *2. Quy định chi tiết*, *3. Quyền lợi & Kỷ luật*.

---

## 4. Checklist Triển khai Serverless (`docs.mpclub.dev`)

1. **Khởi tạo Database trên Supabase:**
   - Tạo project mới tại Region **Singapore (`ap-southeast-1`)** để có tốc độ phản hồi nhanh nhất tại Việt Nam (~30-50ms).
   - Lấy 2 chuỗi kết nối `DATABASE_URL` (port 6543, bật Transaction Pooler) và `DIRECT_URL` (port 5432).
   - Chạy `npx prisma migrate deploy` để tạo toàn bộ bảng.
2. **Cấu hình Cloudinary:**
   - Tạo thư mục `mpc_handbook_assets` trên Cloudinary.
   - Copy `Cloud Name`, `API Key`, `API Secret` vào biến môi trường trên Vercel.
3. **Cấu hình Tên miền & SSO:**
   - Trên hệ thống `MPC-SSO`, đăng ký Redirect URI: `https://docs.mpclub.dev/api/auth/callback/mpc-sso`.
   - Trên Vercel, trỏ CNAME của `docs.mpclub.dev` (hoặc `handbook.mpclub.dev`) từ Cloudflare DNS về `cname.vercel-dns.com` (chế độ DNS Only hoặc Proxied SSL Full Strict).

---

## 5. Thứ tự Giao việc cho AI hoặc Dev (Implementation Prompting)

Khi bạn đưa thư mục `docs/` này cho AI Coding Assistant hoặc các bạn Dev trong CLB, hãy yêu cầu thực hiện lần lượt theo 4 mốc:
- **Milestone 1:** Đọc `00_OVERVIEW` và `02_DATABASE`, khởi tạo project Next.js và chạy thành công `prisma db push` + seed dữ liệu mẫu.
- **Milestone 2:** Đọc `01_DESIGN_SYSTEM` và `03_PHASE_1`, dựng khung Layout 3 cột (Sidebar 2 tầng + Main + TOC) và tích hợp đăng nhập `MPC-SSO`.
- **Milestone 3:** Đọc `04_PHASE_2`, hoàn thiện trang Studio soạn thảo bài viết bằng BlockNote, upload ảnh Cloudinary và thêm link YouTube/Drive.
- **Milestone 4:** Đọc `05_PHASE_3` và `06_PHASE_4`, gắn `ScrollTracker`, `QuizRunner`, khóa lộ trình trên Sidebar và hộp tìm kiếm `Ctrl + K`.
