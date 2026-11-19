# CLAUDE.md — MPC Handbook

Sổ tay + LMS nội bộ của Mobile Programming Club. Next.js 15 (App Router) + React 19 + TypeScript strict + Prisma 6 (PostgreSQL) + Tailwind v4 + Radix/shadcn. Package manager: **pnpm**.

## Lệnh
```
pnpm dev                      # chạy dev
pnpm exec tsc --noEmit        # kiểm tra type (bắt buộc pass trước khi xong việc)
pnpm lint && pnpm build
pnpm db:push                  # đồng bộ schema (KHÔNG có migrations)
pnpm db:generate              # prisma generate
pnpm db:seed | db:clean | db:reset
```
Không có test runner; xác minh bằng `tsc`, `build` và chạy tay.

## Mô hình dữ liệu (nguồn sự thật: `prisma/schema.prisma`)
```
Course (khóa)      — có coverImage, nhiều Category (phẳng, qua CourseCategory)
 └─ Lesson (bài học)   — có coverImage
     └─ Item (chương / bài tập) — KHÔNG có coverImage; type = CONTENT | QUIZ | ASSIGNMENT
```
Ví dụ: Khóa "Nội quy CLB" → Bài học "Quy tắc ứng xử" → Chương 1, 2, 3, Bài tập cuối chương.

Quy tắc:
- **Ảnh bìa chỉ ở Course và Lesson.** Item không có cover; đừng thêm lại.
- **Category là tag phẳng**, không phân cấp (không `parentId`/`depth`). Course ↔ Category nhiều-nhiều.
- **Thứ tự học**: `Course.sequential` là mặc định; `Lesson.requirePrevious` / `Item.requirePrevious` (nullable) ghi đè, `null` = kế thừa. Hiệu lực: `item ?? lesson ?? course.sequential`. Thứ tự duyệt phẳng theo `(lesson.orderIndex, item.orderIndex)`.
- `Item.type` QUIZ/ASSIGNMENT bắt buộc có `Quiz` (1-1 qua `Quiz.itemId`). Câu hỏi nằm trong `Quiz.questions` (Json, type `QuizQuestion` ở `types/index.ts`).
- Tiến độ lưu theo Item (`UserProgress`); tiến độ Lesson/Course **tính suy ra**, không lưu.
- Like, Comment, UserProgress, UploadedFile tham chiếu `itemId` (UploadedFile thêm `courseId`/`lessonId` cho cover).
- Status dùng enum `ContentStatus` (DRAFT → PENDING_REVIEW → PUBLISHED; PUBLISHED khóa sửa).
- `Role`: ADMIN (toàn quyền), EDITOR (chỉ Course được gán qua `CourseEditor`), MEMBER (đọc + làm bài).

## Cấu trúc thư mục
- `app/` — pages + `app/api/*` (route handlers). `studio/*` là khu quản trị; reader ở `/learn/[course]/[lesson]/[item]`.
- `components/` — `ui` (shadcn), `editor`, `reader`, `studio`, `comments`, `layout`, `admin`.
- `context/HandbookContext.tsx` — store phía client.
- `lib/` — `auth.ts`, `authz.ts` (guard API), `cloudinary*.ts`, `progression.ts`, `seed-data.ts`, `prisma.ts`.
- `types/index.ts` — type dùng chung phía client (`CourseRecord`, `LessonRecord`, `ItemRecord`, …).

## Quy ước
- UI tiếng Việt. Code/identifier tiếng Anh.
- API trả `{ success: boolean, ... }`; ngày là ISO string; lỗi trả HTTP status đúng (401/403/404/422/500), không nuốt lỗi.
- **Mọi route ghi phải gọi guard trong `lib/authz.ts`** (`requireUser`, `requireCourseEditor`…). Không tin `userId`/`callerId` do client gửi; lấy từ session.
- Không thêm `any` mới; dùng type Prisma/`types/index.ts`.
- Component PascalCase; không dùng `<img>` trần cho thứ có thể tối ưu mà không có lý do.
- Nhánh: `feat/…`, `fix/…`, `refactor/…`. Commit nhỏ, rõ lý do.

