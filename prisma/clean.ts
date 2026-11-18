import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const onlyProgress = args.includes("--only-progress") || args.includes("-p");
  const keepCategories = args.includes("--keep-categories");

  console.log("🧹 Starting database cleanup...");

  if (onlyProgress) {
    console.log(
      "👉 Mode: Clearing only progression & interaction data (QuizAttempt, UserProgress, Comment, ItemLike)..."
    );
    const [deletedAttempts, deletedProgress, deletedComments, deletedLikes] =
      await prisma.$transaction([
        prisma.quizAttempt.deleteMany(),
        prisma.userProgress.deleteMany(),
        prisma.comment.deleteMany(),
        prisma.itemLike.deleteMany(),
      ]);
    console.log(`✅ Deleted ${deletedAttempts.count} quiz attempts.`);
    console.log(`✅ Deleted ${deletedProgress.count} user progress records.`);
    console.log(`✅ Deleted ${deletedComments.count} comments.`);
    console.log(`✅ Deleted ${deletedLikes.count} item likes.`);
    console.log("🎉 Progress cleanup completed successfully!");
    return;
  }

  console.log("👉 Mode: Full cleanup of test data and seed records...");

  // Execute in dependency order (foreign keys safe:
  // QuizAttempt -> UserProgress -> Comment -> ItemLike -> Quiz -> UploadedFile
  // -> Item -> Lesson -> CourseCategory -> CourseEditor -> Course)
  const [
    deletedAttempts,
    deletedProgress,
    deletedComments,
    deletedLikes,
    deletedQuizzes,
    deletedUploadedFiles,
    deletedItems,
    deletedLessons,
    deletedCourseCategories,
    deletedCourseEditors,
    deletedCourses,
  ] = await prisma.$transaction([
    prisma.quizAttempt.deleteMany(),
    prisma.userProgress.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.itemLike.deleteMany(),
    prisma.quiz.deleteMany(),
    prisma.uploadedFile.deleteMany(),
    prisma.item.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.courseCategory.deleteMany(),
    prisma.courseEditor.deleteMany(),
    prisma.course.deleteMany(),
  ]);

  console.log(`✅ Deleted ${deletedAttempts.count} quiz attempts.`);
  console.log(`✅ Deleted ${deletedProgress.count} user progress records.`);
  console.log(`✅ Deleted ${deletedComments.count} comments.`);
  console.log(`✅ Deleted ${deletedLikes.count} item likes.`);
  console.log(`✅ Deleted ${deletedQuizzes.count} quizzes.`);
  console.log(`✅ Deleted ${deletedUploadedFiles.count} uploaded file records.`);
  console.log(`✅ Deleted ${deletedItems.count} items.`);
  console.log(`✅ Deleted ${deletedLessons.count} lessons.`);
  console.log(`✅ Deleted ${deletedCourseCategories.count} course-category links.`);
  console.log(`✅ Deleted ${deletedCourseEditors.count} course editor mappings.`);
  console.log(`✅ Deleted ${deletedCourses.count} courses.`);

  // Trong mô hình mới, Category là tag phẳng độc lập (gắn nhiều-nhiều với Course qua CourseCategory).
  // Khi bật --keep-categories, ta giữ lại bảng Category (đã gỡ liên kết CourseCategory ở trên)
  // và xóa sạch cây nội dung Course -> Lesson -> Item để có thể seed lại khóa học mà không mất tag danh mục.
  if (!keepCategories) {
    const deletedCategories = await prisma.category.deleteMany();
    console.log(`✅ Deleted ${deletedCategories.count} categories.`);
  } else {
    console.log("ℹ️ Preserved flat categories as requested (--keep-categories).");
  }

  // Delete non-admin test users (preserve Admin accounts so re-seeding or manual admin login continues working)
  const deletedTestUsers = await prisma.user.deleteMany({
    where: {
      email: {
        notIn: [
          "trieukon1011@gmail.com",
          "admin.bao@mpclub.dev",
          "admin@mpclub.dev",
        ],
      },
    },
  });
  console.log(`✅ Cleaned ${deletedTestUsers.count} test users (Admin accounts preserved).`);

  console.log(
    "🎉 Database cleanup finished cleanly! You can run 'pnpm db:seed' to repopulate fresh data."
  );
}

main()
  .catch((err) => {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
