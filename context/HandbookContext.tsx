"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import {
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import {
  estimateReadingTime,
  extractPlainTextFromBlocks,
  slugify,
} from "@/lib/seed-data";
import {
  canUserManageCategory,
  validateTwoLevelCategoryDepth,
} from "@/lib/progression";
import {
  ArticleRecord,
  ArticleStatus,
  CategoryRecord,
  DepartmentRecord,
  QuizAttemptRecord,
  QuizGradeResponse,
  Role,
  UserProfile,
  UserProgressRecord,
} from "@/types";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export interface SsoEnvStatus {
  mpcSsoConfigured: boolean;
  issuer: string;
  clientIdConfigured: boolean;
  cloudinaryConfigured: boolean;
  cloudName: string;
  emailLoginEnabled?: boolean;
  superAdminEmails?: string[];
}

export interface HandbookContextValue {
  user: UserProfile | null;
  authLoading: boolean;
  dataLoading: boolean;
  dbError: string | null;
  categories: CategoryRecord[];
  articles: ArticleRecord[];
  departments: DepartmentRecord[];
  progressMap: Record<string, UserProgressRecord>;
  allUsers: UserProfile[];
  allProgress: UserProgressRecord[];
  quizAttempts: QuizAttemptRecord[];
  theme: "dark" | "light";
  isSearchOpen: boolean;
  ssoStatus: SsoEnvStatus | null;
  showToast: (text: string, type?: "success" | "error" | "info") => void;
  toggleTheme: () => void;
  setIsSearchOpen: (open: boolean) => void;
  signInWithMpcOidc: (targetCallbackUrl?: string) => void;
  logout: () => Promise<void>;
  switchUser: (targetUser: UserProfile) => void;
  markArticleScrolled: (articleId: string) => Promise<{ isCompleted: boolean }>;
  submitArticleQuiz: (
    articleId: string,
    answers: Record<string, string[]>
  ) => Promise<QuizGradeResponse>;
  createCategory: (input: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    parentId?: string | null;
  }) => Promise<CategoryRecord>;
  updateCategory: (
    categoryId: string,
    patch: Partial<CategoryRecord>
  ) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  deleteCategoryWithOption: (
    categoryId: string,
    action: "cascade" | "reassign",
    targetCategoryId?: string
  ) => Promise<{ success: boolean; error?: string }>;
  toggleLikeArticle: (
    articleId: string
  ) => Promise<{ isLiked: boolean; likesCount: number }>;
  recordArticleView: (articleId: string) => Promise<number | null>;
  saveArticle: (
    input: Omit<
      ArticleRecord,
      "id" | "plainText" | "readingTime" | "updatedAt"
    > & {
      id?: string;
    }
  ) => Promise<ArticleRecord>;
  deleteArticle: (articleId: string) => Promise<void>;
  duplicateArticle: (articleId: string) => Promise<ArticleRecord>;
  updateArticleStatus: (
    articleId: string,
    status: ArticleStatus
  ) => Promise<void>;
  bulkUpdateArticles: (
    articleIds: string[],
    action: "publish" | "unpublish" | "delete"
  ) => Promise<void>;
  reorderArticle: (
    articleId: string,
    direction: "up" | "down"
  ) => Promise<void>;
  batchUpdateCurriculum: (
    articleUpdates: Array<{
      id: string;
      categoryId: string;
      orderIndex: number;
      requirePrevious?: boolean;
    }>,
    categoryUpdates?: Array<{
      id: string;
      orderIndex: number;
      parentId?: string;
      depth?: 1 | 2;
    }>
  ) => Promise<void>;
  updateUserRoleAndPermissions: (
    targetUid: string,
    role: Role,
    department: string,
    managedCategoryIds: string[],
    managedGroups?: string[]
  ) => Promise<void>;
  saveDepartment: (input: {
    id?: string;
    name: string;
    description?: string | null;
    color?: string | null;
  }) => Promise<DepartmentRecord>;
  deleteDepartment: (id: string) => Promise<void>;
}

const HandbookContext = createContext<HandbookContextValue | undefined>(
  undefined
);

