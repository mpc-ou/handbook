import type { Prisma } from "@prisma/client";
import type {
  CategoryRecord,
  CourseRecord,
  EditorBlock,
  ItemAttachment,
  ItemRecord,
  LessonRecord,
  QuizQuestion,
} from "@/types";

export const courseInclude = {
  author: { select: { fullName: true } },
  categories: { select: { categoryId: true } },
} satisfies Prisma.CourseInclude;

export const itemInclude = {
  author: { select: { fullName: true } },
  quiz: true,
  likes: { select: { userId: true } },
} satisfies Prisma.ItemInclude;

type CategoryRow = Prisma.CategoryGetPayload<object>;
type CourseRow = Prisma.CourseGetPayload<{ include: typeof courseInclude }>;
type LessonRow = Prisma.LessonGetPayload<object>;
type ItemRow = Prisma.ItemGetPayload<{ include: typeof itemInclude }>;

const AUTHOR_FALLBACK = "MPC Executive Board";

export function serializeCategory(c: CategoryRow): CategoryRecord {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    icon: c.icon ?? "Folder",
    orderIndex: c.orderIndex,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function serializeCourse(c: CourseRow): CourseRecord {
  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    summary: c.summary ?? "",
    coverImage: c.coverImage ?? undefined,
    status: c.status,
    orderIndex: c.orderIndex,
    sequential: c.sequential,
    visibility: c.visibility,
    audience: c.audience,
    allowedGroups: (c.allowedGroups as string[]) ?? [],
    categoryIds: c.categories.map((x) => x.categoryId),
    authorId: c.authorId,
    authorName: c.author?.fullName || AUTHOR_FALLBACK,
    updaterId: c.updaterId ?? c.authorId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function serializeLesson(l: LessonRow): LessonRecord {
  return {
    id: l.id,
    courseId: l.courseId,
    title: l.title,
    slug: l.slug,
    summary: l.summary ?? "",
    coverImage: l.coverImage ?? undefined,
    orderIndex: l.orderIndex,
    isPublished: l.isPublished,
    requirePrevious: l.requirePrevious,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

export function serializeItem(i: ItemRow): ItemRecord {
  return {
    id: i.id,
    lessonId: i.lessonId,
    type: i.type,
    title: i.title,
    slug: i.slug,
    summary: i.summary ?? "",
    content: i.content as unknown as EditorBlock[],
    plainText: i.plainText,
    readingTime: i.readingTime,
    attachments: i.attachments as unknown as ItemAttachment[],
    orderIndex: i.orderIndex,
    status: i.status,
    isRequired: i.isRequired,
    requirePrevious: i.requirePrevious,
    requireScrollToBottom: i.requireScrollToBottom,
    passScorePercent: i.passScorePercent ?? 0,
    quizDurationMinutes: i.quiz?.durationMinutes ?? 0,
    quizMaxAttempts: i.quiz?.maxAttempts ?? 0,
    quizIsExam: Boolean(i.quiz?.isExam),
    quizQuestions: (i.quiz?.questions as unknown as QuizQuestion[]) ?? [],
    likesCount: i.likesCount,
    likedUserIds: i.likes.map((l) => l.userId),
    viewsCount: i.viewsCount,
    authorId: i.authorId,
    authorName: i.author?.fullName || AUTHOR_FALLBACK,
    updaterId: i.updaterId ?? i.authorId,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}
