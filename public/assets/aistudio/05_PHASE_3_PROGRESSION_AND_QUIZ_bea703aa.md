# 05. GIAI ĐOẠN 3: ENGINE LỘ TRÌNH ĐỌC, CUỘN TRANG & CHẤM ĐIỂM QUIZ

Đây là phần tạo nên sự khác biệt của Sổ tay MPC so với các trang Docs thông thường:
- **Kiểm soát lộ trình đọc (`Sequential Unlock`):** Bắt buộc hoàn thành bài trước mới mở được bài sau.
- **Xác thực đã đọc hết trang (`Scroll-to-Bottom + Min Read Time`):** Ngăn việc mở bài ra rồi kéo vèo xuống đáy trong 1 giây.
- **Chấm điểm Bài tập cuối bài (`Server-Side Quiz Grader`):** Đáp án đúng chỉ nằm trên Server, không lộ ở tab Network/F12.

---

## 1. Thuật toán Kiểm tra Mở khóa Lộ trình (`src/lib/progression.ts`)

Hàm này được gọi ở Server Component trước khi render bất kỳ bài viết nào và dùng để hiển thị icon `🔒` / `✅` trên Sidebar:

```typescript
// src/lib/progression.ts
import { prisma } from "@/lib/prisma";

export async function checkArticleAccess(userId: string, articleId: string) {
  const currentArticle = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      categoryId: true,
      orderIndex: true,
      requirePrevious: true,
    },
  });

  if (!currentArticle) {
    return { allowed: false, reason: "NOT_FOUND", blockingArticle: null };
  }

  // Nếu bài viết KHÔNG yêu cầu đọc theo lộ trình -> Mở khóa tự do
  if (!currentArticle.requirePrevious) {
    return { allowed: true, reason: null, blockingArticle: null };
  }

  // Tìm bài viết đứng ngay trước đó trong cùng thư mục (cùng categoryId)
  const previousArticle = await prisma.article.findFirst({
    where: {
      categoryId: currentArticle.categoryId,
      isPublished: true,
      orderIndex: { lt: currentArticle.orderIndex },
    },
    orderBy: { orderIndex: "desc" },
    select: { id: true, title: true, slug: true },
  });

  // Nếu đây là bài đầu tiên trong thư mục -> Mở khóa
  if (!previousArticle) {
    return { allowed: true, reason: null, blockingArticle: null };
  }

  // Kiểm tra xem thành viên đã hoàn thành bài đứng trước chưa
  const prevProgress = await prisma.userProgress.findUnique({
    where: {
      userId_articleId: {
        userId,
        articleId: previousArticle.id,
      },
    },
    select: { isCompleted: true },
  });

  if (!prevProgress?.isCompleted) {
    return {
      allowed: false,
      reason: "PREVIOUS_INCOMPLETE",
      blockingArticle: previousArticle,
    };
  }

  return { allowed: true, reason: null, blockingArticle: null };
}
```

---

## 2. Component Theo dõi Cuộn hết Trang (`src/components/reader/ScrollTracker.tsx`)

Sử dụng `IntersectionObserver` kết hợp với bộ đếm thời gian tối thiểu (ví dụ: 15 giây cho bài ngắn, hoặc tính theo `readingTime`) để xác nhận thành viên thực sự có đọc bài:

```tsx
// src/components/reader/ScrollTracker.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { markScrolledToBottom } from "@/actions/progress.actions";
import { CheckCircle2, Clock } from "lucide-react";

interface Props {
  articleId: string;
  requireScroll: boolean;
  initialScrolled: boolean;
  minReadSeconds?: number; // Mặc định 15 giây để chống kéo chuột cái vèo xuống đáy
  onScrollVerified?: () => void;
}

export function ScrollTracker({
  articleId,
  requireScroll,
  initialScrolled,
  minReadSeconds = 15,
  onScrollVerified,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [hasScrolled, setHasScrolled] = useState(initialScrolled);
  const [timePassed, setTimePassed] = useState(initialScrolled);
  const [isBottomReached, setIsBottomReached] = useState(false);

  // 1. Bộ đếm thời gian tối thiểu trên trang
  useEffect(() => {
    if (hasScrolled || !requireScroll) return;
    const timer = setTimeout(() => {
      setTimePassed(true);
    }, minReadSeconds * 1000);
    return () => clearTimeout(timer);
  }, [hasScrolled, requireScroll, minReadSeconds]);

  // 2. Intersection Observer theo dõi điểm cuối bài viết
  useEffect(() => {
    if (hasScrolled || !requireScroll || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsBottomReached(true);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasScrolled, requireScroll]);

  // 3. Khi thỏa mãn CẢ HAI: Đã chạm đáy + Đủ thời gian đọc tối thiểu
  useEffect(() => {
    if (!hasScrolled && isBottomReached && timePassed) {
      setHasScrolled(true);
      markScrolledToBottom(articleId).then(() => {
        onScrollVerified?.();
      });
    }
  }, [isBottomReached, timePassed, hasScrolled, articleId, onScrollVerified]);

  if (!requireScroll) return null;

  return (
    <div ref={sentinelRef} className="my-8 rounded-lg border border-border bg-background-subtle p-4">
      {hasScrolled ? (
        <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <span>Bạn đã hoàn thành việc đọc nội dung bài viết này.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-5 w-5 animate-pulse text-amber-500" />
          <span>
            {isBottomReached && !timePassed
              ? "Bạn cuộn hơi nhanh! Hãy đọc kỹ lại nội dung thêm vài giây để mở khóa..."
              : "Hãy đọc và cuộn hết bài viết này để mở khóa bước tiếp theo."}
          </span>
        </div>
      )}
    </div>
  );
}
```

