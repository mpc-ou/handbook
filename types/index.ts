export type Role = "ADMIN" | "EDITOR" | "MEMBER";

export type ContentStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED";

export interface CommentRecord {
  id: string;
  content: string;
  itemId: string;
  userId: string;
  userFullName: string;
  userAvatarUrl?: string;
  userDepartment?: string;
  userRole: Role;
  parentId?: string | null;
  replies?: CommentRecord[];
  createdAt: string;
  updatedAt: string;
}

export type AttachmentType = "youtube" | "drive" | "figma" | "github" | "external";

export interface ItemAttachment {
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

export type QuizQuestionType =
  | "single"
  | "multiple"
  | "fill_blank"
  | "essay"
  | "scale"
  | "file_upload"
  | "code_submission";

export interface QuizQuestion {
  id: string;
  questionText: string;
  type: QuizQuestionType;
  options: QuizOption[];
  correctOptionIds: string[];
  correctTextAnswer?: string;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  fileAcceptedTypes?: string;
  attachmentType?: "image" | "youtube";
  attachmentUrl?: string;
  attachmentCaption?: string;
  explanation?: string;
  points?: number;
  sampleCode?: string;
}

export interface ClientQuizQuestion {
  id: string;
  questionText: string;
  type: QuizQuestionType;
  options: QuizOption[];
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  fileAcceptedTypes?: string;
  attachmentType?: "image" | "youtube";
  attachmentUrl?: string;
  attachmentCaption?: string;
  sampleCode?: string;
}

export type BlockType =
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "paragraph"
  | "bullet_list"
  | "numbered_list"
  | "checklist"
  | "code"
  | "callout"
  | "quote"
  | "divider"
  | "image"
  | "gallery"
  | "video"
  | "table"
  | "comparison";

export interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  alt?: string;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ComparisonData {
  leftTitle: string;
  leftPoints: string[];
  rightTitle: string;
  rightPoints: string[];
}

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
  props?: {
    align?: "left" | "center" | "right" | "justify";
    language?: string;
    checked?: boolean;
    variant?: "info" | "warning" | "success" | "danger";
    imageUrl?: string;
    caption?: string;
    videoUrl?: string;
    videoProvider?: "youtube" | "direct";
    galleryImages?: GalleryImage[];
    tableData?: TableData;
    comparisonData?: ComparisonData;
  };
}

export interface UserProfile {
  uid: string;
  ssoId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  department: string;
  managedGroups?: string[];
  role: Role;
  noPassword?: boolean;
  managedCourseIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentRecord {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Danh mục phẳng (tag), gắn nhiều-nhiều với Course. */
export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type ContentAudience = "FREE" | "INTERNAL";
export type ContentVisibility = "PUBLIC" | "UNPUBLIC";
export type ItemType = "CONTENT" | "QUIZ" | "ASSIGNMENT";

/** Khóa học. Có ảnh bìa, gắn 1+ Category. */
export interface CourseRecord {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverImage?: string; // Cloudinary URL | "preset:<id>"
  status: ContentStatus;
  orderIndex: number;
  sequential: boolean; // true = học theo thứ tự
  visibility: ContentVisibility;
  audience: ContentAudience;
  allowedGroups: string[];
  categoryIds: string[];
  authorId: string;
  authorName: string;
  updaterId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Bài học trong khóa. Có ảnh bìa. */
export interface LessonRecord {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  summary: string;
  coverImage?: string;
  orderIndex: number;
  isPublished: boolean;
  requirePrevious: boolean | null; // null = theo Course.sequential
  createdAt: string;
  updatedAt: string;
}

/** Chương / bài tập trong bài học. KHÔNG có ảnh bìa. */
export interface ItemRecord {
  id: string;
  lessonId: string;
  type: ItemType;
  title: string;
  slug: string;
  summary: string;
  content: EditorBlock[];
  plainText: string;
  readingTime: number;
  attachments: ItemAttachment[];
  orderIndex: number;
  status: ContentStatus;
  isRequired: boolean;
  requirePrevious: boolean | null; // null = kế thừa Lesson/Course
  requireScrollToBottom: boolean;
  passScorePercent: number; // 0 = không yêu cầu quiz, 1..100 = % bắt buộc
  quizDurationMinutes?: number;
  quizMaxAttempts?: number;
  quizIsExam?: boolean;
  quizQuestions: QuizQuestion[];
  likesCount: number;
  likedUserIds: string[];
  isLiked?: boolean;
  viewsCount: number;
  authorId: string;
  authorName: string;
  updaterId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StandaloneQuizRecord {
  id: string;
  title: string;
  description?: string;
  itemId?: string;
  itemTitle?: string;
  durationMinutes?: number;
  passScorePercent: number;
  maxAttempts?: number;
  isExam: boolean;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface UserProgressRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  itemId: string;
  hasScrolledBottom: boolean;
  highestQuizScore: number;
  isCompleted: boolean;
  completedAt: string;
  lastAccessedAt: string;
}

export interface QuizAttemptRecord {
  id: string;
  userId: string;
  userFullName?: string;
  userEmail?: string;
  userAvatarUrl?: string;
  userDepartment?: string;
  quizId?: string;
  itemId: string;
  itemTitle?: string;
  scorePercent: number;
  isPassed: boolean;
  timeSpentSec?: number;
  status?: "COMPLETED" | "PENDING_REVIEW" | "GRADED";
  answers?: Record<string, any>;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  createdAt: string;
}

export interface ItemAccessResult {
  allowed: boolean;
  reason: "NOT_FOUND" | "PREVIOUS_INCOMPLETE" | null;
  blockingItem: {
    id: string;
    title: string;
    slug: string;
    lessonId: string;
  } | null;
}

export interface ProgressSummary {
  completed: number;
  total: number; // chỉ tính Item PUBLISHED & isRequired
  percent: number; // 0..100
}

export interface QuizGradeResponse {
  scorePercent: number;
  requiredScore: number;
  isPassed: boolean;
  isCompleted: boolean;
  requiresReview?: boolean;
  status?: "COMPLETED" | "PENDING_REVIEW" | "GRADED";
  correctCount: number;
  totalQuestions: number;
  feedback: Record<
    string,
    {
      isCorrect: boolean;
      explanation?: string;
      correctOptionIds: string[];
    }
  >;
}

export type NotificationType =
  | "COMMENT"
  | "REPLY"
  | "MENTION"
  | "COURSE_COMPLETED"
  | "CERTIFICATE_READY"
  | "ASSIGNMENT_SUBMITTED"
  | "ASSIGNMENT_GRADED";

/** Snapshot lúc tạo thông báo (tên, tiêu đề, đường dẫn); nội dung hiển thị được dịch ở client theo `type`. */
export interface NotificationData {
  actorId?: string;
  actorName?: string;
  actorAvatarUrl?: string | null;
  courseId?: string;
  courseTitle?: string;
  itemTitle?: string;
  /** Trích đoạn bình luận (đã thay thẻ @mention bằng tên). */
  excerpt?: string;
  score?: number;
  /** Đường dẫn nội bộ để mở khi bấm vào thông báo. */
  href: string;
}

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  data: NotificationData;
  read: boolean;
  createdAt: string;
}
