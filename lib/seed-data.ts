import {
  ArticleRecord,
  ArticleStatus,
  CategoryRecord,
  EditorBlock,
} from "@/types";

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

export function extractPlainTextFromBlocks(blocks: EditorBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === "divider") return "";
      if (b.type === "image") return b.props?.caption || "";
      if (b.type === "gallery") {
        return (b.props?.galleryImages || [])
          .map((img) => img.caption || img.alt || "")
          .join(" ");
      }
      if (b.type === "table") {
        const headers = (b.props?.tableData?.headers || []).join(" ");
        const rows = (b.props?.tableData?.rows || []).map((r) => r.join(" ")).join(" ");
        return `${headers} ${rows}`;
      }
      if (b.type === "comparison") {
        const comp = b.props?.comparisonData;
        if (!comp) return "";
        return `${comp.leftTitle} ${comp.leftPoints.join(" ")} ${comp.rightTitle} ${comp.rightPoints.join(" ")}`;
      }
      if (b.type === "video") {
        return b.content || b.props?.caption || "";
      }
      return b.content || "";
    })
    .filter(Boolean)
    .join("\n")
    .slice(0, 95000);
}

export function estimateReadingTime(plainText: string, blocksCount = 0): number {
  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  // Standard reading speed ~200 wpm plus visual inspection time for media blocks
  const minutes = Math.ceil(words / 200 + (blocksCount * 0.05));
  return Math.max(1, Math.min(300, minutes));
}

export interface ArticleTemplateDefinition {
  id: "event_playbook" | "skill_guide" | "club_rules";
  name: string;
  subtitle: string;
  defaultSummary: string;
  blocks: EditorBlock[];
}