---

## 3. Server Actions: Lưu Cuộn Trang & Chấm Điểm Quiz (`src/actions/progress.actions.ts`)

```typescript
// src/actions/progress.actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { QuizQuestion } from "@/types";
import { revalidatePath } from "next/cache";

// 1. Đánh dấu đã cuộn tới cuối trang
export async function markScrolledToBottom(articleId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { passScorePercent: true, slug: true },
  });
  if (!article) throw new Error("Article not found");

  const existing = await prisma.userProgress.findUnique({
    where: { userId_articleId: { userId, articleId } },
  });

  // Kiểm tra xem bài này có yêu cầu làm Quiz không
  const quizPassed =
    article.passScorePercent === null ||
    (existing?.highestQuizScore ?? 0) >= article.passScorePercent;

  const isCompleted = true && quizPassed;

  await prisma.userProgress.upsert({
    where: { userId_articleId: { userId, articleId } },
    update: {
      hasScrolledBottom: true,
      isCompleted,
      completedAt: isCompleted && !existing?.isCompleted ? new Date() : existing?.completedAt,
    },
    create: {
      userId,
      articleId,
      hasScrolledBottom: true,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    },
  });

  revalidatePath(`/docs/${article.slug}`);
  return { isCompleted };
}

// 2. Chấm điểm Bài tập cuối bài (Quiz) trên Server
export async function submitQuizAttempt(
  articleId: string,
  userAnswers: Record<string, string[]> // { [questionId]: [selectedOptionId1, ...] }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { quiz: true },
  });

  if (!article || !article.quiz) {
    throw new Error("Bài viết này không có bài tập.");
  }

  const questions = (article.quiz.questions as unknown as QuizQuestion[]) || [];
  if (questions.length === 0) {
    throw new Error("Đề bài trống.");
  }

  let correctCount = 0;
  const feedback: Record<string, { isCorrect: boolean; explanation?: string }> = {};

  for (const q of questions) {
    const submitted = (userAnswers[q.id] || []).sort();
    const expected = [...q.correctOptionIds].sort();

    const isCorrect =
      submitted.length === expected.length &&
      submitted.every((val, index) => val === expected[index]);

    if (isCorrect) correctCount++;
    feedback[q.id] = {
      isCorrect,
      explanation: q.explanation,
    };
  }

  const scorePercent = Math.round((correctCount / questions.length) * 100);
  const requiredScore = article.passScorePercent ?? 0;
  const isPassed = scorePercent >= requiredScore;

  // Lưu lịch sử làm bài
  await prisma.quizAttempt.create({
    data: {
      userId,
      quizId: article.quiz.id,
      scorePercent,
      answers: userAnswers,
      isPassed,
    },
  });

  // Cập nhật UserProgress
  const existing = await prisma.userProgress.findUnique({
    where: { userId_articleId: { userId, articleId } },
  });

  const newHighestScore = Math.max(existing?.highestQuizScore ?? 0, scorePercent);
  const scrollOk = !article.requireScrollToBottom || (existing?.hasScrolledBottom ?? false);
  const isCompleted = scrollOk && newHighestScore >= requiredScore;

  await prisma.userProgress.upsert({
    where: { userId_articleId: { userId, articleId } },
    update: {
      highestQuizScore: newHighestScore,
      isCompleted,
      completedAt: isCompleted && !existing?.isCompleted ? new Date() : existing?.completedAt,
    },
    create: {
      userId,
      articleId,
      hasScrolledBottom: !article.requireScrollToBottom,
      highestQuizScore: scorePercent,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    },
  });

  revalidatePath(`/docs/${article.slug}`);

  return {
    scorePercent,
    requiredScore,
    isPassed,
    isCompleted,
    feedback,
  };
}
```