## Xác thực (kép)
`lib/auth.ts` (Auth.js v5, JWT): `credentials` (email + bcrypt, bật bởi `EMAIL_LOGIN`) và `mpc-sso` (OIDC + PKCE, user SSO tạo với `noPassword: true`). Admin cấp bởi `is_bcn`, `role == ADMIN` hoặc email trong `SUPER_ADMIN_EMAIL(S)`. `middleware.ts` chỉ kiểm tra có session; **phân quyền thật phải làm trong route**.

## Cloudinary
Upload trực tiếp có ký: `POST /api/upload/sign` → upload Cloudinary → `POST /api/upload/register` (tạo `UploadedFile`, `isAttached=false`). Khi lưu Course/Lesson/Item, `syncAttachments` gắn file đang dùng và **gỡ attach** file không còn dùng; `/api/upload/cleanup` xóa file mồ côi. Ảnh bìa phải upload lên Cloudinary (không lưu base64 vào DB). Chỉ `public_id` trong folder `mpc_handbook_assets/` được quản lý.

## Nội dung chương (BlockNote)
- `Item.content` là JSON tài liệu BlockNote (`editor.document`), type `ContentBlock` ở `types/index.ts`. Không còn định dạng khối cũ (`heading_2`, `content: string`); gặp thì đó là sót.
- Trình soạn: `components/editor/ContentEditor.tsx` (chỉ client, import qua `next/dynamic` `ssr:false`). Schema ở `content-schema.tsx`: khối mặc định trừ audio/file/video (upload chỉ nhận ảnh) + khối riêng `callout`, `comparison`, `gallery`, `youtube`. Props khối riêng phải là kiểu nguyên thủy (danh sách lưu chuỗi: ý so sánh mỗi dòng một ý, ảnh thư viện là JSON).
- Dán: HTML (Google Docs, Notion, web) và Markdown do BlockNote xử lý; HTML Word được làm sạch ở `word-paste.ts` (dựng lại danh sách `mso-list`, bỏ ảnh `file:///`). Ảnh dán/kéo thả tải lên Cloudinary qua `uploadToCloudinary`.
- **Ghim `@mantine/core`/`@mantine/hooks` ở 8.x.** Mantine 9 dùng `useEffectEvent`/`Activity` (React 19.2 ổn định) mà React đóng gói trong Next 15 chưa có → `next build` lỗi. Chỉ nâng khi lên Next 16.
- Trang đọc **không** tải BlockNote: `components/reader/ContentBlocks.tsx` render từ JSON. Thêm khối mới = thêm vào schema + `ContentBlocks` + `blockText()` trong `lib/content/blocks.ts`.
- `lib/content/blocks.ts` (dùng được ở server): builder cho seed/mặc định (`h2`, `p`, `ul`, `callout`, `table`…; chữ trong builder nhận `**đậm**`, `*nghiêng*`, `` `code` ``, `[nhãn](url)`), `extractPlainText`, `estimateReadingTime`, `normalizeContent` (lọc JSON không hợp lệ ở API/serializer/bản nháp localStorage).

## Item: chương và bài tập là hai thứ tách biệt
- `CONTENT` (chương) chỉ để đọc, **không có quiz**. `QUIZ` = trắc nghiệm (câu: single/multiple/fill_blank/scale, chấm tự động). `ASSIGNMENT` = bài tập (câu: essay/file_upload/code_submission, chấm tay). Quy tắc nằm ở `lib/quiz-rules.ts` và được server ép (`/api/items`, `/api/quiz/grade`); đổi giữa chương ↔ bài tập bị chặn (409) nếu đã có lượt làm.
- QUIZ/ASSIGNMENT là một trang làm bài riêng (giới thiệu → từng câu → kết quả), **không dùng modal**.
- **Loại item được chọn lúc tạo và khóa cứng sau đó.** `POST /api/items` bắt buộc có `type`; `PUT` đổi loại trả 409 (`itemTypeLocked`). Trình soạn hỏi loại ở bước đầu (`/studio/items/new`), khi sửa chỉ hiện huy hiệu loại chỉ-đọc.