export const ARTICLE_TEMPLATES: ArticleTemplateDefinition[] = [
  {
    id: "event_playbook",
    name: "Mẫu quy trình sự kiện",
    subtitle: "Dành cho điều phối sự kiện WebDesign, Tuyển CTV, Tech Talk",
    defaultSummary:
      "Tài liệu hướng dẫn tổng thể từ khâu lập kế hoạch, phân công nhân sự đến vận hành và tổng kết sự kiện của CLB MPC.",
    blocks: [
      {
        id: "tpl_ep_1",
        type: "heading_2",
        content: "1. Mục tiêu và mốc thời gian tổng thể",
      },
      {
        id: "tpl_ep_2",
        type: "callout",
        content:
          "Mục tiêu cốt lõi: Đảm bảo 100% thành viên nắm rõ mốc thời gian và đầu việc chịu trách nhiệm trước ngày diễn ra sự kiện ít nhất 14 ngày.",
        props: { variant: "info" },
      },
      {
        id: "tpl_ep_3",
        type: "bullet_list",
        content:
          "Tuần 1-2: Lên đề xuất, xin duyệt kinh phí Ban Chủ Nhiệm và chốt nhà tài trợ.\nTuần 3: Mở đơn đăng ký, truyền thông đa kênh và chốt danh sách thí sinh.\nTuần 4: Tổ chức vòng Chung kết, chấm điểm và trao giải.",
      },
      {
        id: "tpl_ep_4",
        type: "heading_2",
        content: "2. Phân công nhân sự các ban",
      },
      {
        id: "tpl_ep_5",
        type: "numbered_list",
        content:
          "Ban Chuyên môn: Xây dựng đề bài, chuẩn bị hệ thống chấm điểm và cố vấn kỹ thuật.\nBan Truyền thông: Thiết kế bộ nhận diện, viết bài phát động, chụp ảnh và quay phóng sự.\nBan Sự kiện: Đặt hội trường, chuẩn bị âm thanh, ánh sáng và quà tặng.\nBan Nhân sự: Điểm danh thành viên trực, đón tiếp khách mời và ban giám khảo.",
      },
      {
        id: "tpl_ep_6",
        type: "heading_2",
        content: "3. Danh sách kiểm tra trước, trong và sau sự kiện",
      },
      {
        id: "tpl_ep_7",
        type: "checklist",
        content: "Đã duyệt kịch bản MC và slide trình chiếu chính thức",
        props: { checked: true },
      },
      {
        id: "tpl_ep_8",
        type: "checklist",
        content: "Đã chạy thử âm thanh, máy chiếu và đường truyền mạng tại hội trường",
        props: { checked: false },
      },
      {
        id: "tpl_ep_9",
        type: "checklist",
        content: "Đã tổng hợp ảnh sự kiện lên Google Drive CLB trong vòng 24 giờ sau sự kiện",
        props: { checked: false },
      },
      {
        id: "tpl_ep_10",
        type: "heading_2",
        content: "4. Các sự cố thường gặp và phương án dự phòng",
      },
      {
        id: "tpl_ep_11",
        type: "callout",
        content:
          "Lưu ý dự phòng: Luôn chuẩn bị sẵn bản slide offline trên USB và bộ phát mạng 4G dự phòng cho bàn kỹ thuật.",
        props: { variant: "warning" },
      },
      {
        id: "tpl_ep_12",
        type: "heading_2",
        content: "5. Tài liệu mẫu và liên kết lưu trữ",
      },
      {
        id: "tpl_ep_13",
        type: "paragraph",
        content:
          "Vui lòng đính kèm link thư mục Google Drive chứa đề án, bảng phân công và bộ nhận diện sự kiện tại khung tài liệu đính kèm bên dưới.",
      },
    ],
  },
  {
    id: "skill_guide",
    name: "Mẫu hướng dẫn kỹ năng",
    subtitle: "Dành cho hướng dẫn chụp ảnh, thiết kế, viết bài và kỹ thuật",
    defaultSummary:
      "Cẩm nang tiêu chuẩn chất lượng, công cụ cần chuẩn bị và hướng dẫn thực hành từng bước kèm ví dụ đúng và sai.",
    blocks: [
      {
        id: "tpl_sg_1",
        type: "heading_2",
        content: "1. Tiêu chuẩn chất lượng của CLB MPC",
      },
      {
        id: "tpl_sg_2",
        type: "paragraph",
        content:
          "Mọi sản phẩm đầu ra của CLB cần tuân thủ đúng màu sắc thương hiệu, bố cục rõ ràng và truyền tải tinh thần học thuật và sáng tạo của MPC.",
      },
      {
        id: "tpl_sg_3",
        type: "heading_2",
        content: "2. Công cụ và tài nguyên cần chuẩn bị",
      },
      {
        id: "tpl_sg_4",
        type: "bullet_list",
        content:
          "Bộ logo và phông chữ chuẩn của CLB MPC.\nTài khoản hoặc phần mềm chuyên dụng (Figma, Lightroom, VS Code, Git).\nKho lưu trữ preset và template mẫu trên Google Drive nội bộ.",
      },
      {
        id: "tpl_sg_5",
        type: "heading_2",
        content: "3. Hướng dẫn thực hiện từng bước",
      },
      {
        id: "tpl_sg_6",
        type: "numbered_list",
        content:
          "Bước 1: Tiếp nhận yêu cầu và xác định thông điệp trọng tâm.\nBước 2: Phác thảo bố cục và kiểm tra chéo với tiêu chuẩn CLB.\nBước 3: Hoàn thiện sản phẩm và gửi Trưởng ban duyệt trước deadline tối thiểu 12 giờ.",
      },
      {
        id: "tpl_sg_7",
        type: "heading_2",
        content: "4. So sánh thực tế: Nên làm và Tránh làm",
      },
      {
        id: "tpl_sg_8",
        type: "callout",
        content:
          "Nên làm: Đặt tên file theo chuẩn năm tháng ngày và tên sự kiện để dễ dàng tra cứu lại về sau.",
        props: { variant: "success" },
      },
      {
        id: "tpl_sg_9",
        type: "callout",
        content:
          "Tránh làm: Tuyệt đối không kéo giãn làm méo tỷ lệ logo CLB hoặc sử dụng ảnh bị vỡ nét khi đăng bài truyền thông.",
        props: { variant: "danger" },
      },
    ],
  },
  {
    id: "club_rules",
    name: "Mẫu nội quy và quy định CLB",
    subtitle: "Dành cho Ban Chủ Nhiệm và Ban Nhân sự ban hành quy chế",
    defaultSummary:
      "Quy định chính thức áp dụng cho toàn bộ thành viên và cộng tác viên thuộc Câu lạc bộ Lập trình Học thuật (MPC).",
    blocks: [
      {
        id: "tpl_cr_1",
        type: "heading_2",
        content: "1. Phạm vi và đối tượng áp dụng",
      },
      {
        id: "tpl_cr_2",
        type: "paragraph",
        content:
          "Quy định này áp dụng bắt buộc đối với toàn thể Ban Chủ Nhiệm, Trưởng ban, Thành viên chính thức và Cộng tác viên đang hoạt động tại CLB MPC.",
      },
      {
        id: "tpl_cr_3",
        type: "heading_2",
        content: "2. Quy định chi tiết",
      },
      {
        id: "tpl_cr_4",
        type: "numbered_list",
        content:
          "Tác phong làm việc: Đúng giờ trong mọi cuộc họp định kỳ và ca trực sự kiện.\nGiao tiếp nội bộ: Phản hồi thông báo công việc trên kênh chung trong vòng tối đa 12 giờ.\nBảo mật tài nguyên: Không tự ý chia sẻ tài liệu nội bộ, source code hoặc danh sách nhân sự ra bên ngoài CLB.",
      },
      {
        id: "tpl_cr_5",
        type: "heading_2",
        content: "3. Quyền lợi, khen thưởng và kỷ luật",
      },
      {
        id: "tpl_cr_6",
        type: "callout",
        content:
          "Thành viên hoàn thành xuất sắc nhiệm vụ học kỳ sẽ được vinh danh và cấp giấy chứng nhận hoạt động từ CLB và Khoa.",
        props: { variant: "info" },
      },
    ],
  },
];