export function HandbookProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Restore user session from localStorage if logged in
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const authState = localStorage.getItem("mpc_auth_state");
        if (authState === "LOGGED_OUT") {
          setUser(null);
          setAuthLoading(false);
          return;
        }

        const savedUserStr = localStorage.getItem("mpc_current_user");
        if (savedUserStr) {
          const parsed = JSON.parse(savedUserStr);
          if (parsed && parsed.uid) {
            setUser(parsed);
            setAuthLoading(false);
            return;
          }
        }

        // Guests / non-logged in visitors start with null (NO fake admin injection)
        setUser(null);
      }
    } catch (err) {
      console.warn("Session restore error:", err);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, UserProgressRecord>>({});
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [allProgress, setAllProgress] = useState<UserProgressRecord[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptRecord[]>([]);
  const [ssoStatus, setSsoStatus] = useState<SsoEnvStatus | null>(null);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mpc_theme") as "dark" | "light" | null;
      return saved || "dark";
    }
    return "dark";
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const showToast = useCallback(
    (text: string, type: "success" | "error" | "info" = "info") => {
      if (type === "success") {
        toast.success(text);
      } else if (type === "error") {
        toast.error(text);
      } else {
        toast.info(text);
      }
    },
    []
  );

  // Sync theme class to documentElement
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem("mpc_theme", next);
      }
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch server environment configuration status
  useEffect(() => {
    fetch("/api/auth/sso-status")
      .then((res) => res.json())
      .then((data) => setSsoStatus(data))
      .catch(() => {});
  }, []);

  // Reference to current user to avoid recreating loadHandbookData
  const userRef = useRef<UserProfile | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Load all handbook data from PostgreSQL via Prisma API
  const loadHandbookData = useCallback(
    async (currentProfile?: UserProfile | null) => {
      setDataLoading(true);
      setDbError(null);
      try {
        const res = await fetch("/api/handbook/data", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setCategories(Array.isArray(data.categories) ? data.categories : []);
            setArticles(Array.isArray(data.articles) ? data.articles : []);
            if (Array.isArray(data.allUsers)) {
              setAllUsers(data.allUsers);
            }
            if (Array.isArray(data.allProgress)) {
              setAllProgress(data.allProgress);
            }
            if (Array.isArray(data.quizAttempts)) {
              setQuizAttempts(data.quizAttempts);
            }
            if (Array.isArray(data.departments)) {
              setDepartments(data.departments);
            }

            const activeUid = currentProfile?.uid || userRef.current?.uid;
            const myMap: Record<string, UserProgressRecord> = {};
            if (activeUid) {
              for (const p of data.allProgress || []) {
                if (p.userId === activeUid) {
                  myMap[p.articleId] = p;
                }
              }
            }
            setProgressMap(myMap);
          } else {
            setDbError(data.error || "Không thể tải dữ liệu từ cơ sở dữ liệu.");
          }
        } else {
          setDbError("Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại sau.");
        }
      } catch (err: any) {
        console.error("Failed to load handbook data from Postgres:", err);
        setDbError(err?.message || "Mất kết nối với cơ sở dữ liệu PostgreSQL.");
      } finally {
        setDataLoading(false);
      }
    },
    []
  );

  // Initial load on mount & reload when user changes
  useEffect(() => {
    loadHandbookData(user);
  }, [loadHandbookData, user?.uid]);

  // Sync NextAuth MPC-SSO session once on mount
  useEffect(() => {
    let active = true;

    async function checkMpcSsoSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const session = await res.json();
          if (session?.user?.email && active) {
            // Respect explicit user logout action in this browser
            if (typeof window !== "undefined") {
              const authState = localStorage.getItem("mpc_auth_state");
              if (authState === "LOGGED_OUT") {
                return;
              }
            }

            const nowIso = new Date().toISOString();
            const ssoUser = session.user as Record<string, unknown>;
            const adminEmails = ssoStatus?.superAdminEmails || ["trieukon1011@gmail.com"];
            const isBootstrapAdmin =
              adminEmails.includes(session.user.email.toLowerCase()) ||
              ssoUser.role === "ADMIN";
            const rawId = String(
              ssoUser.id || ssoUser.ssoId || session.user.email
            ).replace(/[^a-zA-Z0-9_-]/g, "_");

            const resolvedUid =
              adminEmails.includes(session.user.email.toLowerCase())
                ? "usr_admin_trieu"
                : rawId;

            const fullName = String(
              session.user.name || session.user.email.split("@")[0]
            );
            const rawAvatar =
              session.user.image ||
              (ssoUser.picture as string) ||
              (ssoUser.avatar as string) ||
              (ssoUser.avatarUrl as string) ||
              (ssoUser.avatar_url as string) ||
              "";
            const avatarUrl =
              rawAvatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=f97316&color=fff&bold=true`;

            const oidcProfile: UserProfile = {
              uid: resolvedUid,
              ssoId: String(ssoUser.ssoId || rawId),
              email: String(session.user.email),
              fullName,
              avatarUrl,
              department: String(
                ssoUser.department ||
                  (isBootstrapAdmin ? "Executive Board" : "Tech Board")
              ),
              role: isBootstrapAdmin
                ? "ADMIN"
                : ((ssoUser.role as Role) || "MEMBER"),
              noPassword: Boolean(ssoUser.noPassword),
              managedCategoryIds: [],
              createdAt: nowIso,
              updatedAt: nowIso,
            };

            if (typeof window !== "undefined") {
              localStorage.setItem("mpc_auth_state", "LOGGED_IN");
              localStorage.setItem("mpc_current_user", JSON.stringify(oidcProfile));
            }

            setUser((prev) => {
              if (
                prev &&
                prev.uid === oidcProfile.uid &&
                prev.email === oidcProfile.email &&
                prev.avatarUrl === oidcProfile.avatarUrl
              ) {
                return prev;
              }
              return oidcProfile;
            });
          }
        }
      } catch (err) {
        console.warn("MPC-SSO session check:", err);
      }
    }

    checkMpcSsoSession();
    return () => {
      active = false;
    };
  }, []);

  // Update personal progress map locally when user or allProgress updates
  // Sync the session user with its PostgreSQL record (role + assigned categories),
  // since the auth session alone does not carry managedCategoryIds.
  useEffect(() => {
    if (!user || allUsers.length === 0) return;
    const dbUser = allUsers.find(
      (u) =>
        u.uid === user.uid ||
        u.email?.toLowerCase() === user.email?.toLowerCase()
    );
    if (!dbUser) return;
    const isSuper = (ssoStatus?.superAdminEmails || []).includes(
      user.email?.toLowerCase() || ""
    );
    const nextRole = isSuper ? "ADMIN" : dbUser.role;
    const nextManaged = dbUser.managedCategoryIds || [];
    const sameManaged =
      (user.managedCategoryIds || []).join(",") === nextManaged.join(",");
    if (
      user.uid === dbUser.uid &&
      user.role === nextRole &&
      sameManaged &&
      user.department === (dbUser.department || user.department)
    ) {
      return;
    }
    const merged: UserProfile = {
      ...user,
      uid: dbUser.uid,
      role: nextRole,
      department: dbUser.department || user.department,
      managedCategoryIds: nextManaged,
      managedGroups: dbUser.managedGroups ?? user.managedGroups,
    };
    setUser(merged);
    if (typeof window !== "undefined") {
      localStorage.setItem("mpc_current_user", JSON.stringify(merged));
    }
  }, [user, allUsers, ssoStatus]);

  useEffect(() => {
    if (!user || allProgress.length === 0) {
      setProgressMap({});
      return;
    }
    const myMap: Record<string, UserProgressRecord> = {};
    for (const p of allProgress) {
      if (p.userId === user.uid) {
        myMap[p.articleId] = p;
      }
    }
    setProgressMap(myMap);
  }, [user, allProgress]);

  const signInWithMpcOidc = useCallback((targetCallbackUrl?: string) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("mpc_auth_state");
    }
    nextAuthSignIn("mpc-sso", { callbackUrl: targetCallbackUrl || "/" });
  }, []);

  const logout = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mpc_auth_state", "LOGGED_OUT");
      localStorage.removeItem("mpc_current_user");
    }
    await nextAuthSignOut({ redirect: false }).catch(() => {});
    setUser(null);
    setProgressMap({});
    showToast("Logged out successfully.", "info");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, [showToast]);

  const switchUser = useCallback(
    (targetUser: UserProfile) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("mpc_auth_state", "LOGGED_IN");
        localStorage.setItem("mpc_current_user", JSON.stringify(targetUser));
      }
      setUser(targetUser);
      const myMap: Record<string, UserProgressRecord> = {};
      for (const p of allProgress) {
        if (p.userId === targetUser.uid) {
          myMap[p.articleId] = p;
        }
      }
      setProgressMap(myMap);
      showToast(`Signed in as: ${targetUser.fullName}.`, "success");
    },
    [allProgress, showToast]
  );

  // Mark Article Scrolled to Bottom -> PostgreSQL
  const markArticleScrolled = useCallback(
    async (articleId: string): Promise<{ isCompleted: boolean }> => {
      if (!user) return { isCompleted: false };
      const article = articles.find((a) => a.id === articleId);
      if (!article) return { isCompleted: false };

      const existing = progressMap[articleId];
      const nowIso = new Date().toISOString();

      const quizRequired = (article.passScorePercent || 0) > 0;
      const quizPassed =
        !quizRequired ||
        (existing?.highestQuizScore ?? 0) >= article.passScorePercent;
      const isCompleted = true && quizPassed;

      const record: UserProgressRecord = {
        id: `${user.uid}_${articleId}`,
        userId: user.uid,
        userEmail: user.email,
        userName: user.fullName,
        articleId,
        hasScrolledBottom: true,
        highestQuizScore: existing?.highestQuizScore ?? 0,
        isCompleted,
        completedAt:
          isCompleted && !existing?.isCompleted
            ? nowIso
            : existing?.completedAt || "",
        lastAccessedAt: nowIso,
      };

      setProgressMap((prev) => ({ ...prev, [articleId]: record }));
      setAllProgress((prev) => {
        const filtered = prev.filter(
          (p) => !(p.userId === user.uid && p.articleId === articleId)
        );
        return [...filtered, record];
      });

      // Save to PostgreSQL
      try {
        await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            articleId,
            hasScrolledBottom: true,
            isCompleted,
          }),
        });
      } catch (err) {
        console.warn("Failed to persist progress to Postgres:", err);
      }

      if (isCompleted && !existing?.isCompleted) {
        showToast(
          "Reading completed! Next lesson in the curriculum has been unlocked.",
          "success"
        );
      }

      return { isCompleted };
    },
    [user, articles, progressMap, showToast]
  );

  // Submit Quiz Attempt -> PostgreSQL via server-side grading
  const submitArticleQuiz = useCallback(
    async (
      articleId: string,
      userAnswers: Record<string, string[]>
    ): Promise<QuizGradeResponse> => {
      const article = articles.find((a) => a.id === articleId);
      if (!article) {
        throw new Error("Article not found.");
      }

      const res = await fetch("/api/quiz/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          userId: user?.uid,
          userAnswers,
          passScorePercent: article.passScorePercent,
          questions: article.quizQuestions,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Unable to grade quiz assessment.");
      }

      const gradeResult: QuizGradeResponse = await res.json();

      // If Guest (unauthenticated): Return score to view, but DO NOT save to training progress
      if (!user) {
        showToast(
          "You are taking this assessment as a Guest. Results are not saved to training records.",
          "info"
        );
        return gradeResult;
      }

      const nowIso = new Date().toISOString();

      // Optimistically update progressMap
      const existing = progressMap[articleId];
      const newHighest = Math.max(
        existing?.highestQuizScore ?? 0,
        gradeResult.scorePercent
      );
      const scrollOk =
        !article.requireScrollToBottom ||
        (existing?.hasScrolledBottom ?? false);
      const isCompleted =
        scrollOk && newHighest >= (article.passScorePercent || 0);

      const updatedRecord: UserProgressRecord = {
        id: `${user.uid}_${articleId}`,
        userId: user.uid,
        userEmail: user.email,
        userName: user.fullName,
        articleId,
        hasScrolledBottom: existing?.hasScrolledBottom ?? !article.requireScrollToBottom,
        highestQuizScore: newHighest,
        isCompleted,
        completedAt:
          isCompleted && !existing?.isCompleted
            ? nowIso
            : existing?.completedAt || "",
        lastAccessedAt: nowIso,
      };

      setProgressMap((prev) => ({ ...prev, [articleId]: updatedRecord }));
      setAllProgress((prev) => {
        const filtered = prev.filter(
          (p) => !(p.userId === user.uid && p.articleId === articleId)
        );
        return [...filtered, updatedRecord];
      });

      const attemptRecord: QuizAttemptRecord = {
        id: `att_${Date.now()}`,
        userId: user.uid,
        articleId,
        scorePercent: gradeResult.scorePercent,
        isPassed: gradeResult.isPassed,
        createdAt: nowIso,
      };
      setQuizAttempts((prev) => [attemptRecord, ...prev]);

      return {
        ...gradeResult,
        isCompleted,
      };
    },
    [user, articles, progressMap]
  );

  // Create Category -> PostgreSQL
  const createCategory = useCallback(
    async (input: {
      name: string;
      slug?: string;
      description?: string;
      icon?: string;
      parentId?: string | null;
    }): Promise<CategoryRecord> => {
      if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
        throw new Error("You do not have permission to create categories.");
      }

      validateTwoLevelCategoryDepth(input.parentId, categories);
      const cleanName = input.name.trim();
      if (!cleanName) {
        throw new Error("Category name cannot be empty.");
      }

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create category.");
      }

      const data = await res.json();
      const newCat: CategoryRecord = data.category;

      setCategories((prev) => [...prev, newCat]);
      showToast(`Category "${cleanName}" created successfully.`, "success");
      return newCat;
    },
    [user, categories, showToast]
  );

  // Update Category -> PostgreSQL
  const updateCategory = useCallback(
    async (
      categoryId: string,
      patch: Partial<CategoryRecord>
    ) => {
      if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
        throw new Error("You do not have permission to update categories.");
      }

      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoryId, ...patch }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update category.");
      }

      const data = await res.json();
      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? data.category : c))
      );
      showToast("Category updated successfully.", "success");
    },
    [user, showToast]
  );

  // Delete Category -> PostgreSQL
  const deleteCategory = useCallback(
    async (categoryId: string) => {
      if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
        throw new Error("You do not have permission to delete categories.");
      }

      const res = await fetch(`/api/categories?id=${encodeURIComponent(categoryId)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete category.");
      }

      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      showToast("Category deleted successfully.", "info");
    },
    [user, showToast]
  );

  // Delete Category with option (cascade or reassign) -> PostgreSQL
  const deleteCategoryWithOption = useCallback(
    async (
      categoryId: string,
      action: "cascade" | "reassign",
      targetCategoryId?: string
    ) => {
      if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
        throw new Error("You do not have permission to delete categories.");
      }

      let url = `/api/categories?id=${encodeURIComponent(categoryId)}`;
      if (action === "cascade") {
        url += "&deleteArticles=true";
      } else if (action === "reassign" && targetCategoryId) {
        url += `&targetCategoryId=${encodeURIComponent(targetCategoryId)}`;
      }

      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete category.");
      }

      await loadHandbookData();
      showToast("Categories updated successfully.", "success");
      return { success: true };
    },
    [user, loadHandbookData, showToast]
  );

  // Toggle Like Article -> PostgreSQL
  const toggleLikeArticle = useCallback(
    async (articleId: string) => {
      if (!user) {
        showToast("Please sign in to like this article.", "error");
        return { isLiked: false, likesCount: 0 };
      }

      try {
        const res = await fetch(`/api/articles/${articleId}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setArticles((prev) =>
              prev.map((a) => {
                if (a.id === articleId) {
                  const likedIds = a.likedUserIds || [];
                  const newLikedIds = data.isLiked
                    ? Array.from(new Set([...likedIds, user.uid]))
                    : likedIds.filter((id) => id !== user.uid);

                  return {
                    ...a,
                    likesCount: data.likesCount,
                    likedUserIds: newLikedIds,
                    isLiked: data.isLiked,
                  };
                }
                return a;
              })
            );
            return { isLiked: data.isLiked, likesCount: data.likesCount };
          }
        }
      } catch (err) {
        console.error("Toggle like error:", err);
      }
      return { isLiked: false, likesCount: 0 };
    },
    [user, showToast]
  );

  // Record Article View -> PostgreSQL
  const recordArticleView = useCallback(
    async (articleId: string): Promise<number | null> => {
      try {
        const res = await fetch(`/api/articles/${articleId}/view`, {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && typeof data.viewsCount === "number") {
            setArticles((prev) =>
              prev.map((a) =>
                a.id === articleId ? { ...a, viewsCount: data.viewsCount } : a
              )
            );
            return data.viewsCount;
          }
        }
      } catch (err) {
        console.error("Record view error:", err);
      }
      return null;
    },
    []
  );

  // Create or Update Article -> PostgreSQL
  const saveArticle = useCallback(
    async (
      input: Omit<
        ArticleRecord,
        "id" | "plainText" | "readingTime" | "updatedAt"
      > & {
        id?: string;
      }
    ): Promise<ArticleRecord> => {
      if (!user) throw new Error("Please sign in first.");

      if (!canUserManageCategory(user, input.categoryId, categories)) {
        throw new Error(
          "You do not have permission to edit articles in this category."
        );
      }

      const isExisting = Boolean(
        input.id && articles.some((a) => a.id === input.id)
      );

      const endpoint = "/api/articles";
      const method = isExisting ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          authorId: user.uid,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save article.");
      }

      const data = await res.json();
      const savedArticle: ArticleRecord = data.article;

      setArticles((prev) => {
        const filtered = prev.filter((a) => a.id !== savedArticle.id);
        return [...filtered, savedArticle].sort(
          (a, b) => a.orderIndex - b.orderIndex
        );
      });

      showToast(
        isExisting
          ? `Article "${savedArticle.title}" saved successfully`
          : `Article "${savedArticle.title}" created successfully`,
        "success"
      );

      return savedArticle;
    },
    [user, categories, articles, showToast]
  );

  // Delete Article -> PostgreSQL
  const deleteArticle = useCallback(
    async (articleId: string) => {
      const target = articles.find((a) => a.id === articleId);
      if (!target) return;
      if (!canUserManageCategory(user, target.categoryId, categories)) {
        throw new Error("You do not have permission to delete this article.");
      }

      const res = await fetch(`/api/articles?id=${encodeURIComponent(articleId)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete article.");
      }

      setArticles((prev) => prev.filter((a) => a.id !== articleId));
      showToast(`Article "${target.title}" deleted.`, "info");
    },
    [user, articles, categories, showToast]
  );

  // Duplicate Article -> PostgreSQL
  const duplicateArticle = useCallback(
    async (articleId: string): Promise<ArticleRecord> => {
      if (!user) throw new Error("Please sign in first.");
      const target = articles.find((a) => a.id === articleId);
      if (!target) throw new Error("Article not found.");
      if (!canUserManageCategory(user, target.categoryId, categories)) {
        throw new Error("You do not have permission to duplicate this article.");
      }

      const siblings = articles.filter(
        (a) => a.categoryId === target.categoryId
      );
      const suffix = Date.now().toString().slice(-4);
      const copyTitle = `${target.title} (Copy)`.slice(0, 200);
      const copySlug = `${target.slug}-ban-sao-${suffix}`.slice(0, 220);

      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...target,
          id: undefined,
          title: copyTitle,
          slug: copySlug,
          isPublished: false,
          orderIndex: siblings.length + 1,
          authorId: user.uid,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to duplicate article.");
      }

      const data = await res.json();
      const copyRecord: ArticleRecord = data.article;

      setArticles((prev) => {
        const next = [...prev, copyRecord].sort(
          (a, b) => a.orderIndex - b.orderIndex
        );
        return next;
      });

      showToast(`Article "${target.title}" duplicated as draft.`, "success");
      return copyRecord;
    },
    [user, articles, categories, showToast]
  );

  // Quick single article status change (DRAFT, PENDING_REVIEW, PUBLISHED)
  const updateArticleStatus = useCallback(
    async (articleId: string, targetStatus: ArticleStatus) => {
      if (!user) throw new Error("Please sign in first.");
      const isPublished = targetStatus === "PUBLISHED";

      const res = await fetch("/api/articles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: articleId,
          status: targetStatus,
          isPublished,
          updaterId: user.uid,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update article status.");
      }

      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleId
            ? { ...a, status: targetStatus, isPublished }
            : a
        )
      );

      const statusLabels: Record<ArticleStatus, string> = {
        PUBLISHED: "Đã xuất bản",
        PENDING_REVIEW: "Chờ duyệt",
        DRAFT: "Bản nháp",
      };
      showToast(`Cập nhật trạng thái thành công: ${statusLabels[targetStatus] || targetStatus}`, "success");
    },
    [user, showToast]
  );

  // Bulk update articles
  const bulkUpdateArticles = useCallback(
    async (
      articleIds: string[],
      action: "publish" | "unpublish" | "delete"
    ) => {
      if (!user || articleIds.length === 0) return;
      const idSet = new Set(articleIds);

      if (action === "delete") {
        for (const id of articleIds) {
          await fetch(`/api/articles?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
        }
        setArticles((prev) => prev.filter((a) => !idSet.has(a.id)));
        showToast(`Deleted ${articleIds.length} selected articles.`, "info");
        return;
      }

      const isPublished = action === "publish";
      for (const id of articleIds) {
        await fetch("/api/articles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, isPublished }),
        }).catch(() => {});
      }

      setArticles((prev) =>
        prev.map((a) =>
          idSet.has(a.id)
            ? { ...a, isPublished }
            : a
        )
      );

      showToast(
        isPublished
          ? `Published ${articleIds.length} articles.`
          : `Moved ${articleIds.length} articles to draft.`,
        "success"
      );
    },
    [user, showToast]
  );

  // Batch update curriculum (order & category nesting)
  const batchUpdateCurriculum = useCallback(
    async (
      articleUpdates: Array<{
        id: string;
        categoryId: string;
        orderIndex: number;
        requirePrevious?: boolean;
      }>,
      categoryUpdates?: Array<{
        id: string;
        orderIndex: number;
        parentId?: string;
        depth?: 1 | 2;
      }>
    ) => {
      if (!user) return;

      if (articleUpdates.length > 0) {
        const updateMap = new Map(articleUpdates.map((u) => [u.id, u]));
        for (const u of articleUpdates) {
          fetch("/api/articles", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(u),
          }).catch(() => {});
        }
        setArticles((prev) =>
          prev
            .map((a) => {
              const patch = updateMap.get(a.id);
              if (!patch) return a;
              return {
                ...a,
                categoryId: patch.categoryId,
                orderIndex: patch.orderIndex,
                requirePrevious:
                  patch.requirePrevious !== undefined
                    ? patch.requirePrevious
                    : a.requirePrevious,
              };
            })
            .sort((a, b) => a.orderIndex - b.orderIndex)
        );
      }

      if (categoryUpdates && categoryUpdates.length > 0) {
        const catMap = new Map(categoryUpdates.map((u) => [u.id, u]));
        for (const c of categoryUpdates) {
          fetch("/api/categories", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(c),
          }).catch(() => {});
        }
        setCategories((prev) =>
          prev
            .map((c) => {
              const patch = catMap.get(c.id);
              if (!patch) return c;
              return {
                ...c,
                orderIndex: patch.orderIndex,
                parentId: patch.parentId !== undefined ? patch.parentId : c.parentId,
                depth: patch.depth !== undefined ? patch.depth : c.depth,
              };
            })
            .sort((a, b) => a.orderIndex - b.orderIndex)
        );
      }

      showToast("Curriculum roadmap order updated.", "success");
    },
    [user, showToast]
  );

  // Reorder article up/down
  const reorderArticle = useCallback(
    async (articleId: string, direction: "up" | "down") => {
      const target = articles.find((a) => a.id === articleId);
      if (!target || !user) return;

      const siblings = articles
        .filter((a) => a.categoryId === target.categoryId)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const idx = siblings.findIndex((a) => a.id === articleId);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= siblings.length) return;

      const neighbor = siblings[swapIdx];

      await Promise.allSettled([
        fetch("/api/articles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: target.id, orderIndex: neighbor.orderIndex }),
        }),
        fetch("/api/articles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: neighbor.id, orderIndex: target.orderIndex }),
        }),
      ]);

      setArticles((prev) =>
        prev
          .map((a) => {
            if (a.id === target.id) return { ...a, orderIndex: neighbor.orderIndex };
            if (a.id === neighbor.id) return { ...a, orderIndex: target.orderIndex };
            return a;
          })
          .sort((a, b) => a.orderIndex - b.orderIndex)
      );

      showToast("Article order updated.", "info");
    },
    [user, articles, showToast]
  );

  // Update User Role and Permissions -> PostgreSQL
  const updateUserRoleAndPermissions = useCallback(
    async (
      targetUid: string,
      role: Role,
      department: string,
      managedCategoryIds: string[],
      managedGroups?: string[]
    ) => {
      if (!user || user.role !== "ADMIN") {
        throw new Error("Only Executive Board Administrators can manage permissions.");
      }

      const res = await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: targetUid,
          role,
          department,
          managedCategoryIds,
          managedGroups,
          callerId: user.uid,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update member permissions.");
      }

      setAllUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUid
            ? { ...u, role, department, managedCategoryIds, managedGroups: managedGroups ?? u.managedGroups }
            : u
        )
      );

      showToast("Member role and permissions updated successfully.", "success");
    },
    [user, showToast]
  );

  const saveDepartment = useCallback(
    async (input: {
      id?: string;
      name: string;
      description?: string | null;
      color?: string | null;
    }): Promise<DepartmentRecord> => {
      const isExisting = Boolean(input.id);
      const method = isExisting ? "PUT" : "POST";
      const res = await fetch("/api/departments", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save department.");
      }
      const savedDept: DepartmentRecord = data.department;
      setDepartments((prev) => {
        const filtered = prev.filter((d) => d.id !== savedDept.id);
        return [...filtered, savedDept].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      });
      showToast(
        isExisting ? `Updated ${savedDept.name}` : `Added ${savedDept.name}`,
        "success"
      );
      return savedDept;
    },
    [showToast]
  );

  const deleteDepartment = useCallback(
    async (id: string): Promise<void> => {
      const res = await fetch(`/api/departments?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to delete department.");
      }
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      showToast("Department deleted successfully.", "success");
    },
    [showToast]
  );

  const contextValue: HandbookContextValue = {
    user,
    authLoading,
    dataLoading,
    dbError,
    categories,
    articles,
    departments,
    progressMap,
    allUsers,
    allProgress,
    quizAttempts,
    theme,
    isSearchOpen,
    ssoStatus,
    showToast,
    toggleTheme,
    setIsSearchOpen,
    signInWithMpcOidc,
    logout,
    switchUser,
    markArticleScrolled,
    submitArticleQuiz,
    createCategory,
    updateCategory,
    deleteCategory,
    deleteCategoryWithOption,
    toggleLikeArticle,
    recordArticleView,
    saveArticle,
    deleteArticle,
    duplicateArticle,
    updateArticleStatus,
    bulkUpdateArticles,
    reorderArticle,
    batchUpdateCurriculum,
    updateUserRoleAndPermissions,
    saveDepartment,
    deleteDepartment,
  };

  return (
    <HandbookContext.Provider value={contextValue}>
      {children}
      <Toaster position="bottom-right" richColors closeButton theme={theme} />
    </HandbookContext.Provider>
  );
}

export function useHandbook(): HandbookContextValue {
  const context = useContext(HandbookContext);
  if (!context) {
    throw new Error("useHandbook must be used within a HandbookProvider");
  }
  return context;
}