## Thông báo và quản trị
- **Thông báo** (bảng `Notification`, `lib/notifications.ts`): COMMENT (tác giả chương, người được giao khóa và **mọi ADMIN**), REPLY, MENTION (`<@userId>` trong bình luận), COURSE_COMPLETED (admin) + CERTIFICATE_READY (học viên), ASSIGNMENT_SUBMITTED (staff), ASSIGNMENT_GRADED (học viên). Mỗi người chỉ nhận một thông báo cho một bình luận (ưu tiên MENTION > REPLY > COMMENT); người gây ra không tự nhận. Tạo bằng `fireAndForget` sau khi request chính xong (không bao giờ làm hỏng request); chỉ lưu `type` + `data` (snapshot), **câu chữ dựng ở client theo ngôn ngữ người xem**. UI: `components/notifications/` (chuông, popover, polling 60s) và `/notifications`. API: `/api/notifications` (GET, PATCH đánh dấu đã đọc, DELETE), chỉ tác động thông báo của chính mình.
- **Quản lý thành viên** (`/studio/members`, chỉ ADMIN): sửa vai trò/phòng ban/khóa được giao, xóa dữ liệu học tập (`POST /api/members/cleanup`: tiến độ, lượt làm bài, bình luận; toàn bộ hoặc theo khóa), xóa thành viên (`DELETE /api/members`: nội dung họ tạo được chuyển cho người xóa; không xóa được chính mình hoặc Super Admin; chỉ Super Admin xóa được ADMIN khác).
- **Kiểm duyệt bình luận** (`/studio/comments`, ADMIN + EDITOR của khóa đó): `GET /api/comments/manage`, xóa bằng `DELETE /api/comments?id=` (kéo theo các trả lời).

## i18n (next-intl, vi + en, cookie `NEXT_LOCALE`, không tiền tố URL)
- Mọi chuỗi UI qua `useTranslations`/`getTranslations`; không viết chuỗi cứng. Message ở `messages/<locale>/<namespace>.json`, danh sách namespace cố định trong `i18n/config.ts` (thêm namespace = thêm vào đó + tạo file cho cả hai ngôn ngữ). Hai ngôn ngữ phải có CÙNG bộ key và cùng biến ICU.
- Không dịch nội dung khóa học (do người dùng nhập), slug, tên thương hiệu (MPC, MPClub).
- Lỗi API trả mã (`lib/api-errors.ts` → `apiError(code, status, params?)`) và được dịch theo ngôn ngữ người gọi bằng `messages/*/errors.json`; route ném `HttpError(status, code)` hoặc `return apiError(...)`. Thông báo toast của context ở `common.toast.*`.
- Ngày giờ: `useFormatter()` của next-intl, không dùng `lib/date.ts` cho code mới.

## Tính năng học tập
- Tìm kiếm: MiniSearch, bỏ dấu tiếng Việt (`lib/search.ts`, `components/layout/CommandSearch.tsx`, Ctrl+K).
- Chuỗi ngày học và thành tích tính từ `UserProgress` (không lưu DB): `lib/gamification.ts`. Chứng nhận: `/learn/[course]/certificate`.
- Tiến độ học viên cho admin: `/studio/progress` (tổng thể, ma trận học viên × bài học, phễu chương).
- Linh vật (cáo MPC): `components/companion/`, ảnh `public/npc/`. Nhận sự kiện `window` `mpc:companion` (`item_completed`, `quiz_passed`, `quiz_failed`, `assignment_submitted`, `course_completed`, `streak`) do `HandbookContext` phát; ẩn/hiện bằng `mpc:companion-toggle` hoặc nút trong bong bóng (`localStorage` `mpc_companion_hidden`). Art + logic gốc © 2026 MPClub (MIT).
- Animation dùng `motion/react`, luôn tôn trọng `prefers-reduced-motion`; thanh/vòng tiến độ dùng `components/ui/animated-progress.tsx`.
- Giao diện ưu tiên tối giản: một hành động chính mỗi màn hình, breadcrumb và ô tìm kiếm chỉ ở header.

