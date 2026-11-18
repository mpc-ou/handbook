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
import { useTranslations } from "next-intl";
import { apiRequest } from "@/lib/api-client";
import { computeStreak } from "@/lib/gamification";
import { getCourseProgress } from "@/lib/progression";
import {
  CategoryRecord,
  ContentStatus,
  CourseRecord,
  DepartmentRecord,
  ItemRecord,
  LessonRecord,
  QuizAttemptRecord,
  QuizGradeResponse,
  Role,
  UserProfile,
  UserProgressRecord,
} from "@/types";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

/** Phát sự kiện cho linh vật đồng hành (components/companion). */
function emitCompanion(type: string, detail: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mpc:companion", { detail: { type, ...detail } }));
}

type ServerOwnedFields = "id" | "createdAt" | "updatedAt" | "authorId" | "authorName" | "updaterId";

export type CourseInput = Partial<Omit<CourseRecord, ServerOwnedFields>> & {
  id?: string;
  title: string;
};

export type LessonInput = Partial<Omit<LessonRecord, ServerOwnedFields>> & {
  id?: string;
  courseId: string;
  title: string;
};

export type ItemInput = Partial<
  Omit<
    ItemRecord,
    | ServerOwnedFields
    | "plainText"
    | "readingTime"
    | "likesCount"
    | "likedUserIds"
    | "isLiked"
    | "viewsCount"
  >
