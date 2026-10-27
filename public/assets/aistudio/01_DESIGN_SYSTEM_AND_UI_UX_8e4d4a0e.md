# 01. HỆ THỐNG DESIGN SYSTEM & UI/UX ("MPC DEV DOCS")

Hệ thống thiết kế được lấy cảm hứng từ **Mintlify**, **Linear**, và **GitBook**: Hiện đại, đậm chất Developer (cho CLB Lập trình), nhưng vẫn trực quan, thoáng đãng để các ban 비-kỹ thuật (Truyền thông, Sự kiện, Nhân sự) đọc và soạn thảo dễ dàng.

---

## 1. Bảng màu (Color Palette - Hỗ trợ Dark & Light Mode)

Sử dụng hệ màu **Slate / Zinc** kết hợp với màu nhấn thương hiệu của CLB (`Primary Brand`). Khuyến khích đặt **Dark Mode** hoặc **System** làm mặc định cho dân lập trình, nhưng giữ **Light Mode** có độ tương phản cao khi đọc tài liệu dài.

```css
/* src/app/globals.css */
@layer base {
  :root {
    /* Light Mode - Sáng sủa, giống trang giấy kỹ thuật số */
    --background: 0 0% 100%;           /* #FFFFFF - Nền trang đọc chính */
    --background-subtle: 210 40% 98%;  /* #F8FAFC - Nền Sidebar & Khối phụ */
    --foreground: 222.2 84% 4.9%;      /* #090D16 - Chữ chính (Độ tương phản cao) */
    --muted-foreground: 215.4 16.3% 46.9%; /* #64748B - Chữ phụ, chú thích */
    
    /* Màu chủ đạo MPC (Xanh công nghệ / Indigo) */
    --primary: 221.2 83.2% 53.3%;      /* #2563EB */
    --primary-foreground: 210 40% 98%;
    
    /* Màu trạng thái Lộ trình & Quiz */
    --success: 142.1 76.2% 36.3%;      /* #16A34A - Đã hoàn thành bài / Đạt Quiz */
    --warning: 38 92% 50%;             /* #F59E0B - Bài đang đọc dở / Cần làm Quiz */
    --destructive: 0 84.2% 60.2%;      /* #EF4444 - Chưa đạt Quiz */
    --border: 214.3 31.8% 91.4%;       /* #E2E8F0 - Viền mảnh 1px */
  }

  .dark {
    /* Dark Mode - Phong cách Linear / Mintlify */
    --background: 224 71% 4%;          /* #030712 - Nền chính đen sâu dịu mắt */
    --background-subtle: 222 47% 7%;   /* #0B0F19 - Nền Sidebar & Card */
    --foreground: 213 31% 91%;         /* #E2E8F0 - Chữ trắng xám không gây chói */
    --muted-foreground: 215 20.2% 65.1%; /* #94A3B8 */
    
    --primary: 217.2 91.2% 59.8%;      /* #3B82F6 */
    --primary-foreground: 222.2 47.4% 11.2%;
    
    --success: 142.1 70.6% 45.3%;      /* #22C55E */
    --warning: 48 96% 53%;             /* #EAB308 */
    --destructive: 0 62.8% 30.6%;      /* #EF4444 */
    --border: 216 34% 17%;             /* #1E293B */
  }
}
```

---

## 2. Typography (Hệ thống Phông chữ)

Để hiển thị tiếng Việt hoàn hảo và giữ chất "lập trình":
- **Heading & UI (`--font-sans`):** `Inter` hoặc `Plus Jakarta Sans` (Hỗ trợ dấu tiếng Việt cân đối, rõ nét ở kích thước nhỏ trên Sidebar).
- **Code & Ký hiệu kỹ thuật (`--font-mono`):** `JetBrains Mono` (Có ligatures đẹp mắt cho các bài hướng dẫn code của CLB).
- **Quy chuẩn kích thước trong bài viết (Article Prose):**
  - Độ rộng tối đa của vùng đọc văn bản: `max-w-3xl` (`768px`) $ightarrow$ Đảm bảo mắt người đọc không phải đảo quá dài trên màn hình lớn (chuẩn 65–75 ký tự/dòng).
  - Cỡ chữ nội dung (`p`, `li`): `16px` (`1rem`), chiều cao dòng `line-height: 1.75` (`leading-7`).
  - `H1` (Tiêu đề bài): `32px` (`text-3xl font-bold tracking-tight`).
  - `H2` (Mục lớn - Neo vào TOC): `24px` (`text-2xl font-semibold mt-8 mb-4 border-b pb-2`).
  - `H3` (Mục nhỏ - Neo vào TOC): `20px` (`text-xl font-medium mt-6 mb-3`).

---

## 3. Bố cục Giao diện (Layout Architecture)

### A. Giao diện Đọc Sổ tay (Reader Layout - 3 Cột)

