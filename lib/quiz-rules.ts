import type { ItemType, QuizQuestionType } from "@/types";

/**
 * Chương (CONTENT) chỉ để đọc, không gắn bài kiểm tra.
 * QUIZ = trắc nghiệm (chấm tự động); ASSIGNMENT = bài tập (tự luận/nộp file/code, chấm tay).
 */
export const ALLOWED_QUESTION_TYPES: Record<ItemType, readonly QuizQuestionType[]> = {
  CONTENT: [],
  QUIZ: ["single", "multiple", "fill_blank", "scale"],
  ASSIGNMENT: ["essay", "file_upload", "code_submission"],
};

export function hasQuiz(type: ItemType): boolean {
  return type !== "CONTENT";
}

/** Trả về các loại câu hỏi không hợp lệ với `type` (rỗng = hợp lệ). */
export function findInvalidQuestionTypes(
  type: ItemType,
  questions: ReadonlyArray<{ type?: QuizQuestionType }>
): QuizQuestionType[] {
  const allowed = ALLOWED_QUESTION_TYPES[type];
  const bad = questions
    .map((q) => q.type ?? "single")
    .filter((t) => !allowed.includes(t));
  return Array.from(new Set(bad));
}