const NOW = "2026-10-24T08:00:00.000Z";

export const INITIAL_CATEGORIES: CategoryRecord[] = [
  {
    id: "cat_rules",
    name: "1. Nội quy và văn hóa CLB",
    slug: "noi-quy-clb",
    description: "Quy tắc ứng xử, quy trình họp định kỳ và cơ chế đánh giá thành viên MPC",
    icon: "ShieldCheck",
    orderIndex: 1,
    isPublished: true,
    depth: 1,
    parentId: "",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cat_events",
    name: "2. Cẩm nang tổ chức sự kiện",
    slug: "su-kien-clb",
    description: "Quy trình chuẩn tổ chức các sự kiện học thuật và hoạt động lớn của CLB",
    icon: "CalendarRange",
    orderIndex: 2,
    isPublished: true,
    depth: 1,
    parentId: "",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cat_webdesign",
    name: "2.1 Sự kiện WebDesign",
    slug: "su-kien-webdesign",
    description: "Tài liệu tổ chức cuộc thi thiết kế và lập trình giao diện WebDesign thường niên",
    icon: "Code2",
    orderIndex: 1,
    isPublished: true,
    depth: 2,
    parentId: "cat_events",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cat_recruitment",
    name: "2.2 Tuyển cộng tác viên",
    slug: "tuyen-ctv",
    description: "Kịch bản truyền thông, chấm đơn và phỏng vấn tuyển thành viên mới",
    icon: "Users",
    orderIndex: 2,
    isPublished: true,
    depth: 2,
    parentId: "cat_events",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cat_skills",
    name: "3. Đào tạo kỹ năng các ban",
    slug: "dao-tao-ky-nang",
    description: "Tài liệu hướng dẫn chuyên môn lập trình, truyền thông, chụp ảnh và thiết kế",
    icon: "GraduationCap",
    orderIndex: 3,
    isPublished: true,
    depth: 1,
    parentId: "",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cat_tech_dept",
    name: "3.1 Ban Chuyên môn",
    slug: "ban-chuyen-mon",
    description: "Tiêu chuẩn Git Flow, kiến trúc dự án và duyệt code nội bộ",
    icon: "Terminal",
    orderIndex: 1,
    isPublished: true,
    depth: 2,
    parentId: "cat_skills",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cat_media_dept",
    name: "3.2 Ban Truyền thông và Sự kiện",
    slug: "ban-truyen-thong",
    description: "Cẩm nang chụp ảnh sự kiện, viết bài fanpage và nhận diện thương hiệu MPC",
    icon: "Camera",
    orderIndex: 2,
    isPublished: true,
    depth: 2,
    parentId: "cat_skills",
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const RAW_INITIAL_ARTICLES: Omit<ArticleRecord, "plainText" | "readingTime" | "status">[] = [
  {
    id: "art_code_of_conduct",
    title: "Quy tắc ứng xử và văn hóa làm việc tại MPC",
    slug: "quy-tac-ung-xu-mpc",
    summary:
      "Nền tảng văn hóa Tôn trọng - Chủ động - Chia sẻ, quy định giao tiếp trên kênh chung và bảo mật hệ sinh thái công nghệ.",
    categoryId: "cat_rules",
    orderIndex: 1,
    isPublished: true,
    audience: "FREE",
    visibility: "PUBLIC",
    requirePrevious: false,
    requireScrollToBottom: true,
    passScorePercent: 80,
    authorId: "system_bcn",
    authorName: "Ban Chủ Nhiệm MPC",
    updaterId: "system_bcn",
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
    content: [
      {
        id: "b_coc_1",
        type: "callout",
        content:
          "Chào mừng bạn đến với hệ thống Sổ tay nội bộ MPC Handbook! Đây là bài đọc mở đầu bắt buộc trong lộ trình hội nhập dành cho mọi thành viên CLB.",
        props: { variant: "info" },
      },
      {
        id: "b_coc_2",
        type: "heading_2",
        content: "1. Ba giá trị cốt lõi của Câu lạc bộ Lập trình Học thuật",
      },
      {
        id: "b_coc_3",
        type: "paragraph",
        content:
          "Từ những ngày đầu thành lập, MPC luôn duy trì môi trường học thuật mở, nơi các thành viên từ Ban Chuyên môn, Ban Truyền thông, Ban Sự kiện và Ban Nhân sự cùng nhau phát triển kỹ năng thực chiến.",
      },
      {
        id: "b_coc_4",
        type: "numbered_list",
        content:
          "**Chủ động học hỏi:** Tự giác nghiên cứu tài liệu trước khi đặt câu hỏi và sẵn sàng nhận nhiệm vụ mới.\n**Tinh thần đồng đội:** Không để đồng đội bị quá tải; báo cáo sớm cho Trưởng ban ít nhất 24 giờ nếu gặp sự cố cá nhân.\n**Chia sẻ tri thức:** Mọi sự kiện và dự án sau khi kết thúc đều phải được đúc kết thành tài liệu trên [Cổng tài liệu MPC](https://docs.mpclub.dev).",
      },
      {
        id: "b_coc_comp",
        type: "comparison",
        content: "Khung so sánh văn hóa làm việc và phối hợp tại MPC",
        props: {
          comparisonData: {
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
          },
        },
      },
      {
        id: "b_coc_5",
        type: "heading_2",
        content: "2. Quy chuẩn giao tiếp và phản hồi công việc",
      },
      {
        id: "b_coc_table",
        type: "table",
        content: "Bảng quy định thời hạn phản hồi theo kênh liên lạc",
        props: {
          tableData: {
            headers: ["Kênh liên lạc", "Mục đích sử dụng", "Thời hạn phản hồi tối đa", "Ghi chú"],
            rows: [
              ["Discord Server", "Thảo luận chuyên môn, họp ban và điều phối dự án", "Trong vòng 12 giờ", "Cần gắn thẻ đúng vai trò"],
              ["Zalo Thông báo", "Thông báo khẩn cấp từ Ban Chủ Nhiệm", "Trong vòng 6 giờ", "Thả biểu cảm xác nhận đã đọc"],
              ["Email @mpclub.dev", "Biên bản họp chính thức và đối tác ngoài", "Trong vòng 24 giờ", "Kiểm tra hòm thư định kỳ"],
              ["GitHub Pull Request", "Kiểm duyệt mã nguồn và đóng góp tài liệu", "Trong vòng 48 giờ", "Ít nhất 1 duyệt viên chấp thuận"],
            ],
          },
        },
      },
      {
        id: "b_coc_7",
        type: "heading_3",
        content: "2.1 Quy tắc đặt tên nhánh và tài liệu nội bộ",
      },
      {
        id: "b_coc_8",
        type: "code",
        content:
          "# Chuẩn đặt tên thư mục Google Drive sự kiện:\n[YYYY-MM]_[Tên-Sự-Kiện]/[01_Proposal | 02_Design | 03_Media | 04_Report]\n\n# Chuẩn đặt tên nhánh Git trong dự án .mpclub.dev:\nfeat/mpc-handbook-quiz-engine\nfix/sso-token-refresh",
        props: { language: "bash" },
      },
      {
        id: "b_coc_gallery",
        type: "gallery",
        content: "Không gian học thuật và hoạt động tiêu biểu của MPC",
        props: {
          galleryImages: [
            {
              id: "img_g1",
              url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80",
              caption: "Buổi sinh hoạt chuyên đề công nghệ tại phòng lab",
            },
            {
              id: "img_g2",
              url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
              caption: "Đội ngũ ban tổ chức phối hợp chuẩn bị sự kiện",
            },
            {
              id: "img_g3",
              url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
              caption: "Thuyết trình đề án và phản biện kỹ thuật",
            },
          ],
        },
      },
      {
        id: "b_coc_9",
        type: "heading_2",
        content: "3. Bảo mật tài nguyên và bản quyền CLB",
      },
      {
        id: "b_coc_10",
        type: "callout",
        content:
          "Tuyệt đối không tự ý công khai danh sách thông tin cá nhân thành viên, đề thi chưa công bố hoặc khóa bí mật (.env, API Key) lên các kho lưu trữ công khai.",
        props: { variant: "warning" },
      },
    ],
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
    ],
  },
  {
    id: "art_meeting_process",
    title: "Quy trình họp định kỳ và viết biên bản",
    slug: "quy-trinh-hop-dinh-ky",
    summary:
      "Hướng dẫn chuẩn bị Agenda trước buổi họp 24h, điều phối thảo luận hiệu quả và mẫu biên bản họp chuẩn MPC.",
    categoryId: "cat_rules",
    orderIndex: 2,
    isPublished: true,
    requirePrevious: true,
    requireScrollToBottom: true,
    passScorePercent: 80,
    authorId: "system_bcn",
    authorName: "Ban Chủ Nhiệm MPC",
    updaterId: "system_bcn",
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
    content: [
      {
        id: "b_meet_1",
        type: "heading_2",
        content: "1. Trước buổi họp (24 giờ trước giờ G)",
      },
      {
        id: "b_meet_2",
        type: "paragraph",
        content:
          "Mọi buổi họp toàn CLB hoặc họp Ban chỉ được phép diễn ra khi đã có Agenda (khung chương trình họp) gửi trước tối thiểu 24 giờ.",
      },
      {
        id: "b_meet_3",
        type: "checklist",
        content: "Chốt mục tiêu cuộc họp, thời lượng dự kiến và danh sách người tham dự",
        props: { checked: true },
      },
      {
        id: "b_meet_4",
        type: "checklist",
        content: "Phân công thư ký ghi biên bản trước khi bắt đầu",
        props: { checked: true },
      },
      {
        id: "b_meet_5",
        type: "heading_2",
        content: "2. Trong buổi họp: Nguyên tắc 50/10",
      },
      {
        id: "b_meet_6",
        type: "numbered_list",
        content:
          "10 phút đầu: Điểm danh nhanh và rà soát tiến độ các đầu việc từ buổi họp trước.\n40 phút giữa: Thảo luận tập trung vào các vấn đề trong Agenda, tránh lan man.\n10 phút cuối: Chốt các đầu việc cần làm (ai làm việc gì, hạn chót ngày nào, kết quả đầu ra là gì).",
      },
      {
        id: "b_meet_7",
        type: "heading_2",
        content: "3. Sau buổi họp: Công bố biên bản trong 12 giờ",
      },
      {
        id: "b_meet_8",
        type: "callout",
        content:
          "Thư ký cuộc họp cần hoàn thiện biên bản họp và đăng tải link lên kênh thông báo trong vòng 12 giờ sau khi kết thúc để các thành viên vắng mặt có phép nắm bắt đầy đủ.",
        props: { variant: "success" },
      },
    ],
    quizQuestions: [
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
  {
    id: "art_reward_discipline",
    title: "Cơ chế đánh giá, khen thưởng và kỷ luật",
    slug: "ky-luat-va-khen-thuong",
    summary:
      "Hệ thống tính điểm đóng góp học kỳ (MPC Point), tiêu chí xét thưởng và quy định xử lý vi phạm.",
    categoryId: "cat_rules",
    orderIndex: 3,
    isPublished: true,
    requirePrevious: true,
    requireScrollToBottom: true,
    passScorePercent: 0,
    authorId: "system_bcn",
    authorName: "Ban Chủ Nhiệm MPC",
    updaterId: "system_bcn",
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
    content: [
      {
        id: "b_rew_1",
        type: "heading_2",
        content: "1. Hệ thống điểm hoạt động MPC Point",
      },
      {
        id: "b_rew_2",
        type: "paragraph",
        content:
          "Mỗi thành viên bắt đầu học kỳ với 100 điểm cơ sở. Điểm được cộng thêm khi tham gia ban tổ chức sự kiện, viết bài chia sẻ kỹ thuật hoặc hỗ trợ đào tạo nội bộ.",
      },
      {
        id: "b_rew_3",
        type: "heading_2",
        content: "2. Danh hiệu khen thưởng cuối kỳ",
      },
      {
        id: "b_rew_4",
        type: "bullet_list",
        content:
          "Thành viên xuất sắc học kỳ: Top 5 thành viên có điểm đóng góp cao nhất toàn CLB.\nThành viên tích cực: Thành viên đạt từ 130 điểm trở lên và hoàn thành 100% lộ trình Sổ tay MPC.\nGiấy chứng nhận từ Ban Chủ Nhiệm và Khoa xác nhận tham gia công tác tổ chức sự kiện học thuật.",
      },
      {
        id: "b_rew_5",
        type: "heading_2",
        content: "3. Các mức nhắc nhở và xử lý vi phạm",
      },
      {
        id: "b_rew_6",
        type: "callout",
        content:
          "Bài viết này không yêu cầu làm bài tập trắc nghiệm. Bạn chỉ cần đọc kỹ và cuộn tới cuối bài viết để hoàn thành trọn vẹn chương Nội quy CLB!",
        props: { variant: "info" },
      },
    ],
    quizQuestions: [],
  },
  {
    id: "art_webdesign_prompt",
    title: "Quy trình lên đề bài và thể lệ cuộc thi WebDesign",
    slug: "webdesign-len-de-bai",
    summary:
      "Cách xây dựng chủ đề cuộc thi, bộ tiêu chí kỹ thuật và quy trình bảo mật đề thi cho sự kiện WebDesign.",
    categoryId: "cat_webdesign",
    orderIndex: 1,
    isPublished: true,
    audience: "FREE",
    visibility: "PUBLIC",
    requirePrevious: false,
    requireScrollToBottom: true,
    passScorePercent: 80,
    authorId: "system_bcn",
    authorName: "Trưởng Ban Chuyên Môn",
    updaterId: "system_bcn",
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
    content: [
      {
        id: "b_wd_1",
        type: "heading_2",
        content: "1. Cấu trúc các vòng thi WebDesign",
      },
      {
        id: "b_wd_2",
        type: "paragraph",
        content:
          "Cuộc thi WebDesign là sự kiện học thuật trọng điểm của CLB MPC, thu hút hơn 200 thí sinh tham gia mỗi năm với 2 vòng thi chính: Vòng Sơ khảo và Vòng Chung kết.",
      },
      {
        id: "b_wd_3",
        type: "heading_2",
        content: "2. Yêu cầu kỹ thuật bắt buộc trong đề bài",
      },
      {
        id: "b_wd_4",
        type: "bullet_list",
        content:
          "Giao diện tương thích đa thiết bị cả máy tính và điện thoại.\nĐiểm hiệu năng tối thiểu 85 ở mục hiệu suất và khả năng tiếp cận.\nTriển khai trực tuyến và mã nguồn quản lý qua GitHub.",
      },
      {
        id: "b_wd_5",
        type: "heading_2",
        content: "3. Quy trình nghiệm thu đề bài với cố vấn",
      },
      {
        id: "b_wd_6",
        type: "callout",
        content:
          "Đề thi vòng Chung kết phải được Ban Chuyên môn làm thử độc lập bởi ít nhất 2 thành viên để đo lường chính xác quỹ thời gian làm bài.",
        props: { variant: "warning" },
      },
    ],
    quizQuestions: [
      {
        id: "q_wd_1",
        questionText:
          "Trước khi công bố đề thi vòng Chung kết WebDesign, Ban Chuyên môn bắt buộc phải thực hiện bước kiểm tra nào?",
        type: "single",
        options: [
          { id: "wd_o1", text: "Đăng công khai đề thi lên Fanpage trước 1 tuần" },
          { id: "wd_o2", text: "Cho ít nhất 2 thành viên Ban Chuyên môn làm thử độc lập để căn chỉnh thời gian" },
          { id: "wd_o3", text: "Không cần kiểm tra trước" },
        ],
        correctOptionIds: ["wd_o2"],
        explanation:
          "Làm thử độc lập giúp phát hiện các điểm mơ hồ trong đề bài và đảm bảo độ khó vừa sức với thời gian quy định.",
      },
    ],
  },
  {
    id: "art_webdesign_judging",
    title: "Tiêu chí chấm điểm và tổ chức đêm chung kết WebDesign",
    slug: "webdesign-cham-diem-chung-ket",
    summary:
      "Thang điểm 100 cho Ban Giám khảo, quy trình điều phối phòng thuyết trình và kịch bản kỹ thuật đêm trao giải.",
    categoryId: "cat_webdesign",
    orderIndex: 2,
    isPublished: true,
    requirePrevious: true,
    requireScrollToBottom: true,
    passScorePercent: 80,
    authorId: "system_bcn",
    authorName: "Trưởng Ban Sự Kiện",
    updaterId: "system_bcn",
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
    content: [
      {
        id: "b_wdj_1",
        type: "heading_2",
        content: "1. Cơ cấu bảng điểm chung kết (Thang 100 điểm)",
      },
      {
        id: "b_wdj_2",
        type: "numbered_list",
        content:
          "Giao diện và trải nghiệm người dùng (30 điểm): Bố cục, hệ thống chữ, màu sắc và độ mượt mà.\nKỹ thuật lập trình và tính năng (40 điểm): Hoàn thiện chức năng, mã nguồn sạch sẽ, tương thích thiết bị.\nSáng tạo và giá trị thực tiễn (15 điểm): Điểm nhấn khác biệt giải quyết đúng bài toán.\nKỹ năng thuyết trình và phản biện (15 điểm): Trình bày đúng 7 phút và trả lời sắc bén câu hỏi từ ban giám khảo.",
      },
      {
        id: "b_wdj_3",
        type: "heading_2",
        content: "2. Điều phối thời gian mỗi đội thi",
      },
      {
        id: "b_wdj_4",
        type: "callout",
        content:
          "Bàn điều phối thời gian phải giơ bảng báo hiệu khi đội thi còn 2 phút, 1 phút và hết giờ để đảm bảo công bằng tuyệt đối giữa các đội.",
        props: { variant: "info" },
      },
    ],
    quizQuestions: [
      {
        id: "q_wdj_1",
        questionText: "Trong thang điểm 100 của vòng Chung kết WebDesign, hạng mục Kỹ thuật lập trình và tính năng chiếm bao nhiêu điểm?",
        type: "single",
        options: [
          { id: "j1", text: "20 điểm" },
          { id: "j2", text: "40 điểm" },
          { id: "j3", text: "60 điểm" },
        ],
        correctOptionIds: ["j2"],
        explanation: "Kỹ thuật lập trình và tính năng chiếm trọng số lớn nhất là 40/100 điểm.",
      },
    ],
  },
  {
    id: "art_recruitment_playbook",
    title: "Kịch bản truyền thông và phỏng vấn tuyển thành viên",
    slug: "kich-ban-tuyen-thanh-vien",
    summary:
      "Quy trình 3 vòng tuyển cộng tác viên và bộ câu hỏi đánh giá thái độ.",
    categoryId: "cat_recruitment",
    orderIndex: 1,
    isPublished: true,
    requirePrevious: false,
    requireScrollToBottom: true,
    passScorePercent: 75,
    authorId: "system_bcn",
    authorName: "Trưởng Ban Nhân Sự",
    updaterId: "system_bcn",
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
    content: [
      {
        id: "b_rec_1",
        type: "heading_2",
        content: "1. Tiêu chí tuyển chọn: Thái độ đi đầu",
      },
      {
        id: "b_rec_2",
        type: "paragraph",
        content:
          "MPC tìm kiếm những bạn sinh viên có tinh thần cầu thị, cam kết gắn bó lâu dài và sẵn sàng học hỏi. Kỹ năng chuyên môn có thể được đào tạo qua hệ thống hướng dẫn nội bộ.",
      },
      {
        id: "b_rec_3",
        type: "heading_2",
        content: "2. Quy tắc dành cho hội đồng phỏng vấn",
      },
      {
        id: "b_rec_4",
        type: "bullet_list",
        content:
          "Luôn tạo không khí cởi mở, thân thiện để ứng viên thể hiện tốt nhất năng lực.\nĐiền điểm và nhận xét chi tiết vào phiếu đánh giá ngay sau mỗi ca phỏng vấn.\nGửi email thông báo kết quả đúng hẹn trong vòng 48 giờ sau ngày phỏng vấn cuối.",
      },
    ],
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
    ],
  },
  {
    id: "art_media_photography_guide",
    title: "Hướng dẫn chụp ảnh sự kiện, viết content và nhận diện thương hiệu MPC",
    slug: "cam-nang-chup-anh-content-mpc",
    summary:
      "Danh sách góc chụp bắt buộc khi đi sự kiện, công thức viết bài truyền thông thu hút và quy chuẩn lọc ảnh trong 24h.",
    categoryId: "cat_media_dept",
    orderIndex: 1,
    isPublished: true,
    audience: "FREE",
    visibility: "PUBLIC",
    requirePrevious: false,
    requireScrollToBottom: true,
    passScorePercent: 80,
    authorId: "system_bcn",
    authorName: "Trưởng Ban Truyền Thông",
    updaterId: "system_bcn",
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
    content: [
      {
        id: "b_med_1",
        type: "heading_2",
        content: "1. Shot-list bắt buộc tại mọi sự kiện của CLB",
      },
      {
        id: "b_med_2",
        type: "numbered_list",
        content:
          "Ảnh toàn cảnh hội trường (Wide shot) thể hiện quy mô đông đảo người tham dự.\nẢnh cận cảnh diễn giả / Ban Giám khảo đang chia sẻ (chú ý bắt khoảnh khắc tự nhiên, không bị nhắm mắt).\nẢnh tương tác giữa thí sinh / khán giả đặt câu hỏi và thảo luận nhóm.\nẢnh tập thể toàn bộ Ban Tổ Chức cùng khách mời tại khu vực Backdrop cuối chương trình.",
      },
      {
        id: "b_med_3",
        type: "heading_2",
        content: "2. Quy trình lọc ảnh và hậu kỳ 3 bước",
      },
      {
        id: "b_med_4",
        type: "callout",
        content:
          "Chọn lọc ngay 10-15 bức ảnh đẹp nhất (Highlight Photos) gửi cho đội Content trong vòng 2 giờ sau sự kiện để kịp lên bài Recap nóng hổi!",
        props: { variant: "success" },
      },
    ],
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
    ],
  },
];

export const INITIAL_ARTICLES: ArticleRecord[] = RAW_INITIAL_ARTICLES.map((art) => {
  const plainText = extractPlainTextFromBlocks(art.content);
  const readingTime = estimateReadingTime(plainText);
  return {
    ...art,
    status: (art.isPublished ? "PUBLISHED" : "DRAFT") as ArticleStatus,
    visibility: art.visibility || "PUBLIC",
    audience: art.audience || "INTERNAL",
    plainText,
    readingTime,
  };
});
