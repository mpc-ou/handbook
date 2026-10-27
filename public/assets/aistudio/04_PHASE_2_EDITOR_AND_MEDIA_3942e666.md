# 04. GIAI ĐOẠN 2: TRÌNH SOẠN THẢO (BLOCKNOTE), CLOUDINARY & ĐÍNH KÈM

Giai đoạn này xây dựng khu vực soạn thảo mạnh mẽ cho BCN và các Trưởng ban:
1. Gõ `/`, kéo thả block, viết code có syntax highlighting, tạo bảng biểu, callout chú ý.
2. Copy-paste hoặc kéo thả ảnh vào bài viết $ightarrow$ Tự động upload thẳng lên **Cloudinary** qua Signed API.
3. Quản lý danh sách đính kèm (Video YouTube, Thư mục Google Drive, File thiết kế Figma/Canva).

---

## 1. API Ký xác thực Upload Cloudinary (`src/app/api/upload/sign/route.ts`)

Để Serverless Function của Vercel không bị giới hạn dung lượng payload (4.5MB) khi người viết tải ảnh độ phân giải cao, trình duyệt sẽ xin chữ ký từ Server rồi upload trực tiếp lên Cloudinary:

```typescript
// src/app/api/upload/sign/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = "mpc_handbook_assets";

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash("sha1").update(paramsToSign).digest("hex");

  return NextResponse.json({
    timestamp,
    folder,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  });
}
```

---

## 2. Hàm Upload Ảnh Client-side kết nối BlockNote (`src/lib/cloudinary.ts`)

```typescript
// src/lib/cloudinary.ts
export async function uploadToCloudinary(file: File): Promise<string> {
  // 1. Lấy chữ ký bảo mật từ Server
  const signRes = await fetch("/api/upload/sign", { method: "POST" });
  if (!signRes.ok) throw new Error("Không có quyền upload ảnh");
  const { timestamp, folder, signature, apiKey, cloudName } = await signRes.json();

  // 2. Đẩy file trực tiếp lên Cloudinary
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!uploadRes.ok) throw new Error("Upload ảnh lên Cloudinary thất bại");
  const data = await uploadRes.json();

  // 3. Tự động chèn tham số nén ảnh f_auto,q_auto để trang đọc tải siêu tốc
  return data.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
}
```

---

## 3. Component Trình Soạn Thảo (`src/components/editor/BlockNoteEditor.tsx`)

> **Lưu ý quan trọng với Next.js App Router:** BlockNote thao tác trực tiếp với `window` nên bắt buộc phải import bằng `next/dynamic` với `{ ssr: false }`.

```tsx
// src/components/editor/BlockNoteEditor.tsx
"use client";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useTheme } from "next-themes";

interface EditorProps {
  initialContent?: any[];
  editable?: boolean;
  onChange?: (blocks: any[], plainText: string) => void;
}

export default function BlockNoteEditor({
  initialContent,
  editable = true,
  onChange,
}: EditorProps) {
  const { resolvedTheme } = useTheme();

  const editor = useCreateBlockNote({
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
    // Tự động xử lý khi người dùng Paste ảnh hoặc Kéo-thả ảnh vào bài viết
    uploadFile: uploadToCloudinary,
  });

  const handleEditorChange = async () => {
    if (!onChange) return;
    const blocks = editor.document;
    // Trích xuất toàn bộ chữ thuần để phục vụ tìm kiếm Ctrl+K và ước tính số phút đọc
    const markdown = await editor.blocksToMarkdownLossy(blocks);
    onChange(blocks, markdown);
  };

  return (
    <div className="min-h-[500px] rounded-lg border border-border bg-background py-4">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={handleEditorChange}
      />
    </div>
  );
}
```

---

## 4. Quản lý Đính kèm YouTube & Google Drive (`src/components/editor/AttachmentManager.tsx`)

Ngoài việc nhúng trực tiếp vào nội dung bài viết, mỗi bài viết có một khu vực **Tài liệu & Video đính kèm** chuẩn hóa để các bạn thành viên dễ tìm kiếm link Drive sự kiện hoặc video hướng dẫn:

```tsx
// src/components/editor/AttachmentManager.tsx
"use client";

import { useState } from "react";
import { ArticleAttachment, AttachmentType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Youtube, FolderGit2, HardDrive, Link as LinkIcon, Trash2, Plus } from "lucide-react";

interface Props {
  attachments: ArticleAttachment[];
  onChange: (items: ArticleAttachment[]) => void;
}

export function AttachmentManager({ attachments, onChange }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  // Tự động nhận diện loại link khi BCN dán vào
  const detectType = (link: string): AttachmentType => {
    if (link.includes("youtube.com") || link.includes("youtu.be")) return "youtube";
    if (link.includes("drive.google.com") || link.includes("docs.google.com")) return "drive";
    if (link.includes("figma.com")) return "figma";
    if (link.includes("github.com")) return "github";
    return "external";
  };

  const handleAdd = () => {
    if (!title.trim() || !url.trim()) return;
    const newItem: ArticleAttachment = {
      id: crypto.randomUUID(),
      type: detectType(url),
      title: title.trim(),
      url: url.trim(),
    };
    onChange([...attachments, newItem]);
    setTitle("");
    setUrl("");
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background-subtle p-4">
      <h4 className="text-sm font-semibold">Tài liệu & Video đính kèm (YouTube, Google Drive, Figma...)</h4>
      
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Tên tài liệu (VD: Folder Ảnh Sự kiện, Video Training...)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="sm:w-1/3"
        />
        <Input
          placeholder="Dán link YouTube, Google Drive, Figma..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button type="button" onClick={handleAdd} variant="secondary">
          <Plus className="mr-1 h-4 w-4" /> Thêm
        </Button>
      </div>

      {attachments.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {attachments.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border bg-background p-2.5 text-sm"
            >
              <div className="flex items-center gap-2 truncate">
                {item.type === "youtube" && <Youtube className="h-4 w-4 shrink-0 text-red-500" />}
                {item.type === "drive" && <HardDrive className="h-4 w-4 shrink-0 text-blue-500" />}
                {item.type === "github" && <FolderGit2 className="h-4 w-4 shrink-0 text-foreground" />}
                {(item.type === "figma" || item.type === "external") && (
                  <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-medium hover:underline"
                >
                  {item.title}
                </a>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(item.id)}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```
