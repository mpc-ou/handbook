import {
  ArticleAccessResult,
  ArticleRecord,
  CategoryRecord,
  ClientQuizQuestion,
  QuizQuestion,
  UserProfile,
  UserProgressRecord,
} from "@/types";

/**
 * Checks whether a member is allowed to access an article based on
 * the Sequential Learning configuration (`requirePrevious` and `orderIndex`).
 */
export function checkArticleAccess(
  articleId: string,
  articles: ArticleRecord[],
  userProgressMap: Record<string, UserProgressRecord>
): ArticleAccessResult {
  const currentArticle = articles.find((a) => a.id === articleId);
  if (!currentArticle) {
    return { allowed: false, reason: "NOT_FOUND", blockingArticle: null };
  }

  if (!currentArticle.requirePrevious) {
    return { allowed: true, reason: null, blockingArticle: null };
  }

  // Find immediately preceding published article in the same category
  const candidates = articles
    .filter(
      (a) =>
        a.categoryId === currentArticle.categoryId &&
        a.isPublished &&
        a.orderIndex < currentArticle.orderIndex
    )
    .sort((a, b) => b.orderIndex - a.orderIndex);

  const previousArticle = candidates[0];
  if (!previousArticle) {
    return { allowed: true, reason: null, blockingArticle: null };
  }

  const prevProgress = userProgressMap[previousArticle.id];
  if (!prevProgress?.isCompleted) {
    return {
      allowed: false,
      reason: "PREVIOUS_INCOMPLETE",
      blockingArticle: {
        id: previousArticle.id,
        title: previousArticle.title,
        slug: previousArticle.slug,
      },
    };
  }

  return { allowed: true, reason: null, blockingArticle: null };
}

/**
 * Strips `correctOptionIds` and `explanation` from QuizQuestion[] before
 * rendering in the client reader view so answers are not exposed in DOM/state.
 */
export function stripQuizAnswersForClient(
  questions: QuizQuestion[]
): ClientQuizQuestion[] {
  return (questions || []).map((q) => ({
    id: q.id,
    questionText: q.questionText,
    type: q.type,
    options: (q.options || []).map((opt) => ({
      id: opt.id,
      text: opt.text,
    })),
    scaleMax: q.scaleMax,
    scaleMinLabel: q.scaleMinLabel,
    scaleMaxLabel: q.scaleMaxLabel,
    fileAcceptedTypes: q.fileAcceptedTypes,
    attachmentType: q.attachmentType,
    attachmentUrl: q.attachmentUrl,
    attachmentCaption: q.attachmentCaption,
    sampleCode: q.sampleCode,
  }));
}

/**
 * Checks if a user (`ADMIN` or `EDITOR`) has permission to manage a specific category.
 * Supports 2-level inheritance: if an EDITOR is assigned to a Level 1 parent category,
 * they automatically have permission on its Level 2 child categories.
 */
export function canUserManageCategory(
  user: UserProfile | null,
  categoryId: string,
  categories: CategoryRecord[]
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  if (user.role === "EDITOR") {
    const managed = user.managedCategoryIds || [];
    if (managed.includes(categoryId)) return true;

    const category = categories.find((c) => c.id === categoryId);
    if (category?.parentId && managed.includes(category.parentId)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates the 2-level category hierarchy constraint.
 * Throws an informative Vietnamese error if attempting to create depth > 2.
 */
export function validateTwoLevelCategoryDepth(
  parentId: string | null | undefined,
  categories: CategoryRecord[]
): 1 | 2 {
  if (!parentId || parentId.trim() === "") {
    return 1;
  }

  const parentCategory = categories.find((c) => c.id === parentId);
  if (!parentCategory) {
    throw new Error("Parent category does not exist.");
  }

  if (parentCategory.depth >= 2) {
    throw new Error(
      "The system only allows a maximum of 2 category levels (Level 1 > Level 2 > Articles)."
    );
  }

  return 2;
}

/**
 * Checks whether a user is allowed to view an article based on group privacy (`allowedGroups`).
 * - If allowedGroups is empty: Public to everyone.
 * - If user is ADMIN: Always allowed.
 * - If user is not logged in: Disallowed if article has restricted groups.
 * - If user.department is in allowedGroups or user.managedGroups overlaps: Allowed.
 */
/**
 * Check article viewing permission:
 * - audience === "FREE": Guest access permitted without login.
 * - audience === "INTERNAL": Sign-in required. Evaluates allowedGroups.
 */
export function canUserViewArticle(
  user: UserProfile | null,
  article: ArticleRecord
): {
  allowed: boolean;
  reason?: "LOGIN_REQUIRED" | "GROUP_RESTRICTED";
  allowedGroups?: string[];
} {
  const groups = article.allowedGroups || [];
  const audience = (
    article.audience || (groups.length > 0 ? "INTERNAL" : "FREE")
  ).toUpperCase();

  // 1. Free/Public audience: No login required
  if (audience === "FREE") {
    return { allowed: true };
  }

  // 2. Internal audience: Sign-in required
  if (!user) {
    return {
      allowed: false,
      reason: "LOGIN_REQUIRED",
      allowedGroups: groups,
    };
  }

  // Admins can always view all internal documents
  if (user.role === "ADMIN") {
    return { allowed: true };
  }

  // If allowedGroups is empty: All signed-in members can view
  if (groups.length === 0) {
    return { allowed: true };
  }

  // If departments are specified: Check member department
  const userDept = user.department?.trim();
  if (userDept && groups.includes(userDept)) {
    return { allowed: true };
  }

  // Check member managedGroups
  const userManaged = user.managedGroups || [];
  const hasManagedGroup = userManaged.some((g) => groups.includes(g));
  if (hasManagedGroup) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "GROUP_RESTRICTED",
    allowedGroups: groups,
  };
}