```text
+-----------------------------------------------------------------------------------+
| HEADER (h-14, sticky): [Logo MPC Docs]     [Search: Ctrl+K]     [Theme] [UserSSO] |
+----------------------+-------------------------------------+----------------------+
| LEFT SIDEBAR (w-72)  | MAIN CONTENT AREA (flex-1)          | RIGHT TOC (w-64)     |
|                      | (Container: max-w-3xl mx-auto py-8) | (Sticky top-20)      |
| [v] 1. NỘI QUY CLB   |                                     |                      |
|   ✅ Quy tắc ứng xử  |  Nội quy CLB > Quy trình Họp        | MỤC LỤC BÀI VIẾT     |
|   📖 Quy trình Họp   |  # Quy trình Họp Định Kỳ            | - 1. Trước buổi họp  |
|   🔒 Kỷ luật & Thưởng|  Cập nhật: 24/10/2026 • Đọc 4 phút  | - 2. Trong buổi họp  |
|                      |  ---------------------------------  | - 3. Viết biên bản   |
| [v] 2. SỰ KIỆN       |  [Khối Attachments: Drive, YouTube] |                      |
|   [v] 2.1 WebDesign  |                                     | TIẾN ĐỘ BÀI ĐỌC      |
|     ✅ Lên đề bài    |  Nội dung bài viết từ BlockNote...  | [✅] Đã đọc hết bài  |
|     🔒 Chấm điểm     |                                     | [⏳] Quiz: Cần đạt 80%|
|   [>] 2.2 Tuyển CTV  |  [Sentinel: Điểm kiểm tra cuộn đáy] |                      |
|                      |  +-------------------------------+  |                      |
|                      |  | BÀI TẬP CUỐI BÀI (QUIZ BOX)   |  |                      |
|                      |  +-------------------------------+  |                      |
|                      |  [<- Bài trước]   [Bài tiếp theo ->]|                      |
+----------------------+-------------------------------------+----------------------+
```

- **Responsive trên Điện thoại / Tablet:**
  - Ẩn `LEFT SIDEBAR` vào một `Sheet` (Drawer trượt từ trái sang khi bấm nút Menu).
  - Ẩn `RIGHT TOC` và thay bằng một thanh `Progress Bar` mảnh (`h-1`) dính sát dưới Header để báo tiến độ cuộn trang.

---

## 4. Thiết kế các Component Đặc thù

### 4.1. Cây thư mục 2 tầng trên Sidebar (`AppSidebar`)
- **Tầng 1 (Category Root):** Chữ in hoa nhỏ hoặc in đậm (`font-semibold text-sm text-foreground`), có icon riêng (VD: 📁, 🚀, 📸). Có thể chứa bài viết trực tiếp hoặc chứa Thư mục Tầng 2.
- **Tầng 2 (Sub-category):** Thụt lề `pl-4` kèm đường kẻ dọc dẫn hướng (`border-l border-border`).
- **Bài viết (Article Item):** Hiển thị trạng thái rõ ràng ở bên phải hoặc trái tên bài:
  - `✅` (Màu xanh lá `--success`): Đã hoàn thành đọc + vượt qua Quiz (nếu có).
  - `🔵` (Chấm xanh dương nhấp nháy): Bài hiện tại đang mở hoặc được phép đọc.
  - `🔒` (Icon ổ khóa mờ `opacity-50 cursor-not-allowed`): Bài bị khóa do bài trước trong lộ trình chưa hoàn thành. Khi di chuột vào hiện Tooltip: *"Hãy hoàn thành bài '[Tên bài trước]' để mở khóa"*.

### 4.2. Khối Đính kèm Đa phương tiện (`Attachment Bar`)
Nằm ngay dưới tiêu đề bài viết (hoặc cuối bài), gom nhóm tất cả tài nguyên liên quan đến bài đó:
- **Link Google Drive (Tài liệu, Folder ảnh, Sheet):** Hiển thị dạng Card ngang nhỏ gọn có logo Google Drive, tên file, và nút `Mở Drive ↗`.
- **Link YouTube (Video record buổi training/sharing):** Có thể chọn chế độ nhúng trình phát trực tiếp trong bài hoặc bật Modal xem video để không làm gián đoạn việc đọc chữ.

### 4.3. Thanh Trạng thái Cuộn & Hộp Quiz Cuối bài (`Progression Gate`)
Ở cuối mỗi bài viết có bật cấu hình lộ trình:
1. **Khi chưa cuộn tới đáy (hoặc đọc quá nhanh dưới mức thời gian tối thiểu):**
   - Hiển thị khung nhắc nhở: *"📖 Hãy đọc kỹ hết nội dung bài viết để mở khóa phần bài tập / bài tiếp theo."*
2. **Khi đã cuộn tới đáy hợp lệ:**
   - Nếu **không có Quiz**: Tự động đổi trạng thái sang `Đã hoàn thành`, bật nút **"Tiếp tục: [Tên bài kế tiếp] →"** màu xanh nổi bật.
   - Nếu **có Quiz**: Mở khóa khung `QuizRunner` ngay bên dưới với giao diện dạng Thẻ câu hỏi (Question Cards), hiển thị rõ yêu cầu: *"Cần đạt tối thiểu **80%** (4/5 câu) để mở khóa bài tiếp theo"*.
