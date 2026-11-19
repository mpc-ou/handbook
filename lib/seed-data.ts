import {
  CategoryRecord,
  ContentAudience,
  ContentStatus,
  ContentBlock,
  ContentVisibility,
  ItemAttachment,
  ItemType,
  QuizQuestion,
} from "@/types";
import {
  callout,
  code,
  comparison,
  doc,
  estimateReadingTime,
  extractPlainText,
  countBlocks,
  gallery,
  h2,
  h3,
  ol,
  p,
  table,
  todo,
  ul,
  withIds,
} from "./content/blocks";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const NOW = "2026-10-24T08:00:00.000Z";

export type SeedCategory = CategoryRecord;

export interface SeedCourse {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverImage: string;
  status: ContentStatus;
  orderIndex: number;
  sequential: boolean;
  visibility: ContentVisibility;
  audience: ContentAudience;
  allowedGroups: string[];
  categorySlugs: string[];
  editorEmails?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SeedLesson {
  id: string;
  courseSlug: string;
  title: string;
  slug: string;
  summary: string;
  coverImage: string;
  orderIndex: number;
  isPublished: boolean;
  requirePrevious: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeedItem {
  id: string;
  courseSlug: string;
  lessonSlug: string;
  type: ItemType;
  title: string;
  slug: string;
  summary: string;
  orderIndex: number;
  status: ContentStatus;
  isRequired: boolean;
  requirePrevious: boolean | null;
  requireScrollToBottom: boolean;
  passScorePercent: number;
  content: ContentBlock[];
  plainText: string;
  readingTime: number;
  attachments: ItemAttachment[];
  quizTitle?: string;
  quizDescription?: string;
  quizDurationMinutes?: number;
  quizMaxAttempts?: number;
  quizIsExam?: boolean;
  quizQuestions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Danh mục phẳng (tag) dùng để phân loại Course.
 * Không có parentId hay depth.
 */
export const INITIAL_CATEGORIES: CategoryRecord[] = [
  {
    id: "cat_rules",
    name: "Nội quy",
    slug: "noi-quy",
    description: "Quy tắc ứng xử, quy trình họp định kỳ và cơ chế đánh giá thành viên MPC",
    icon: "ShieldCheck",
    orderIndex: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cat_events",
    name: "Sự kiện",
    slug: "su-kien",
    description: "Quy trình chuẩn tổ chức các sự kiện học thuật và hoạt động lớn của CLB",
    icon: "CalendarRange",
    orderIndex: 1,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cat_skills",
    name: "Đào tạo kỹ năng",
    slug: "dao-tao-ky-nang",
    description: "Tài liệu hướng dẫn chuyên môn lập trình, truyền thông, chụp ảnh và thiết kế",
    icon: "GraduationCap",
    orderIndex: 2,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cat_recruitment",
    name: "Tuyển CTV",
    slug: "tuyen-ctv",
    description: "Kịch bản truyền thông, chấm đơn và phỏng vấn tuyển thành viên mới",
    icon: "Users",
    orderIndex: 3,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cat_tech_dept",
    name: "Ban chuyên môn",
    slug: "ban-chuyen-mon",
    description: "Tiêu chuẩn Git Flow, kiến trúc dự án, ra đề thi và duyệt code nội bộ",
    icon: "Terminal",
    orderIndex: 4,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cat_media_dept",
    name: "Ban truyền thông",
    slug: "ban-truyen-thong",
    description: "Cẩm nang chụp ảnh sự kiện, viết bài fanpage và nhận diện thương hiệu MPC",
    icon: "Camera",
    orderIndex: 5,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

/**
 * Danh sách Khóa học mẫu (Course).
 * - Course 1 (`noi-quy-clb`): sequential = true (học theo thứ tự)
 * - Course 2 (`cam-nang-su-kien`): sequential = true (học theo thứ tự)
 * - Course 3 (`dao-tao-ky-nang`): sequential = false (học tự do)
 */
export const INITIAL_COURSES: SeedCourse[] = [
  {
    id: "crs_club_rules",
    title: "Nội quy & Văn hóa CLB",
    slug: "noi-quy-clb",
    summary:
      "Lộ trình hội nhập bắt buộc dành cho mọi thành viên và cộng tác viên MPC: từ quy tắc ứng xử, giao tiếp nội bộ, quy trình họp định kỳ đến hệ thống tính điểm MPC Point.",
    coverImage: "preset:pattern-galaxy",
    status: "PUBLISHED",
    orderIndex: 0,
    sequential: true,
    visibility: "PUBLIC",
    audience: "FREE",
    allowedGroups: [],
    categorySlugs: ["noi-quy"],
    editorEmails: ["editor.quan@mpclub.dev"],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "crs_event_playbook",
    title: "Cẩm nang Tổ chức Sự kiện CLB",
    slug: "cam-nang-su-kien",
    summary:
      "Quy trình vận hành chuẩn cho các sự kiện trọng điểm của CLB MPC: cuộc thi học thuật WebDesign thường niên và chiến dịch tuyển Cộng tác viên mới.",
    coverImage: "preset:pattern-code",
    status: "PUBLISHED",
    orderIndex: 1,
    sequential: true,
    visibility: "PUBLIC",
    audience: "INTERNAL",
    allowedGroups: [],
    categorySlugs: ["su-kien", "tuyen-ctv", "ban-chuyen-mon"],
    editorEmails: ["editor.quan@mpclub.dev", "editor.linh@mpclub.dev"],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "crs_skill_training",
    title: "Đào tạo Kỹ năng Chuyên môn & Truyền thông",
    slug: "dao-tao-ky-nang",
    summary:
      "Kho học liệu mở giúp thành viên các ban rèn luyện kỹ năng chụp ảnh sự kiện, sáng tạo nội dung truyền thông, thiết kế thương hiệu và quy trình kỹ thuật.",
    coverImage: "preset:pattern-mesh",
    status: "PUBLISHED",
    orderIndex: 2,
    sequential: false, // Học tự do
    visibility: "PUBLIC",
    audience: "FREE",
    allowedGroups: [],
    categorySlugs: ["dao-tao-ky-nang", "ban-truyen-thong", "ban-chuyen-mon"],
    editorEmails: ["editor.linh@mpclub.dev"],
    createdAt: NOW,
    updatedAt: NOW,
  },
];

/**
 * Danh sách Bài học mẫu (Lesson) thuộc các Course.
 * Có ảnh bìa (`preset:<id>`).
 */
export const INITIAL_LESSONS: SeedLesson[] = [
  // Course 1: noi-quy-clb (2 Lessons)
  {
    id: "les_code_of_conduct",
    courseSlug: "noi-quy-clb",
    title: "Quy tắc ứng xử",
    slug: "quy-tac-ung-xu",
    summary:
      "Nền tảng văn hóa Tôn trọng - Chủ động - Chia sẻ, quy trình họp định kỳ và cơ chế khen thưởng kỷ luật tại CLB MPC.",
    coverImage: "preset:pattern-cube",
    orderIndex: 0,
    isPublished: true,
    requirePrevious: null, // Kế thừa Course.sequential = true
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "les_onboarding_guide",
    courseSlug: "noi-quy-clb",
    title: "Giới thiệu & Hướng dẫn",
    slug: "gioi-thieu-va-huong-dan",
    summary:
      "Hướng dẫn thiết lập tài khoản MPC-SSO, làm quen hệ sinh thái công cụ làm việc chung và lộ trình hoạt động học kỳ.",
    coverImage: "preset:pattern-terminal",
    orderIndex: 1,
    isPublished: true,
    requirePrevious: false, // Ghi đè Course.sequential = true: cho phép mở bài học này tự do để demo
    createdAt: NOW,
    updatedAt: NOW,
  },

  // Course 2: cam-nang-su-kien (2 Lessons)
  {
    id: "les_webdesign_event",
    courseSlug: "cam-nang-su-kien",
    title: "Sự kiện WebDesign",
    slug: "su-kien-webdesign",
    summary:
      "Tài liệu toàn diện về quy trình ra đề bài, bảo mật đề thi, tiêu chí chấm điểm và điều phối đêm Chung kết WebDesign.",
    coverImage: "preset:pattern-circuit",
    orderIndex: 0,
    isPublished: true,
    requirePrevious: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "les_recruitment_event",
    courseSlug: "cam-nang-su-kien",
    title: "Tuyển cộng tác viên",
    slug: "tuyen-ctv",
    summary:
      "Kịch bản truyền thông, quy trình 3 vòng tuyển chọn và tiêu chí phỏng vấn đánh giá thái độ ứng viên MPC.",
    coverImage: "preset:pattern-mesh",
    orderIndex: 1,
    isPublished: true,
    requirePrevious: null,
    createdAt: NOW,
    updatedAt: NOW,
  },

  // Course 3: dao-tao-ky-nang (1 Lesson)
  {
    id: "les_media_skills",
    courseSlug: "dao-tao-ky-nang",
    title: "Ban Truyền thông và Sự kiện",
    slug: "ban-truyen-thong",
    summary:
      "Cẩm nang chụp ảnh sự kiện, công thức viết bài truyền thông fanpage và quy chuẩn nhận diện thương hiệu MPC.",
    coverImage: "preset:pattern-code",
    orderIndex: 0,
    isPublished: true,
    requirePrevious: null, // Kế thừa Course.sequential = false (học tự do)
    createdAt: NOW,
    updatedAt: NOW,
  },
];

type RawSeedItem = Omit<SeedItem, "plainText" | "readingTime">;

const RAW_INITIAL_ITEMS: RawSeedItem[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // COURSE 1: noi-quy-clb → LESSON 1: quy-tac-ung-xu
  // Gồm 3 Item CONTENT (tái sử dụng 3 bài nội quy cũ) + 1 Item QUIZ (≥ 3 câu)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "itm_code_of_conduct",
    courseSlug: "noi-quy-clb",
    lessonSlug: "quy-tac-ung-xu",
    type: "CONTENT",
    title: "Chương 1: Quy tắc ứng xử và văn hóa làm việc tại MPC",
    slug: "quy-tac-ung-xu-mpc",
    summary:
      "Nền tảng văn hóa Tôn trọng - Chủ động - Chia sẻ, quy định giao tiếp trên kênh chung và bảo mật hệ sinh thái công nghệ.",
    orderIndex: 0,
    status: "PUBLISHED",
    isRequired: true,
    requirePrevious: false,
    requireScrollToBottom: true,
    passScorePercent: 0,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [
      {
        id: "att_coc_1",
        type: "drive",
        title: "Sổ tay văn hóa và nội quy toàn diện MPC",
        url: "https://drive.google.com/drive/folders/mpc-culture-handbook",
      },
      {
        id: "att_coc_2",
        type: "youtube",
        title: "Video chào đón thành viên mới Gen 12",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
    ],
    content: doc(
      callout("info", "Chào mừng bạn đến với hệ thống Sổ tay nội bộ MPC Handbook! Đây là bài đọc mở đầu bắt buộc trong lộ trình hội nhập dành cho mọi thành viên CLB."),
      h2("1. Ba giá trị cốt lõi của Câu lạc bộ Lập trình Học thuật"),
      p("Từ những ngày đầu thành lập, MPC luôn duy trì môi trường học thuật mở, nơi các thành viên từ Ban Chuyên môn, Ban Truyền thông, Ban Sự kiện và Ban Nhân sự cùng nhau phát triển kỹ năng thực chiến."),
      ol([
        "**Chủ động học hỏi:** Tự giác nghiên cứu tài liệu trước khi đặt câu hỏi và sẵn sàng nhận nhiệm vụ mới.",
        "**Tinh thần đồng đội:** Không để đồng đội bị quá tải; báo cáo sớm cho Trưởng ban ít nhất 24 giờ nếu gặp sự cố cá nhân.",
        "**Chia sẻ tri thức:** Mọi sự kiện và dự án sau khi kết thúc đều phải được đúc kết thành tài liệu trên [Cổng tài liệu MPC](https://docs.mpclub.dev).",
      ]),
      comparison({
        title: "Khung so sánh văn hóa làm việc và phối hợp tại MPC",
        leftTitle: "Nên làm tại MPC",
        leftPoints: [
          "Chủ động phản hồi tin nhắn gắn thẻ trong vòng 12 giờ",
          "Góp ý mang tính xây dựng trực tiếp vào sản phẩm",
          "Báo cáo khó khăn trước deadline tối thiểu 24 giờ",
          "Tài liệu hóa mọi quy trình và bài học kinh nghiệm",
        ],
        rightTitle: "Tránh làm tại MPC",
        rightPoints: [
          "Im lặng không xác nhận thông báo công việc quan trọng",
          "Công kích hoặc chỉ trích cá nhân đồng đội",
          "Đến sát giờ sự kiện mới thông báo vắng mặt",
          "Tự ý chia sẻ tài khoản hoặc mã nguồn nội bộ ra ngoài",
        ],
      }),
      h2("2. Quy chuẩn giao tiếp và phản hồi công việc"),
      p("**Bảng quy định thời hạn phản hồi theo kênh liên lạc**"),
      table([
        ["Kênh liên lạc", "Mục đích sử dụng", "Thời hạn phản hồi tối đa", "Ghi chú"],
        ["Discord Server", "Thảo luận chuyên môn, họp ban và điều phối dự án", "Trong vòng 12 giờ", "Cần gắn thẻ đúng vai trò"],
        ["Zalo Thông báo", "Thông báo khẩn cấp từ Ban Chủ Nhiệm", "Trong vòng 6 giờ", "Thả biểu cảm xác nhận đã đọc"],
        ["Email @mpclub.dev", "Biên bản họp chính thức và đối tác ngoài", "Trong vòng 24 giờ", "Kiểm tra hòm thư định kỳ"],
        ["GitHub Pull Request", "Kiểm duyệt mã nguồn và đóng góp tài liệu", "Trong vòng 48 giờ", "Ít nhất 1 duyệt viên chấp thuận"],
      ]),
      h3("2.1 Quy tắc đặt tên nhánh và tài liệu nội bộ"),
      code("bash", `# Chuẩn đặt tên thư mục Google Drive sự kiện:
[YYYY-MM]_[Tên-Sự-Kiện]/[01_Proposal | 02_Design | 03_Media | 04_Report]

# Chuẩn đặt tên nhánh Git trong dự án .mpclub.dev:
feat/mpc-handbook-quiz-engine
fix/sso-token-refresh`),
      gallery("Không gian học thuật và hoạt động tiêu biểu của MPC", [
        { url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80", caption: "Buổi sinh hoạt chuyên đề công nghệ tại phòng lab" },
        { url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80", caption: "Đội ngũ ban tổ chức phối hợp chuẩn bị sự kiện" },
        { url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80", caption: "Thuyết trình đề án và phản biện kỹ thuật" },
      ]),
      h2("3. Bảo mật tài nguyên và bản quyền CLB"),
      callout("warning", "Tuyệt đối không tự ý công khai danh sách thông tin cá nhân thành viên, đề thi chưa công bố hoặc khóa bí mật (.env, API Key) lên các kho lưu trữ công khai."),
    ),
    quizQuestions: [],
  },
  {
    id: "itm_meeting_process",
    courseSlug: "noi-quy-clb",
    lessonSlug: "quy-tac-ung-xu",
    type: "CONTENT",
    title: "Chương 2: Quy trình họp định kỳ và viết biên bản",
    slug: "quy-trinh-hop-dinh-ky",
    summary:
      "Hướng dẫn chuẩn bị Agenda trước buổi họp 24h, điều phối thảo luận hiệu quả và mẫu biên bản họp chuẩn MPC.",
    orderIndex: 1,
    status: "PUBLISHED",
    isRequired: true,
    requirePrevious: null,
    requireScrollToBottom: true,
    passScorePercent: 0,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [
      {
        id: "att_meet_1",
        type: "drive",
        title: "Biên bản họp chuẩn của CLB và các ban",
        url: "https://docs.google.com/document/d/mpc-meeting-minutes-template",
      },
    ],
    content: doc(
      h2("1. Trước buổi họp (24 giờ trước giờ G)"),
      p("Mọi buổi họp toàn CLB hoặc họp Ban chỉ được phép diễn ra khi đã có Agenda (khung chương trình họp) gửi trước tối thiểu 24 giờ."),
      todo("Chốt mục tiêu cuộc họp, thời lượng dự kiến và danh sách người tham dự", true),
      todo("Phân công thư ký ghi biên bản trước khi bắt đầu", true),
      h2("2. Trong buổi họp: Nguyên tắc 50/10"),
      ol([
        "10 phút đầu: Điểm danh nhanh và rà soát tiến độ các đầu việc từ buổi họp trước.",
        "40 phút giữa: Thảo luận tập trung vào các vấn đề trong Agenda, tránh lan man.",
        "10 phút cuối: Chốt các đầu việc cần làm (ai làm việc gì, hạn chót ngày nào, kết quả đầu ra là gì).",
      ]),
      h2("3. Sau buổi họp: Công bố biên bản trong 12 giờ"),
      callout("success", "Thư ký cuộc họp cần hoàn thiện biên bản họp và đăng tải link lên kênh thông báo trong vòng 12 giờ sau khi kết thúc để các thành viên vắng mặt có phép nắm bắt đầy đủ."),
    ),
    quizQuestions: [],
  },
  {
    id: "itm_reward_discipline",
    courseSlug: "noi-quy-clb",
    lessonSlug: "quy-tac-ung-xu",
    type: "CONTENT",
    title: "Chương 3: Cơ chế đánh giá, khen thưởng và kỷ luật",
    slug: "ky-luat-va-khen-thuong",
    summary:
      "Hệ thống tính điểm đóng góp học kỳ (MPC Point), tiêu chí xét thưởng và quy định xử lý vi phạm.",
    orderIndex: 2,
    status: "PUBLISHED",
    isRequired: true,
    requirePrevious: null,
    requireScrollToBottom: true,
    passScorePercent: 0,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [
      {
        id: "att_rew_1",
        type: "drive",
        title: "Bảng quy đổi điểm hoạt động MPC Point học kỳ 2026",
        url: "https://docs.google.com/spreadsheets/d/mpc-points-2026",
      },
    ],
    content: doc(
      h2("1. Hệ thống điểm hoạt động MPC Point"),
      p("Mỗi thành viên bắt đầu học kỳ với 100 điểm cơ sở. Điểm được cộng thêm khi tham gia ban tổ chức sự kiện, viết bài chia sẻ kỹ thuật hoặc hỗ trợ đào tạo nội bộ."),
      h2("2. Danh hiệu khen thưởng cuối kỳ"),
      ul([
        "Thành viên xuất sắc học kỳ: Top 5 thành viên có điểm đóng góp cao nhất toàn CLB.",
        "Thành viên tích cực: Thành viên đạt từ 130 điểm trở lên và hoàn thành 100% lộ trình Sổ tay MPC.",
        "Giấy chứng nhận từ Ban Chủ Nhiệm và Khoa xác nhận tham gia công tác tổ chức sự kiện học thuật.",
      ]),
      h2("3. Các mức nhắc nhở và xử lý vi phạm"),
      callout("info", "Sau khi đọc xong 3 chương nội quy, hãy bước sang Bài tập cuối chương bên dưới để hoàn thành bài học Quy tắc ứng xử!"),
    ),
    quizQuestions: [],
  },
  {
    id: "itm_rules_quiz",
    courseSlug: "noi-quy-clb",
    lessonSlug: "quy-tac-ung-xu",
    type: "QUIZ",
    title: "Bài tập cuối chương: Kiểm tra Nội quy & Văn hóa MPC",
    slug: "bai-tap-noi-quy-mpc",
    summary:
      "Bài kiểm tra trắc nghiệm tổng hợp kiến thức về quy tắc ứng xử, giao tiếp nội bộ, bảo mật tài nguyên và quy trình họp định kỳ tại MPC.",
    orderIndex: 3,
    status: "PUBLISHED",
    isRequired: true,
    requirePrevious: true,
    requireScrollToBottom: false,
    passScorePercent: 80,
    quizTitle: "Bài kiểm tra Nội quy & Văn hóa CLB MPC",
    quizDescription: "Hoàn thành tối thiểu 80% số câu đúng để vượt qua bài học Quy tắc ứng xử.",
    quizDurationMinutes: 10,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [],
    content: doc(
      callout("info", "Hãy trả lời các câu hỏi trắc nghiệm bên dưới dựa trên nội dung 3 chương Quy tắc ứng xử, Quy trình họp định kỳ và Cơ chế đánh giá MPC Point."),
    ),
    quizQuestions: [
      {
        id: "q_coc_1",
        questionText:
          "Theo quy chuẩn giao tiếp của CLB MPC, thời gian tối đa cần phản hồi hoặc xác nhận khi được gắn thẻ (@mention) trong thông báo công việc là bao lâu?",
        type: "single",
        options: [
          { id: "opt_1", text: "Trong vòng tối đa 12 giờ" },
          { id: "opt_2", text: "Trong vòng 48 giờ" },
          { id: "opt_3", text: "Chỉ cần phản hồi vào cuối tuần" },
          { id: "opt_4", text: "Không bắt buộc phản hồi nếu bận" },
        ],
        correctOptionIds: ["opt_1"],
        explanation:
          "Quy định SLA giao tiếp nội bộ yêu cầu xác nhận hoặc phản hồi trong vòng tối đa 12 giờ để không làm chậm tiến độ chung của Ban.",
      },
      {
        id: "q_coc_2",
        questionText:
          "Khi gặp sự cố cá nhân không thể hoàn thành đúng hạn đầu việc sự kiện, thành viên cần báo trước cho Trưởng ban tối thiểu bao lâu?",
        type: "single",
        options: [
          { id: "opt_a", text: "Ngay sát giờ diễn ra sự kiện" },
          { id: "opt_b", text: "Tối thiểu 24 giờ trước hạn chót (deadline)" },
          { id: "opt_c", text: "Sau khi sự kiện đã kết thúc" },
        ],
        correctOptionIds: ["opt_b"],
        explanation:
          "Báo sớm tối thiểu 24 giờ giúp Trưởng ban kịp thời điều phối nhân sự hỗ trợ mà không ảnh hưởng tới sự kiện.",
      },
      {
        id: "q_coc_3",
        questionText:
          "Những hành động nào sau đây bị NGHIÊM CẤM tại CLB MPC? (Chọn tất cả đáp án đúng)",
        type: "multiple",
        options: [
          { id: "m_1", text: "Chia sẻ tài khoản MPC-SSO cho người ngoài CLB" },
          { id: "m_2", text: "Đẩy file .env chứa API Key hoặc đề thi chưa công bố lên GitHub public" },
          { id: "m_3", text: "Viết tài liệu tổng kết kinh nghiệm sau sự kiện lên MPC Handbook" },
        ],
        correctOptionIds: ["m_1", "m_2"],
        explanation:
          "Chia sẻ tài khoản MPC-SSO và làm lộ khóa bảo mật/đề thi đều vi phạm nghiêm trọng quy định bảo mật của CLB.",
      },
      {
        id: "q_meet_1",
        questionText: "Agenda của buổi họp định kỳ cần được gửi trước cho thành viên tối thiểu bao lâu?",
        type: "single",
        options: [
          { id: "o1", text: "Tối thiểu 24 giờ trước buổi họp" },
          { id: "o2", text: "5 phút trước khi họp" },
          { id: "o3", text: "Không cần Agenda" },
        ],
        correctOptionIds: ["o1"],
        explanation: "Gửi Agenda trước 24h giúp các thành viên chuẩn bị sẵn ý kiến và số liệu báo cáo.",
      },
      {
        id: "q_meet_2",
        questionText: "Mỗi Action Item chốt ở cuối buổi họp bắt buộc phải bao gồm những yếu tố nào?",
        type: "single",
        options: [
          { id: "a1", text: "Chỉ cần ghi tên công việc chung chung" },
          { id: "a2", text: "Người phụ trách + Hạn chót + Kết quả đầu ra cụ thể" },
          { id: "a3", text: "Chỉ cần ghi tên Trưởng ban" },
        ],
        correctOptionIds: ["a2"],
        explanation:
          "Mọi đầu việc phải gắn rõ người phụ trách, hạn chót và kết quả đầu ra để theo dõi nghiệm thu minh bạch.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // COURSE 1: noi-quy-clb → LESSON 2: gioi-thieu-va-huong-dan
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "itm_onboarding_ecosystem",
    courseSlug: "noi-quy-clb",
    lessonSlug: "gioi-thieu-va-huong-dan",
    type: "CONTENT",
    title: "Chương 1: Hướng dẫn thiết lập tài khoản MPC-SSO và công cụ làm việc",
    slug: "thiet-lap-cong-cu-mpc",
    summary:
      "Danh mục các nền tảng làm việc chính thức của CLB MPC gồm cổng đăng nhập một lần MPC-SSO, Discord, Google Drive và GitHub Organization.",
    orderIndex: 0,
    status: "PUBLISHED",
    isRequired: true,
    requirePrevious: null,
    requireScrollToBottom: true,
    passScorePercent: 0,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [],
    content: doc(
      h2("1. Đăng nhập một lần với tài khoản MPC-SSO"),
      p("Mỗi thành viên chính thức và Cộng tác viên của CLB được cấp một tài khoản định danh thống nhất trên hệ thống MPC-SSO để truy cập Sổ tay nội bộ, hệ thống chấm bài và kho tài nguyên CLB."),
      todo("Đăng nhập thành công vào MPC Handbook qua cổng MPC-SSO", true),
      todo("Cập nhật đúng tên hiển thị theo cú pháp [Ban] Họ và Tên trên Discord Server CLB", true),
      callout("info", "Bài học này được cấu hình requirePrevious = false để bạn có thể tra cứu nhanh hướng dẫn công cụ bất cứ lúc nào ngay cả khi chưa hoàn thành bài học trước."),
    ),
    quizQuestions: [],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // COURSE 2: cam-nang-su-kien → LESSON 1: su-kien-webdesign
  // Tái sử dụng 2 bài WebDesign cũ + 1 Item QUIZ
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "itm_webdesign_prompt",
    courseSlug: "cam-nang-su-kien",
    lessonSlug: "su-kien-webdesign",
    type: "CONTENT",
    title: "Chương 1: Quy trình lên đề bài và thể lệ cuộc thi WebDesign",
    slug: "webdesign-len-de-bai",
    summary:
      "Cách xây dựng chủ đề cuộc thi, bộ tiêu chí kỹ thuật và quy trình bảo mật đề thi cho sự kiện WebDesign.",
    orderIndex: 0,
    status: "PUBLISHED",
    isRequired: true,
    requirePrevious: false,
    requireScrollToBottom: true,
    passScorePercent: 0,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [
      {
        id: "att_wd_1",
        type: "github",
        title: "Mã nguồn mẫu cho thí sinh WebDesign",
        url: "https://github.com/mpclub-dev/webdesign-starter-kit",
      },
      {
        id: "att_wd_2",
        type: "figma",
        title: "Bộ thiết kế mẫu WebDesign 2026",
        url: "https://www.figma.com/file/mpc-webdesign-2026",
      },
    ],
    content: doc(
      h2("1. Cấu trúc các vòng thi WebDesign"),
      p("Cuộc thi WebDesign là sự kiện học thuật trọng điểm của CLB MPC, thu hút hơn 200 thí sinh tham gia mỗi năm với 2 vòng thi chính: Vòng Sơ khảo và Vòng Chung kết."),
      h2("2. Yêu cầu kỹ thuật bắt buộc trong đề bài"),
      ul([
        "Giao diện tương thích đa thiết bị cả máy tính và điện thoại.",
        "Điểm hiệu năng tối thiểu 85 ở mục hiệu suất và khả năng tiếp cận.",
        "Triển khai trực tuyến và mã nguồn quản lý qua GitHub.",
      ]),
      h2("3. Quy trình nghiệm thu đề bài với cố vấn"),
      callout("warning", "Đề thi vòng Chung kết phải được Ban Chuyên môn làm thử độc lập bởi ít nhất 2 thành viên để đo lường chính xác quỹ thời gian làm bài."),
    ),
    quizQuestions: [],
  },
  {
    id: "itm_webdesign_judging",
    courseSlug: "cam-nang-su-kien",
    lessonSlug: "su-kien-webdesign",
    type: "CONTENT",
    title: "Chương 2: Tiêu chí chấm điểm và tổ chức đêm chung kết WebDesign",
    slug: "webdesign-cham-diem-chung-ket",
    summary:
      "Thang điểm 100 cho Ban Giám khảo, quy trình điều phối phòng thuyết trình và kịch bản kỹ thuật đêm trao giải.",
    orderIndex: 1,
    status: "PUBLISHED",
    isRequired: true,
    requirePrevious: null,
    requireScrollToBottom: true,
    passScorePercent: 0,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [
      {
        id: "att_wdj_1",
        type: "drive",
        title: "Bảng tính chấm điểm tự động đêm chung kết WebDesign",
        url: "https://docs.google.com/spreadsheets/d/mpc-webdesign-scoring-sheet",
      },
    ],
    content: doc(
      h2("1. Cơ cấu bảng điểm chung kết (Thang 100 điểm)"),
      ol([
        "Giao diện và trải nghiệm người dùng (30 điểm): Bố cục, hệ thống chữ, màu sắc và độ mượt mà.",
        "Kỹ thuật lập trình và tính năng (40 điểm): Hoàn thiện chức năng, mã nguồn sạch sẽ, tương thích thiết bị.",
        "Sáng tạo và giá trị thực tiễn (15 điểm): Điểm nhấn khác biệt giải quyết đúng bài toán.",
        "Kỹ năng thuyết trình và phản biện (15 điểm): Trình bày đúng 7 phút và trả lời sắc bén câu hỏi từ ban giám khảo.",
      ]),
      h2("2. Điều phối thời gian mỗi đội thi"),
      callout("info", "Bàn điều phối thời gian phải giơ bảng báo hiệu khi đội thi còn 2 phút, 1 phút và hết giờ để đảm bảo công bằng tuyệt đối giữa các đội."),
    ),
    quizQuestions: [],
  },
  {
    id: "itm_webdesign_quiz",
    courseSlug: "cam-nang-su-kien",
    lessonSlug: "su-kien-webdesign",
    type: "QUIZ",
    title: "Bài tập cuối chương: Nghiệp vụ tổ chức WebDesign",
    slug: "bai-tap-to-chuc-webdesign",
    summary:
      "Kiểm tra quy trình nghiệm thu đề bài, yêu cầu hiệu năng kỹ thuật và cơ cấu thang điểm vòng Chung kết WebDesign.",
    orderIndex: 2,
    status: "PUBLISHED",
    isRequired: true,
    requirePrevious: true,
    requireScrollToBottom: false,
    passScorePercent: 80,
    quizTitle: "Kiểm tra quy trình tổ chức WebDesign",
    quizDescription: "Đạt tối thiểu 80% để hoàn thành bài học Sự kiện WebDesign.",
    quizDurationMinutes: 10,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [],
    content: doc(
      callout("info", "Hoàn thành bài trắc nghiệm ngắn dưới đây để xác nhận bạn đã nắm vững quy trình ra đề và chấm điểm sự kiện WebDesign."),
    ),
    quizQuestions: [
      {
        id: "q_wd_1",
        questionText:
          "Trước khi công bố đề thi vòng Chung kết WebDesign, Ban Chuyên môn bắt buộc phải thực hiện bước kiểm tra nào?",
        type: "single",
        options: [
          { id: "wd_o1", text: "Đăng công khai đề thi lên Fanpage trước 1 tuần" },
          {
            id: "wd_o2",
            text: "Cho ít nhất 2 thành viên Ban Chuyên môn làm thử độc lập để căn chỉnh thời gian",
          },
          { id: "wd_o3", text: "Không cần kiểm tra trước" },
        ],
        correctOptionIds: ["wd_o2"],
        explanation:
          "Làm thử độc lập giúp phát hiện các điểm mơ hồ trong đề bài và đảm bảo độ khó vừa sức với thời gian quy định.",
      },
      {
        id: "q_wdj_1",
        questionText:
          "Trong thang điểm 100 của vòng Chung kết WebDesign, hạng mục Kỹ thuật lập trình và tính năng chiếm bao nhiêu điểm?",
        type: "single",
        options: [
          { id: "j1", text: "20 điểm" },
          { id: "j2", text: "40 điểm" },
          { id: "j3", text: "60 điểm" },
        ],
        correctOptionIds: ["j2"],
        explanation: "Kỹ thuật lập trình và tính năng chiếm trọng số lớn nhất là 40/100 điểm.",
      },
      {
        id: "q_wd_2",
        questionText:
          "Theo yêu cầu kỹ thuật bắt buộc trong đề bài WebDesign, điểm hiệu năng tối thiểu ở mục hiệu suất và khả năng tiếp cận là bao nhiêu?",
        type: "single",
        options: [
          { id: "wd2_1", text: "Tối thiểu 50 điểm" },
          { id: "wd2_2", text: "Tối thiểu 85 điểm" },
          { id: "wd2_3", text: "Không yêu cầu điểm hiệu năng" },
        ],
        correctOptionIds: ["wd2_2"],
        explanation:
          "Sản phẩm dự thi phải đạt điểm hiệu năng tối thiểu 85 ở mục hiệu suất và khả năng tiếp cận, đồng thời tương thích đa thiết bị.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // COURSE 2: cam-nang-su-kien → LESSON 2: tuyen-ctv
  // Tái sử dụng bài Tuyển CTV cũ + 1 Item QUIZ
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "itm_recruitment_playbook",
    courseSlug: "cam-nang-su-kien",
    lessonSlug: "tuyen-ctv",
    type: "CONTENT",
    title: "Chương 1: Kịch bản truyền thông và phỏng vấn tuyển thành viên",
    slug: "kich-ban-tuyen-thanh-vien",
    summary: "Quy trình 3 vòng tuyển cộng tác viên và bộ câu hỏi đánh giá thái độ.",
    orderIndex: 0,
    status: "PUBLISHED",
    isRequired: true,
    requirePrevious: null,
    requireScrollToBottom: true,
    passScorePercent: 0,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [
      {
        id: "att_rec_1",
        type: "drive",
        title: "Bộ câu hỏi phỏng vấn và phiếu đánh giá ứng viên MPC",
        url: "https://drive.google.com/drive/folders/mpc-recruitment-kit",
      },
    ],
    content: doc(
      h2("1. Tiêu chí tuyển chọn: Thái độ đi đầu"),
      p("MPC tìm kiếm những bạn sinh viên có tinh thần cầu thị, cam kết gắn bó lâu dài và sẵn sàng học hỏi. Kỹ năng chuyên môn có thể được đào tạo qua hệ thống hướng dẫn nội bộ."),
      h2("2. Quy tắc dành cho hội đồng phỏng vấn"),
      ul([
        "Luôn tạo không khí cởi mở, thân thiện để ứng viên thể hiện tốt nhất năng lực.",
        "Điền điểm và nhận xét chi tiết vào phiếu đánh giá ngay sau mỗi ca phỏng vấn.",
        "Gửi email thông báo kết quả đúng hẹn trong vòng 48 giờ sau ngày phỏng vấn cuối.",
      ]),
    ),
    quizQuestions: [],
  },
  {
    id: "itm_recruitment_quiz",
    courseSlug: "cam-nang-su-kien",
    lessonSlug: "tuyen-ctv",
    type: "QUIZ",
    title: "Bài tập cuối chương: Quy trình phỏng vấn & Tuyển chọn CTV",
    slug: "bai-tap-tuyen-ctv",
    summary:
      "Kiểm tra nguyên tắc đánh giá ứng viên và quy chuẩn phản hồi kết quả của hội đồng phỏng vấn CLB MPC.",
    orderIndex: 1,
    status: "PUBLISHED",
    isRequired: true,
    requirePrevious: true,
    requireScrollToBottom: false,
    passScorePercent: 75,
    quizTitle: "Kiểm tra nghiệp vụ Tuyển CTV",
    quizDescription: "Hoàn thành bài kiểm tra về tiêu chí và quy trình phỏng vấn Cộng tác viên mới.",
    quizDurationMinutes: 10,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [],
    content: doc(
      callout("info", "Trả lời các câu hỏi dưới đây để hoàn thành bài học Tuyển cộng tác viên."),
    ),
    quizQuestions: [
      {
        id: "q_rec_1",
        questionText: "Khi tuyển Cộng tác viên mới cho CLB MPC, yếu tố nào được ưu tiên hàng đầu?",
        type: "single",
        options: [
          { id: "r1", text: "Thái độ cầu thị, tinh thần trách nhiệm và sự cam kết gắn bó" },
          { id: "r2", text: "Đã có 5 năm kinh nghiệm đi làm thực tế" },
          { id: "r3", text: "Chỉ tuyển sinh viên năm cuối" },
        ],
        correctOptionIds: ["r1"],
        explanation:
          "Thái độ cầu thị và sự cam kết là nền tảng quan trọng nhất; chuyên môn sẽ được CLB đào tạo bài bản.",
      },
      {
        id: "q_rec_2",
        questionText:
          "Hội đồng phỏng vấn cần gửi email thông báo kết quả cho ứng viên trong vòng bao lâu sau ngày phỏng vấn cuối?",
        type: "single",
        options: [
          { id: "r2_1", text: "Trong vòng 48 giờ" },
          { id: "r2_2", text: "Sau 1 tháng" },
          { id: "r2_3", text: "Không cần gửi email thông báo" },
        ],
        correctOptionIds: ["r2_1"],
        explanation:
          "Gửi email thông báo kết quả đúng hẹn trong vòng 48 giờ thể hiện sự tôn trọng ứng viên và tác phong chuyên nghiệp của CLB.",
      },
      {
        id: "q_rec_3",
        questionText:
          "Thời điểm nào giám khảo cần điền điểm và nhận xét chi tiết vào phiếu đánh giá ứng viên?",
        type: "single",
        options: [
          { id: "r3_1", text: "Ngay sau mỗi ca phỏng vấn" },
          { id: "r3_2", text: "Đợi hết tuần mới ghi nhớ lại" },
          { id: "r3_3", text: "Chỉ chấm điểm cảm tính, không cần ghi nhận xét" },
        ],
        correctOptionIds: ["r3_1"],
        explanation:
          "Điền điểm và nhận xét ngay sau mỗi ca phỏng vấn giúp đánh giá chính xác, khách quan và công bằng giữa các ứng viên.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // COURSE 3: dao-tao-ky-nang (sequential = false) → LESSON 1: ban-truyen-thong
  // Tái sử dụng bài Truyền thông cũ + 1 Item QUIZ (ghi đè requirePrevious = true) + 1 Item DRAFT
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "itm_media_photography_guide",
    courseSlug: "dao-tao-ky-nang",
    lessonSlug: "ban-truyen-thong",
    type: "CONTENT",
    title: "Chương 1: Hướng dẫn chụp ảnh sự kiện, viết content và nhận diện thương hiệu MPC",
    slug: "cam-nang-chup-anh-content-mpc",
    summary:
      "Danh sách góc chụp bắt buộc khi đi sự kiện, công thức viết bài truyền thông thu hút và quy chuẩn lọc ảnh trong 24h.",
    orderIndex: 0,
    status: "PUBLISHED",
    isRequired: true,
    requirePrevious: null, // Kế thừa Course.sequential = false
    requireScrollToBottom: true,
    passScorePercent: 0,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [
      {
        id: "att_med_1",
        type: "figma",
        title: "Bộ nhận diện thương hiệu và logo chính thức MPC 2026",
        url: "https://www.figma.com/file/mpc-brand-guideline",
      },
      {
        id: "att_med_2",
        type: "youtube",
        title: "Video Training: Bố cục Chụp ảnh Sự kiện trong Hội trường thiếu sáng",
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
    ],
    content: doc(
      h2("1. Shot-list bắt buộc tại mọi sự kiện của CLB"),
      ol([
        "Ảnh toàn cảnh hội trường (Wide shot) thể hiện quy mô đông đảo người tham dự.",
        "Ảnh cận cảnh diễn giả / Ban Giám khảo đang chia sẻ (chú ý bắt khoảnh khắc tự nhiên, không bị nhắm mắt).",
        "Ảnh tương tác giữa thí sinh / khán giả đặt câu hỏi và thảo luận nhóm.",
        "Ảnh tập thể toàn bộ Ban Tổ Chức cùng khách mời tại khu vực Backdrop cuối chương trình.",
      ]),
      h2("2. Quy trình lọc ảnh và hậu kỳ 3 bước"),
      callout("success", "Chọn lọc ngay 10-15 bức ảnh đẹp nhất (Highlight Photos) gửi cho đội Content trong vòng 2 giờ sau sự kiện để kịp lên bài Recap nóng hổi!"),
    ),
    quizQuestions: [],
  },
  {
    id: "itm_media_quiz",
    courseSlug: "dao-tao-ky-nang",
    lessonSlug: "ban-truyen-thong",
    type: "QUIZ",
    title: "Bài tập cuối chương: Tiêu chuẩn hình ảnh & Truyền thông MPC",
    slug: "bai-tap-truyen-thong-mpc",
    summary:
      "Kiểm tra kiến thức về Shot-list sự kiện và quy trình bàn giao ảnh Highlight cho đội Content.",
    orderIndex: 1,
    status: "PUBLISHED",
    isRequired: true,
    requirePrevious: true, // Ghi đè Course.sequential = false: bắt buộc hoàn thành Chương 1 trước khi làm bài tập
    requireScrollToBottom: false,
    passScorePercent: 80,
    quizTitle: "Kiểm tra kỹ năng Ban Truyền thông",
    quizDescription: "Đạt tối thiểu 80% để hoàn thành bài tập kỹ năng truyền thông sự kiện.",
    quizDurationMinutes: 10,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [],
    content: doc(
      callout("info", "Mặc dù khóa Đào tạo kỹ năng cho phép học tự do (sequential = false), bài tập kiểm tra này đặt requirePrevious = true để yêu cầu bạn đọc xong Chương 1 trước khi làm bài."),
    ),
    quizQuestions: [
      {
        id: "q_med_1",
        questionText:
          "Sau khi sự kiện kết thúc, đội Photographer cần gửi bộ 10-15 ảnh Highlight cho đội Content trong khoảng thời gian nào để kịp đăng bài Recap?",
        type: "single",
        options: [
          { id: "m1", text: "Trong vòng 2 giờ sau khi sự kiện kết thúc" },
          { id: "m2", text: "Sau 1 tháng" },
          { id: "m3", text: "Cuối học kỳ" },
        ],
        correctOptionIds: ["m1"],
        explanation:
          "Bộ 10-15 ảnh Highlight cần được gửi trong vòng 2 giờ sau sự kiện để giữ độ nóng truyền thông cho bài Recap.",
      },
      {
        id: "q_med_2",
        questionText:
          "Đâu là các góc chụp nằm trong Shot-list bắt buộc tại mọi sự kiện của CLB MPC? (Chọn tất cả đáp án đúng)",
        type: "multiple",
        options: [
          { id: "ms1", text: "Ảnh toàn cảnh hội trường (Wide shot) thể hiện quy mô sự kiện" },
          { id: "ms2", text: "Ảnh cận cảnh diễn giả / Ban Giám khảo và ảnh tương tác của thí sinh" },
          { id: "ms3", text: "Ảnh tập thể Ban Tổ Chức cùng khách mời tại Backdrop cuối chương trình" },
        ],
        correctOptionIds: ["ms1", "ms2", "ms3"],
        explanation:
          "Cả 3 nhóm góc chụp trên đều nằm trong Shot-list bắt buộc để đảm bảo tư liệu truyền thông đầy đủ cho sự kiện.",
      },
      {
        id: "q_med_3",
        questionText:
          "Khi sử dụng logo của CLB MPC trên các ấn phẩm truyền thông, nguyên tắc nào sau đây cần tuân thủ tuyệt đối?",
        type: "single",
        options: [
          { id: "mb1", text: "Giữ đúng tỷ lệ và màu sắc thương hiệu theo Brand Guideline trên Figma" },
          { id: "mb2", text: "Tự ý kéo giãn chiều ngang hoặc chiều dọc logo cho vừa khung trống" },
          { id: "mb3", text: "Sử dụng ảnh chụp màn hình độ phân giải thấp bị vỡ nét" },
        ],
        correctOptionIds: ["mb1"],
        explanation:
          "Mọi ấn phẩm phải tuân thủ đúng tỷ lệ và màu sắc chuẩn trong bộ nhận diện thương hiệu MPC.",
      },
    ],
  },
  {
    id: "itm_media_video_draft",
    courseSlug: "dao-tao-ky-nang",
    lessonSlug: "ban-truyen-thong",
    type: "CONTENT",
    title: "Chương 2: Quy chuẩn dựng video Recap Reels & TikTok CLB (Bản nháp)",
    slug: "quy-chuan-video-recap-draft",
    summary:
      "Bản nháp hướng dẫn thông số xuất file 9:16, nhịp cắt video sự kiện và kho nhạc bản quyền của Ban Truyền thông.",
    orderIndex: 2,
    status: "DRAFT", // Để 1 Item DRAFT để demo theo yêu cầu
    isRequired: false,
    requirePrevious: null,
    requireScrollToBottom: true,
    passScorePercent: 0,
    createdAt: NOW,
    updatedAt: NOW,
    attachments: [],
    content: doc(
      callout("warning", "Tài liệu này đang ở trạng thái Bản nháp (DRAFT) và đang được Trưởng Ban Truyền thông hoàn thiện trước khi gửi duyệt xuất bản."),
      h2("1. Thông số kỹ thuật xuất video dọc (9:16)"),
      ul([
        "Độ phân giải: Full HD 1080x1920, tốc độ khung hình 60fps.",
        "Thời lượng khuyến nghị: 30 - 60 giây với 3 giây đầu (Hook) ấn tượng nhất của sự kiện.",
        "Luôn đính kèm Intro/Outro chuyển động chính thức của CLB MPC.",
      ]),
    ),
    quizQuestions: [],
  },
];

export const INITIAL_ITEMS: SeedItem[] = RAW_INITIAL_ITEMS.map((item) => {
  const content = withIds(item.content, item.id);
  const plainText = extractPlainText(content);
  const readingTime = estimateReadingTime(plainText, countBlocks(content));
  return {
    ...item,
    content,
    plainText,
    readingTime,
  };
});