## SEO và link preview (`lib/seo.ts`, `lib/seo-metadata.ts`, `lib/og.tsx`)
- Chỉ trang chủ `/` được lập chỉ mục. `app/robots.ts` chặn mọi thứ khác với `*`; mọi trang còn lại có `noindex` (metadata) và middleware gắn `X-Robots-Tag: noindex`. Bot tạo link preview (Facebook, Zalo, Slack, Discord, Telegram, X, LinkedIn, WhatsApp) được cho phép vào `/learn/` để lấy preview.
- **Link preview không có đăng nhập, nên phải chỉ lộ thứ công khai.** `resolvePreview()` chỉ coi là công khai khi khóa `PUBLISHED` + `PUBLIC` + `FREE` + không giới hạn nhóm, bài học và chương đã xuất bản. Công khai → tiêu đề + đoạn trích ngắn (~160 ký tự, chỉ chương đọc; trắc nghiệm/bài tập không bao giờ lộ câu hỏi) + ảnh bìa. Mọi trường hợp khác (nháp, nội bộ, giới hạn nhóm, không tồn tại) → cùng một thẻ chung "Nội dung nội bộ", không lộ việc nội dung có tồn tại hay không.
- Ảnh preview 1200×630 do `opengraph-image.tsx` của từng segment sinh ra (font Plus Jakarta Sans trong `assets/fonts/`, có tiếng Việt). Đặt metadata cho trang client bằng `layout.tsx` server cùng segment.
- **Không bao giờ nhúng dữ liệu item/quiz từ server component xuống client** (đã từng làm lộ đáp án quiz và nội dung nháp qua HTML). Client chỉ dùng `/api/handbook/data` đã lọc theo quyền.
- `APP_URL` (URL công khai của site) dùng cho canonical, og:url, sitemap; thiếu/giả thì dùng `https://handbook.mpclub.dev`.

## Lưu ý
- Không chạy `pnpm build` khi `pnpm dev` đang chạy (dùng chung `.next`, sẽ hỏng cache). Hỏng thì tắt mọi tiến trình `next`, xóa `.next` rồi chạy lại.
- Code đã chuyển hoàn toàn từ `Category(depth)+Article` sang `Course→Lesson→Item`. Nếu gặp `Article`/`articleId`/`depth` thì đó là sót, hãy chuyển sang mô hình mới thay vì giữ tương thích cũ.
- URL: reader `/learn/[course]/[lesson]/[item]`; studio `/studio/curriculum` (cây), `/studio/items` (danh sách), `/studio/items/[id]` (soạn). Đường dẫn cũ `/docs/*`, `/studio/articles/*`, `/editor/*` được `middleware.ts` redirect.
- `GET /api/handbook/data` lọc theo người xem: khách/thành viên chỉ nhận nội dung đã xuất bản, đáp án quiz bị loại, tiến độ chỉ của chính họ. Chấm điểm luôn ở server (`/api/quiz/grade`).
- Lint (`pnpm lint`) còn lỗi `react-hooks/*` có sẵn từ trước ở `HandbookContext`, `QuizRunner`, `QuizBuilder`, các trang studio; `tsc` và `build` sạch.
- DB là Prisma Postgres từ xa; `.env` và `.env.production` có thể trỏ cùng một DB. Không chạy `db push --force-reset` / `db:reset` khi chưa chắc đang trỏ vào DB nào.
