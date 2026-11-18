import type { Metadata } from "next";
import { ArticleClientPage } from "@/components/reader/ArticleClientPage";
import { learnMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{
    course: string;
    lesson: string;
    item: string;
  }>;
}

/**
 * Metadata + link preview: chỉ lộ tiêu đề/đoạn trích khi nội dung công khai
 * (xem `resolvePreview` trong lib/seo.ts); còn lại là thẻ "nội dung nội bộ" chung.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { course, lesson, item } = await params;
  return learnMetadata(`/learn/${course}/${lesson}/${item}`, course, lesson, item);
}

/**
 * Không truyền dữ liệu chương từ server xuống: nếu làm vậy, nội dung nháp/nội bộ và ĐÁP ÁN QUIZ
 * sẽ nằm trong HTML gửi cho mọi người. Client chỉ dùng dữ liệu từ /api/handbook/data
 * (đã lọc theo quyền người xem, đáp án đã bị loại bỏ).
 */
export default async function LearnItemPage({ params }: PageProps) {
  const { course, lesson, item } = await params;

  return <ArticleClientPage courseSlug={course} lessonSlug={lesson} itemSlug={item} />;
}
