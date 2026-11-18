/**
 * Lỗi từ API (HTTP status không ổn hoặc `success: false`).
 * `data` giữ nguyên payload, ví dụ `{ requireConfirmation, lessonCount, itemCount }`
 * khi xóa Course/Lesson còn nội dung (HTTP 409).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "ApiError";
  }

  get requireConfirmation(): boolean {
    return this.data.requireConfirmation === true;
  }
}

/** Gọi API JSON, ném `ApiError` với thông điệp của server khi thất bại. */
export async function apiRequest<T = Record<string, unknown>>(
  url: string,
  options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok || data.success === false) {
    const message =
      typeof data.error === "string" && data.error
        ? data.error
        : `Yêu cầu thất bại (${res.status}).`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}
