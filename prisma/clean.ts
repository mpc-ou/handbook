import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const onlyProgress = args.includes("--only-progress") || args.includes("-p");
  const keepCategories = args.includes("--keep-categories");

  console.log("🧹 Starting database cleanup...");

  if (onlyProgress) {
    console.log("👉 Mode: Clearing only test progression data (Quiz attempts, User progress)...");
    const [deletedAttempts, deletedProgress] = await prisma.$transaction([
      prisma.quizAttempt.deleteMany(),
      prisma.userProgress.deleteMany(),
    ]);
    console.log(`✅ Deleted ${deletedAttempts.count} quiz attempts.`);
    console.log(`✅ Deleted ${deletedProgress.count} user progress records.`);
    console.log("🎉 Progress cleanup completed successfully!");
    return;
  }

  console.log("👉 Mode: Full cleanup of test data and seed records...");

  // Execute in dependency order (foreign keys safe)
  const [
    deletedAttempts,
    deletedProgress,
    deletedComments,
    deletedLikes,
    deletedQuizzes,
    deletedCategoryEditors,
    deletedArticles,
  ] = await prisma.$transaction([
    prisma.quizAttempt.deleteMany(),
    prisma.userProgress.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.articleLike.deleteMany(),
    prisma.quiz.deleteMany(),
    prisma.categoryEditor.deleteMany(),
    prisma.article.deleteMany(),
  ]);

  console.log(`✅ Deleted ${deletedAttempts.count} quiz attempts.`);
  console.log(`✅ Deleted ${deletedProgress.count} user progress records.`);
  console.log(`✅ Deleted ${deletedComments.count} comments.`);
  console.log(`✅ Deleted ${deletedLikes.count} article likes.`);
  console.log(`✅ Deleted ${deletedQuizzes.count} quizzes.`);
  console.log(`✅ Deleted ${deletedCategoryEditors.count} category editor mappings.`);
  console.log(`✅ Deleted ${deletedArticles.count} articles.`);

  if (!keepCategories) {
    const deletedCategories = await prisma.category.deleteMany();
    console.log(`✅ Deleted ${deletedCategories.count} categories.`);
  } else {
    console.log("ℹ️ Preserved categories as requested (--keep-categories).");
  }

  // Delete non-admin test users if flag provided or clean all non-bcn
  const deletedTestUsers = await prisma.user.deleteMany({
    where: {
      email: {
        notIn: ["trieukon1011@gmail.com", "admin@mpclub.dev"],
      },
    },
  });
  console.log(`✅ Cleaned ${deletedTestUsers.count} test users (Admin accounts preserved).`);

  console.log("🎉 Database cleanup finished cleanly! You can run 'pnpm db:seed' to repopulate fresh data.");
}

main()
  .catch((err) => {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

