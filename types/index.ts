export type Role = "ADMIN" | "EDITOR" | "MEMBER";

export type ArticleStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED";

export interface CommentRecord {
  id: string;
  content: string;
  articleId: string;
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
  managedCategoryIds: string[];
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

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  orderIndex: number;
  isPublished: boolean;
  depth: 1 | 2;
  parentId: string;
  createdAt: string;
  updatedAt: string;
}

export type ArticleAudience = "FREE" | "INTERNAL";
export type ArticleVisibility = "PUBLIC" | "UNPUBLIC";

export interface ArticleRecord {
  id: string;
  title: string;
  slug: string;
  summary: string;
  coverImage?: string; // 3:1 banner ratio
  content: EditorBlock[];
  plainText: string;
  readingTime: number;
  attachments: ArticleAttachment[];
  categoryId: string;
  orderIndex: number;
  status: ArticleStatus;
  isPublished: boolean;
  visibility?: ArticleVisibility;
  audience?: ArticleAudience;
  requirePrevious: boolean;
  requireScrollToBottom: boolean;
  passScorePercent: number; // 0 means no quiz required, 1..100 means required %
  isRequired?: boolean;
  allowedGroups?: string[];
  quizDurationMinutes?: number;
  quizMaxAttempts?: number;
  quizIsExam?: boolean;
  quizQuestions: QuizQuestion[];
  likesCount?: number;
  likedUserIds?: string[];
  isLiked?: boolean;
  viewsCount?: number;
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
  articleId?: string;
  articleTitle?: string;
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
  articleId: string;
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
  articleId: string;
  articleTitle?: string;
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

export interface ArticleAccessResult {
  allowed: boolean;
  reason: "NOT_FOUND" | "PREVIOUS_INCOMPLETE" | null;
  blockingArticle: {
    id: string;
    title: string;
    slug: string;
  } | null;
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
