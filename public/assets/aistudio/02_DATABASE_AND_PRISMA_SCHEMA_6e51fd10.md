# 02. THIẾT KẾ CƠ SỞ DỮ LIỆU & PRISMA SCHEMA

Hệ thống sử dụng **PostgreSQL** (trên Supabase) kết hợp với **Prisma ORM**. Thiết kế bên dưới giải quyết triệt để 3 bài toán:
1. Giới hạn cây thư mục **tối đa 2 tầng**.
2. Cấu hình lộ trình đọc (`Scroll` + `Quiz %`) linh hoạt cho từng bài.
3. Phân quyền chi tiết cho BCN (`ADMIN`), Trưởng ban (`EDITOR`), và Thành viên (`MEMBER`).

---

## 1. Toàn bộ file `prisma/schema.prisma`

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // Connection pooling URL (Supavisor port 6543)
  directUrl = env("DIRECT_URL")         // Direct connection URL cho migrations (port 5432)
}

// ==========================================
// 1. NGƯỜI DÙNG & PHÂN QUYỀN (Tích hợp MPC-SSO)
// ==========================================

enum Role {
  ADMIN   // Ban Chủ Nhiệm: Toàn quyền hệ thống
  EDITOR  // Trưởng/Phó ban, Leader sự kiện: Quyền tạo/sửa bài viết trong danh mục được giao
  MEMBER  // Thành viên / CTV: Chỉ đọc và làm bài tập
}

model User {
  id            String    @id @default(cuid())
  ssoId         String    @unique // ID trả về từ hệ thống MPC-SSO
  email         String    @unique
  fullName      String
  avatarUrl     String?
  department    String?   // Ban trực thuộc (VD: "Chuyên môn", "Truyền thông", "Sự kiện")
  role          Role      @default(MEMBER)

  // Quan hệ
  articlesAuthored Article[]      @relation("ArticleAuthor")
  articlesUpdated  Article[]      @relation("ArticleUpdater")
  progress         UserProgress[]
  quizAttempts     QuizAttempt[]
  managedCategories CategoryEditor[] // Các danh mục mà EDITOR này được phép quản lý

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([ssoId])
  @@index([email])
}

// Bảng trung gian cấp quyền cho Trưởng ban (EDITOR) quản lý các Thư mục cụ thể
model CategoryEditor {
  id         String   @id @default(cuid())
  userId     String
  categoryId String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([userId, categoryId])
}

// ==========================================
// 2. DANH MỤC TỐI ĐA 2 TẦNG (CATEGORIES)
// ==========================================

model Category {
  id          String     @id @default(cuid())
  name        String     // VD: "Sự kiện WebDesign" hoặc "Ban Truyền Thông"
  slug        String     @unique
  description String?
  icon        String?    // Tên icon Lucide hoặc Emoji (VD: "Folder", "Camera")
  orderIndex  Int        @default(0) // Thứ tự hiển thị trên Sidebar
  isPublished Boolean    @default(true)

  // Quan hệ tự tham chiếu (Self-relation) để tạo Tầng 1 và Tầng 2
  // Quy tắc:
  // - Nếu parentId == null -> Đây là Thư mục TẦNG 1 (depth = 1)
  // - Nếu parentId != null -> Đây là Thư mục TẦNG 2 (depth = 2)
  // - Application/Trigger sẽ chặn không cho tạo danh mục có parent là Tầng 2
  depth       Int        @default(1) // Chỉ nhận giá trị 1 hoặc 2
  parentId    String?
  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children    Category[] @relation("CategoryHierarchy")

  // Bài viết có thể nằm trực tiếp ở Tầng 1 hoặc nằm trong Tầng 2
  articles    Article[]
  editors     CategoryEditor[]

  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([parentId, orderIndex])
}

// ==========================================
// 3. BÀI VIẾT & CẤU HÌNH LỘ TRÌNH (ARTICLES)
// ==========================================

