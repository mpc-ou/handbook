# AGENTS.md

Hướng dẫn đầy đủ cho mọi agent nằm trong [CLAUDE.md](./CLAUDE.md) — **đọc file đó trước khi làm bất cứ việc gì**.

Tóm tắt bắt buộc:
- Mô hình dữ liệu: `Course → Lesson → Item`; cover chỉ ở Course/Lesson, Item không có cover; Category là tag phẳng nhiều-nhiều với Course.
- Nguồn sự thật schema: `prisma/schema.prisma`. Không dùng `prisma migrate` (dùng `pnpm db:push`).
- Trước khi kết thúc: `pnpm exec tsc --noEmit` phải sạch lỗi trong các file bạn đã sửa.
- Chỉ sửa các file được giao; nếu cần sửa file ngoài phạm vi, dừng lại và báo cáo thay vì tự sửa.
- Mọi route ghi API phải dùng guard trong `lib/authz.ts`.