> & {
  id?: string;
  lessonId: string;
  title: string;
};

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
  courses: CourseRecord[];
  lessons: LessonRecord[];
  items: ItemRecord[];
  departments: DepartmentRecord[];
  /** Tiến độ của người dùng hiện tại, khóa theo itemId. */
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
  /** Đánh dấu đã đọc hết chương; server quyết định hoàn thành hay chưa. */
  markItemScrolled: (itemId: string) => Promise<{ isCompleted: boolean }>;
  submitItemQuiz: (
    itemId: string,
    answers: Record<string, string[]>
  ) => Promise<QuizGradeResponse>;

  createCategory: (input: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
  }) => Promise<CategoryRecord>;
  updateCategory: (
    categoryId: string,
    patch: Partial<CategoryRecord>
  ) => Promise<void>;
  /** Chỉ gỡ nhãn khỏi các khóa học, không xóa khóa học. */
  deleteCategory: (categoryId: string) => Promise<void>;

  saveCourse: (input: CourseInput) => Promise<CourseRecord>;
  /** Ném ApiError (requireConfirmation) nếu còn nội dung và chưa `confirm`. */
  deleteCourse: (courseId: string, confirm?: boolean) => Promise<void>;
  updateCourseStatus: (courseId: string, status: ContentStatus) => Promise<void>;

  saveLesson: (input: LessonInput) => Promise<LessonRecord>;
  /** Ném ApiError (requireConfirmation) nếu còn chương và chưa `confirm`. */
  deleteLesson: (lessonId: string, confirm?: boolean) => Promise<void>;

  saveItem: (input: ItemInput) => Promise<ItemRecord>;
  deleteItem: (itemId: string) => Promise<void>;
  duplicateItem: (itemId: string) => Promise<ItemRecord>;
  updateItemStatus: (itemId: string, status: ContentStatus) => Promise<void>;
  bulkUpdateItems: (
    itemIds: string[],
    action: "publish" | "unpublish" | "delete"
  ) => Promise<void>;

  /**
   * Sắp xếp anh em cùng cấp theo thứ tự id mới.
   * course: parentId = null · lesson: parentId = courseId · item: parentId = lessonId.
   */
  reorderChildren: (
    kind: "course" | "lesson" | "item",
    parentId: string | null,
    orderedIds: string[]
  ) => Promise<void>;

  toggleLikeItem: (
    itemId: string
  ) => Promise<{ isLiked: boolean; likesCount: number }>;
  recordItemView: (itemId: string) => Promise<number | null>;

  updateUserRoleAndPermissions: (
    targetUid: string,
    role: Role,
    department: string,
    managedCourseIds: string[],
    managedGroups?: string[]
  ) => Promise<void>;
  /** Tải lại toàn bộ dữ liệu từ server (sau thao tác quản trị ảnh hưởng nhiều nơi). */
  refreshData: () => Promise<void>;
  /** ADMIN xóa thành viên (tiến độ/bình luận của họ bị xóa; nội dung họ tạo chuyển cho người xóa). */
  deleteMember: (uid: string) => Promise<void>;
  /** ADMIN dọn dữ liệu học tập của thành viên, toàn bộ hoặc theo một khóa học. */
  cleanupMemberData: (
    uid: string,
    actions: Array<"progress" | "attempts" | "comments">,
    courseId?: string | null
  ) => Promise<{ progress: number; attempts: number; comments: number }>;
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
  const t = useTranslations("common");
  // Bản dịch ổn định cho các callback (không phải thêm vào deps mỗi hàm)
  const tRef = useRef(t);
  tRef.current = t;
  const tt = useCallback(
    (key: string, values?: Record<string, string | number>) => tRef.current(`toast.${key}`, values),
    []
  );
  const statusLabel = useCallback((status: ContentStatus) => tRef.current(`status.${status}`), []);

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
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [lessons, setLessons] = useState<LessonRecord[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
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
            setCourses(Array.isArray(data.courses) ? data.courses : []);
            setLessons(Array.isArray(data.lessons) ? data.lessons : []);
            setItems(Array.isArray(data.items) ? data.items : []);
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
                  myMap[p.itemId] = p;
                }
              }
            }
            setProgressMap(myMap);
          } else {
            setDbError(data.error || tt("loadFailed"));
          }
        } else {
          setDbError(tt("connectionError"));
        }
      } catch (err: any) {
        console.error("Failed to load handbook data from Postgres:", err);
        setDbError(err?.message || tt("connectionLost"));
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
              managedCourseIds: [],
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
  // since the auth session alone does not carry managedCourseIds.
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
    const nextManaged = dbUser.managedCourseIds || [];
    const sameManaged =
      (user.managedCourseIds || []).join(",") === nextManaged.join(",");
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
      managedCourseIds: nextManaged,
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
        myMap[p.itemId] = p;
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
    showToast(tt("loggedOut"), "info");
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
          myMap[p.itemId] = p;
        }
      }
      setProgressMap(myMap);
      showToast(tt("signedInAs", { name: targetUser.fullName }), "success");
    },
    [allProgress, showToast]
  );

  // ───────────────────────── Tiến độ học ─────────────────────────

  const applyServerProgress = useCallback(
    (
      itemId: string,
      progress: {
        id: string;
        hasScrolledBottom: boolean;
        highestQuizScore: number | null;
        isCompleted: boolean;
        completedAt: string | null;
        lastAccessedAt: string;
      }
    ) => {
      if (!user) return;
      const record: UserProgressRecord = {
        id: progress.id,
        userId: user.uid,
        userEmail: user.email,
        userName: user.fullName,
        itemId,
        hasScrolledBottom: progress.hasScrolledBottom,
        highestQuizScore: progress.highestQuizScore ?? 0,
        isCompleted: progress.isCompleted,
        completedAt: progress.completedAt ?? "",
        lastAccessedAt: progress.lastAccessedAt,
      };
      setProgressMap((prev) => ({ ...prev, [itemId]: record }));
      setAllProgress((prev) => [
        ...prev.filter((p) => !(p.userId === user.uid && p.itemId === itemId)),
        record,
      ]);
    },
    [user]
  );

  // Khi một item vừa hoàn thành: báo linh vật (chương/chuỗi ngày/khóa học) dựa trên dữ liệu mới nhất
  const latestRef = useRef({ items, lessons, progressMap });
  latestRef.current = { items, lessons, progressMap };
  const notifyCompletion = useCallback(
    (itemId: string, completedAt: string | null, opts: { quiz?: boolean } = {}) => {
      const { items: allItems, lessons: allLessons, progressMap: current } = latestRef.current;
      const item = allItems.find((i) => i.id === itemId);
      if (!item) return;
      if (!opts.quiz) emitCompanion("item_completed", { itemType: item.type });

      const before = computeStreak(Object.values(current));
      const afterRecords = [
        ...Object.values(current).filter((p) => p.itemId !== itemId),
        { itemId, isCompleted: true, completedAt: completedAt ?? new Date().toISOString() },
      ];
      const after = computeStreak(afterRecords);
      if (after.current > before.current && after.current >= 2) emitCompanion("streak", { days: after.current });

      const lesson = allLessons.find((l) => l.id === item.lessonId);
      if (lesson) {
        const doneMap = {
          ...current,
          [itemId]: { ...(current[itemId] ?? {}), itemId, isCompleted: true } as UserProgressRecord,
        };
        const summary = getCourseProgress(lesson.courseId, allLessons, allItems, doneMap);
        if (summary.total > 0 && summary.completed >= summary.total) {
          emitCompanion("course_completed", { courseId: lesson.courseId });
        }
      }
    },
    []
  );

  // Đánh dấu đã đọc hết chương. Server quyết định có hoàn thành hay không.
  const markItemScrolled = useCallback(
    async (itemId: string): Promise<{ isCompleted: boolean }> => {
      if (!user) return { isCompleted: false };
      const wasCompleted = Boolean(progressMap[itemId]?.isCompleted);
      try {
        const { progress } = await apiRequest<{
          progress: Parameters<typeof applyServerProgress>[1];
        }>("/api/progress", { method: "POST", body: { itemId, hasScrolledBottom: true } });
        applyServerProgress(itemId, progress);
        if (progress.isCompleted && !wasCompleted) {
          showToast(tt("chapterCompleted"), "success");
          notifyCompletion(itemId, progress.completedAt);
        }
        return { isCompleted: progress.isCompleted };
      } catch (err) {
        console.warn("Không lưu được tiến độ:", err);
        return { isCompleted: wasCompleted };
      }
    },
    [user, progressMap, applyServerProgress, showToast]
  );

  // Nộp bài: server chấm điểm bằng đáp án trong DB
  const submitItemQuiz = useCallback(
    async (
      itemId: string,
      userAnswers: Record<string, string[]>
    ): Promise<QuizGradeResponse> => {
      const gradeResult = await apiRequest<QuizGradeResponse>("/api/quiz/grade", {
        method: "POST",
        body: { itemId, userAnswers },
      });

      if (!user) {
        showToast(tt("guestNotSaved"), "info");
        return gradeResult;
      }

      // Lấy trạng thái hoàn thành chính thức từ server (đã tính cả điều kiện cuộn bài)
      let isCompleted = gradeResult.isCompleted;
      const wasCompleted = Boolean(progressMap[itemId]?.isCompleted);
      try {
        const { progress } = await apiRequest<{
          progress: Parameters<typeof applyServerProgress>[1];
        }>("/api/progress", {
          method: "POST",
          body: { itemId, highestQuizScore: gradeResult.scorePercent },
        });
        applyServerProgress(itemId, progress);
        isCompleted = progress.isCompleted;
      } catch (err) {
        console.warn("Không đồng bộ được tiến độ sau khi nộp bài:", err);
      }

      const attempt: QuizAttemptRecord = {
        id: `att_${Date.now()}`,
        userId: user.uid,
        itemId,
        scorePercent: gradeResult.scorePercent,
        isPassed: gradeResult.isPassed,
        status: gradeResult.status,
        createdAt: new Date().toISOString(),
      };
      setQuizAttempts((prev) => [attempt, ...prev]);

      if (gradeResult.requiresReview || gradeResult.status === "PENDING_REVIEW") {
        emitCompanion("assignment_submitted");
      } else if (gradeResult.isPassed) {
        emitCompanion("quiz_passed", { score: gradeResult.scorePercent });
      } else {
        emitCompanion("quiz_failed", { score: gradeResult.scorePercent });
      }
      if (isCompleted && !wasCompleted) notifyCompletion(itemId, new Date().toISOString(), { quiz: true });

      return { ...gradeResult, isCompleted };
    },
    [user, applyServerProgress, showToast]
  );

  // ───────────────────────── Danh mục (phẳng) ─────────────────────────

  const createCategory = useCallback(
    async (input: {
      name: string;
      slug?: string;
      description?: string;
      icon?: string;
    }): Promise<CategoryRecord> => {
      const name = input.name.trim();
      if (!name) throw new Error(tt("categoryNameRequired"));

      const { category } = await apiRequest<{ category: CategoryRecord }>("/api/categories", {
        method: "POST",
        body: { ...input, name },
      });
      setCategories((prev) => [...prev, category]);
      showToast(tt("categoryCreated", { name }), "success");
      return category;
    },
    [showToast]
  );

  const updateCategory = useCallback(
    async (categoryId: string, patch: Partial<CategoryRecord>) => {
      const { category } = await apiRequest<{ category: CategoryRecord }>("/api/categories", {
        method: "PUT",
        body: { id: categoryId, ...patch },
      });
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? category : c)));
      showToast(tt("categoryUpdated"), "success");
    },
    [showToast]
  );

  // Xóa danh mục chỉ gỡ nhãn khỏi các khóa học, không xóa khóa học
  const deleteCategory = useCallback(
    async (categoryId: string) => {
      await apiRequest(`/api/categories?id=${encodeURIComponent(categoryId)}`, {
        method: "DELETE",
      });
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      setCourses((prev) =>
        prev.map((c) => ({ ...c, categoryIds: c.categoryIds.filter((id) => id !== categoryId) }))
      );
      showToast(tt("categoryDeleted"), "info");
    },
    [showToast]
  );

  // ───────────────────────── Khóa học ─────────────────────────

  const saveCourse = useCallback(
    async (input: CourseInput): Promise<CourseRecord> => {
      if (!user) throw new Error(tt("loginRequired"));
      const isExisting = Boolean(input.id && courses.some((c) => c.id === input.id));

      const { course } = await apiRequest<{ course: CourseRecord }>("/api/courses", {
        method: isExisting ? "PUT" : "POST",
        body: input,
      });
      setCourses((prev) =>
        [...prev.filter((c) => c.id !== course.id), course].sort((a, b) => a.orderIndex - b.orderIndex)
      );
      showToast(
        isExisting ? tt("courseSaved", { title: course.title }) : tt("courseCreated", { title: course.title }),
        "success"
      );
      return course;
    },
    [user, courses, showToast]
  );

  /** Ném `ApiError` với `requireConfirmation` nếu khóa còn nội dung và `confirm` = false. */
  const deleteCourse = useCallback(
    async (courseId: string, confirm = false) => {
      const target = courses.find((c) => c.id === courseId);
      await apiRequest(
        `/api/courses?id=${encodeURIComponent(courseId)}${confirm ? "&confirm=true" : ""}`,
        { method: "DELETE" }
      );
      const lessonIds = new Set(lessons.filter((l) => l.courseId === courseId).map((l) => l.id));
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setLessons((prev) => prev.filter((l) => l.courseId !== courseId));
      setItems((prev) => prev.filter((i) => !lessonIds.has(i.lessonId)));
      showToast(target ? tt("courseDeletedNamed", { title: target.title }) : tt("courseDeleted"), "info");
    },
    [courses, lessons, showToast]
  );

  const updateCourseStatus = useCallback(
    async (courseId: string, status: ContentStatus) => {
      const { course } = await apiRequest<{ course: CourseRecord }>("/api/courses", {
        method: "PUT",
        body: { id: courseId, status },
      });
      setCourses((prev) => prev.map((c) => (c.id === courseId ? course : c)));
      showToast(tt("courseStatus", { status: statusLabel(status) }), "success");
    },
    [showToast]
  );

  // ───────────────────────── Bài học ─────────────────────────

  const saveLesson = useCallback(
    async (input: LessonInput): Promise<LessonRecord> => {
      if (!user) throw new Error(tt("loginRequired"));
      const isExisting = Boolean(input.id && lessons.some((l) => l.id === input.id));

      const { lesson } = await apiRequest<{ lesson: LessonRecord }>("/api/lessons", {
        method: isExisting ? "PUT" : "POST",
        body: input,
      });
      setLessons((prev) =>
        [...prev.filter((l) => l.id !== lesson.id), lesson].sort((a, b) => a.orderIndex - b.orderIndex)
      );
      showToast(
        isExisting ? tt("lessonSaved", { title: lesson.title }) : tt("lessonCreated", { title: lesson.title }),
        "success"
      );
      return lesson;
    },
    [user, lessons, showToast]
  );

  /** Ném `ApiError` với `requireConfirmation` nếu bài học còn chương và `confirm` = false. */
  const deleteLesson = useCallback(
    async (lessonId: string, confirm = false) => {
      const target = lessons.find((l) => l.id === lessonId);
      await apiRequest(
        `/api/lessons?id=${encodeURIComponent(lessonId)}${confirm ? "&confirm=true" : ""}`,
        { method: "DELETE" }
      );
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      setItems((prev) => prev.filter((i) => i.lessonId !== lessonId));
      showToast(target ? tt("lessonDeletedNamed", { title: target.title }) : tt("lessonDeleted"), "info");
    },
    [lessons, showToast]
  );

  // ───────────────────────── Chương / bài tập ─────────────────────────

  const saveItem = useCallback(
    async (input: ItemInput): Promise<ItemRecord> => {
      if (!user) throw new Error(tt("loginRequired"));
      const isExisting = Boolean(input.id && items.some((i) => i.id === input.id));

      const { item } = await apiRequest<{ item: ItemRecord }>("/api/items", {
        method: isExisting ? "PUT" : "POST",
        body: input,
      });
      setItems((prev) =>
        [...prev.filter((i) => i.id !== item.id), item].sort((a, b) => a.orderIndex - b.orderIndex)
      );
      showToast(
        isExisting ? tt("itemSaved", { title: item.title }) : tt("itemCreated", { title: item.title }),
        "success"
      );
      return item;
    },
    [user, items, showToast]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      const target = items.find((i) => i.id === itemId);
      await apiRequest(`/api/items?id=${encodeURIComponent(itemId)}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      showToast(target ? tt("itemDeletedNamed", { title: target.title }) : tt("itemDeleted"), "info");
    },
    [items, showToast]
  );

  const duplicateItem = useCallback(
    async (itemId: string): Promise<ItemRecord> => {
      if (!user) throw new Error(tt("loginRequired"));
      const target = items.find((i) => i.id === itemId);
      if (!target) throw new Error(tt("itemNotFound"));

      const suffix = Date.now().toString().slice(-4);
      const { item } = await apiRequest<{ item: ItemRecord }>("/api/items", {
        method: "POST",
        body: {
          ...target,
          id: undefined,
          title: `${target.title} ${tt("copySuffix")}`.slice(0, 200),
          slug: `${target.slug}-ban-sao-${suffix}`.slice(0, 220),
          status: "DRAFT",
        },
      });
      setItems((prev) => [...prev, item].sort((a, b) => a.orderIndex - b.orderIndex));
      showToast(tt("itemDuplicated", { title: target.title }), "success");
      return item;
    },
    [user, items, showToast]
  );

  const updateItemStatus = useCallback(
    async (itemId: string, status: ContentStatus) => {
      const { item } = await apiRequest<{ item: ItemRecord }>("/api/items", {
        method: "PUT",
        body: { id: itemId, status },
      });
      setItems((prev) => prev.map((i) => (i.id === itemId ? item : i)));
      showToast(tt("statusUpdated", { status: statusLabel(status) }), "success");
    },
    [showToast]
  );

  const bulkUpdateItems = useCallback(
    async (itemIds: string[], action: "publish" | "unpublish" | "delete") => {
      if (!user || itemIds.length === 0) return;

      const results = await Promise.allSettled(
        itemIds.map((id) =>
          action === "delete"
            ? apiRequest(`/api/items?id=${encodeURIComponent(id)}`, { method: "DELETE" })
            : apiRequest("/api/items", {
                method: "PUT",
                body: { id, status: action === "publish" ? "PUBLISHED" : "DRAFT" },
              })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;

      // Tải lại để trạng thái khớp với những gì server thực sự chấp nhận
      await loadHandbookData();
      if (failed > 0) {
        showToast(tt("bulkPartial", { ok: itemIds.length - failed, total: itemIds.length, failed }), "error");
      } else {
        showToast(tt("bulkDone", { count: itemIds.length }), "success");
      }
    },
    [user, loadHandbookData, showToast]
  );

  // ───────────────────────── Sắp xếp ─────────────────────────

  /**
   * Sắp xếp lại anh em cùng cấp theo danh sách id mới.
   * course: `parentId` bỏ trống · lesson: parentId = courseId · item: parentId = lessonId.
   */
  const reorderChildren = useCallback(
    async (kind: "course" | "lesson" | "item", parentId: string | null, orderedIds: string[]) => {
      const rank = new Map(orderedIds.map((id, index) => [id, index]));
      const apply = <T extends { id: string; orderIndex: number }>(list: T[]): T[] =>
        list
          .map((e) => (rank.has(e.id) ? { ...e, orderIndex: rank.get(e.id)! } : e))
          .sort((a, b) => a.orderIndex - b.orderIndex);

      // Cập nhật lạc quan, hoàn tác bằng cách tải lại nếu server từ chối
      if (kind === "course") setCourses(apply);
      if (kind === "lesson") setLessons(apply);
      if (kind === "item") setItems(apply);

      try {
        await apiRequest("/api/reorder", {
          method: "PUT",
          body: { kind, parentId: parentId ?? undefined, ids: orderedIds },
        });
      } catch (err) {
        await loadHandbookData();
        throw err;
      }
    },
    [loadHandbookData]
  );

  // ───────────────────────── Tương tác ─────────────────────────

  const toggleLikeItem = useCallback(
    async (itemId: string) => {
      if (!user) {
        showToast(tt("likeLoginRequired"), "error");
        return { isLiked: false, likesCount: 0 };
      }
      try {
        const data = await apiRequest<{ isLiked: boolean; likesCount: number }>(
          `/api/items/${itemId}/like`,
          { method: "POST" }
        );
        setItems((prev) =>
          prev.map((i) => {
            if (i.id !== itemId) return i;
            const liked = i.likedUserIds.filter((id) => id !== user.uid);
            return {
              ...i,
              likesCount: data.likesCount,
              likedUserIds: data.isLiked ? [...liked, user.uid] : liked,
              isLiked: data.isLiked,
            };
          })
        );
        return { isLiked: data.isLiked, likesCount: data.likesCount };
      } catch (err) {
        console.error("Toggle like error:", err);
        return { isLiked: false, likesCount: 0 };
      }
    },
    [user, showToast]
  );

  const recordItemView = useCallback(async (itemId: string): Promise<number | null> => {
    try {
      const data = await apiRequest<{ viewsCount: number }>(`/api/items/${itemId}/view`, {
        method: "POST",
      });
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, viewsCount: data.viewsCount } : i))
      );
      return data.viewsCount;
    } catch (err) {
      console.error("Record view error:", err);
      return null;
    }
  }, []);

  // ───────────────────────── Thành viên ─────────────────────────

  const updateUserRoleAndPermissions = useCallback(
    async (
      targetUid: string,
      role: Role,
      department: string,
      managedCourseIds: string[],
      managedGroups?: string[]
    ) => {
      if (!user || user.role !== "ADMIN") {
        throw new Error(tt("adminOnlyPermissions"));
      }

      await apiRequest("/api/members", {
        method: "PUT",
        body: { uid: targetUid, role, department, managedCourseIds, managedGroups },
      });

      setAllUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUid
            ? { ...u, role, department, managedCourseIds, managedGroups: managedGroups ?? u.managedGroups }
            : u
        )
      );
      showToast(tt("memberUpdated"), "success");
    },
    [user, showToast]
  );

  const refreshData = useCallback(() => loadHandbookData(), [loadHandbookData]);

  const deleteMember = useCallback(
    async (uid: string) => {
      await apiRequest(`/api/members?id=${encodeURIComponent(uid)}`, { method: "DELETE" });
      setAllUsers((prev) => prev.filter((u) => u.uid !== uid));
      setAllProgress((prev) => prev.filter((p) => p.userId !== uid));
      setQuizAttempts((prev) => prev.filter((a) => a.userId !== uid));
      showToast(tt("memberDeleted"), "info");
    },
    [showToast, tt]
  );

  const cleanupMemberData = useCallback(
    async (
      uid: string,
      actions: Array<"progress" | "attempts" | "comments">,
      courseId?: string | null
    ) => {
      const { deleted } = await apiRequest<{ deleted: { progress: number; attempts: number; comments: number } }>(
        "/api/members/cleanup",
        { method: "POST", body: { userId: uid, actions, courseId: courseId ?? undefined } }
      );
      await loadHandbookData();
      showToast(tt("memberCleaned", { progress: deleted.progress, attempts: deleted.attempts, comments: deleted.comments }), "success");
      return deleted;
    },
    [loadHandbookData, showToast, tt]
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
        throw new Error(data.error || tt("departmentSaveFailed"));
      }
      const savedDept: DepartmentRecord = data.department;
      setDepartments((prev) => {
        const filtered = prev.filter((d) => d.id !== savedDept.id);
        return [...filtered, savedDept].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      });
      showToast(
        isExisting ? tt("departmentUpdated", { name: savedDept.name }) : tt("departmentAdded", { name: savedDept.name }),
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
        throw new Error(data.error || tt("departmentDeleteFailed"));
      }
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      showToast(tt("departmentDeleted"), "success");
    },
    [showToast]
  );

  const contextValue: HandbookContextValue = {
    user,
    authLoading,
    dataLoading,
    dbError,
    categories,
    courses,
    lessons,
    items,
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
    markItemScrolled,
    submitItemQuiz,
    createCategory,
    updateCategory,
    deleteCategory,
    saveCourse,
    deleteCourse,
    updateCourseStatus,
    saveLesson,
    deleteLesson,
    saveItem,
    deleteItem,
    duplicateItem,
    updateItemStatus,
    bulkUpdateItems,
    reorderChildren,
    toggleLikeItem,
    recordItemView,
    updateUserRoleAndPermissions,
    refreshData,
    deleteMember,
    cleanupMemberData,
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