model Article {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique
  summary     String?   // Mô tả ngắn hiển thị ở đầu bài và kết quả tìm kiếm
  
  // Nội dung chính từ BlockNote Editor (Lưu mảng các Block dưới dạng JSONB)
  content     Json      @default("[]")
  
  // Văn bản thuần được trích xuất tự động từ `content` khi lưu -> Dùng cho Tìm kiếm (Ctrl+K) và tính thời gian đọc
  plainText   String    @default("") @db.Text
  readingTime Int       @default(1)  // Số phút đọc ước tính

  // Danh sách đính kèm (Link YouTube, Google Drive, Figma, Canva...)
  // Format JSON: [{ id, type: "youtube"|"drive"|"figma"|"link", title, url }]
  attachments Json      @default("[]")

  // Thuộc về thư mục nào (Tầng 1 hoặc Tầng 2)
  categoryId  String
  category    Category  @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  orderIndex  Int       @default(0) // Thứ tự bài viết trong thư mục (dùng để xét lộ trình đọc)

  // --- CẤU HÌNH LỘ TRÌNH ĐỌC (PROGRESSION CONFIGS) ---
  isPublished           Boolean @default(false)
  requirePrevious       Boolean @default(false) // true = Phải hoàn thành bài đứng trước (orderIndex - 1) mới mở khóa bài này
  requireScrollToBottom Boolean @default(true)  // true = Bắt buộc cuộn hết bài mới tính là hoàn thành phần đọc
  passScorePercent      Int?                    // Null = Không bắt buộc qua Quiz; Số (VD: 80) = Cần đạt >= 80% điểm Quiz để hoàn thành bài

  // Tác giả & Người cập nhật cuối
  authorId    String
  author      User      @relation("ArticleAuthor", fields: [authorId], references: [id])
  updaterId   String?
  updater     User?     @relation("ArticleUpdater", fields: [updaterId], references: [id])

  // Quan hệ với Quiz và Tiến độ
  quiz        Quiz?
  progress    UserProgress[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([categoryId, orderIndex])
  @@index([slug])
}

// ==========================================
// 4. BÀI TẬP CUỐI BÀI & TIẾN ĐỘ (QUIZ & PROGRESS)
// ==========================================

model Quiz {
  id          String        @id @default(cuid())
  articleId   String        @unique
  article     Article       @relation(fields: [articleId], references: [id], onDelete: Cascade)
  
  // Danh sách câu hỏi lưu dạng JSONB để load cực nhanh
  // Format: [{ id, questionText, type: "single"|"multiple", options: [{ id, text }], correctOptionIds: ["..."], explanation: "..." }]
  questions   Json          @default("[]")
  
  attempts    QuizAttempt[]
  updatedAt   DateTime      @updatedAt
}

model UserProgress {
  id                String    @id @default(cuid())
  userId            String
  articleId         String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  article           Article   @relation(fields: [articleId], references: [id], onDelete: Cascade)

  hasScrolledBottom Boolean   @default(false) // Đã cuộn hết trang hợp lệ chưa
  highestQuizScore  Int?                      // Điểm phần trăm cao nhất đạt được (0 - 100)
  isCompleted       Boolean   @default(false) // True khi thỏa mãn cả requireScrollToBottom VÀ passScorePercent
  completedAt       DateTime?

  lastAccessedAt    DateTime  @default(now())

  @@unique([userId, articleId])
  @@index([userId, isCompleted])
}

model QuizAttempt {
  id          String   @id @default(cuid())
  userId      String
  quizId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  quiz        Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)

  scorePercent Int     // Điểm đạt được trong lần làm này (0 - 100)
  answers      Json    // Lưu lại lựa chọn của thành viên để xem lại
  isPassed     Boolean // Đạt hay trượt dựa trên article.passScorePercent

  createdAt    DateTime @default(now())
}
```

---

## 2. Định nghĩa TypeScript cho các cột JSONB (`src/types/index.ts`)

Vì PostgreSQL lưu `attachments` và `questions` dưới dạng `JSONB`, cần định nghĩa Type chặt chẽ để AI/Dev code không bị lỗi:

```typescript
// src/types/index.ts

export type AttachmentType = 'youtube' | 'drive' | 'figma' | 'github' | 'external';

export interface ArticleAttachment {
  id: string;
  type: AttachmentType;
  title: string;
  url: string;
  description?: string;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  type: 'single' | 'multiple'; // Chọn 1 đáp án hoặc nhiều đáp án
  options: QuizOption[];
  correctOptionIds: string[];  // LƯU Ý: Tuyệt đối strip trường này trước khi gửi về Client!
  explanation?: string;        // Giải thích hiện ra sau khi nộp bài
}
```

---

## 3. Logic Kiểm tra Giới hạn Cây 2 Tầng (`src/actions/category.actions.ts`)

Đoạn code chuẩn để đảm bảo không ai có thể tạo thư mục Tầng 3:

```typescript
// src/actions/category.actions.ts
"use server";

import { prisma } from "@/lib/prisma";

export async function createCategory(data: {
  name: string;
  slug: string;
  parentId?: string | null;
  icon?: string;
}) {
  let depth = 1;

  if (data.parentId) {
    const parentCategory = await prisma.category.findUnique({
      where: { id: data.parentId },
      select: { depth: true },
    });

    if (!parentCategory) {
      throw new Error("Thư mục cha không tồn tại.");
    }

    if (parentCategory.depth >= 2) {
      throw new Error(
        "Hệ thống chỉ cho phép tối đa 2 tầng thư mục (Tầng 1 > Tầng 2 > Bài viết)."
      );
    }

    depth = parentCategory.depth + 1; // Sẽ bằng 2
  }

  return await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      parentId: data.parentId || null,
      depth,
      icon: data.icon,
    },
  });
}
```
