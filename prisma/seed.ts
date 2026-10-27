import { PrismaClient, Role } from "@prisma/client";
import { INITIAL_CATEGORIES, INITIAL_ARTICLES } from "../lib/seed-data";

const prisma = new PrismaClient();

const SEED_USERS = [
  {
    id: "usr_admin_trieu",
    ssoId: "mpc_101",
    email: "trieukon1011@gmail.com",
    fullName: "Nguyễn Thanh Triều",
    department: "Ban Chủ Nhiệm",
    role: Role.ADMIN,
  },
  {
    id: "usr_minh_quan",
    ssoId: "mpc_102",
    email: "quan.tran@mpclub.dev",
    fullName: "Trần Minh Quân",
    department: "Ban Chuyên môn",
    role: Role.EDITOR,
  },
  {
    id: "usr_khanh_linh",
    ssoId: "mpc_103",
    email: "linh.le@mpclub.dev",
    fullName: "Lê Khánh Linh",
    department: "Ban Truyền thông",
    role: Role.EDITOR,
  },
  {
    id: "usr_hoang_nam",
    ssoId: "mpc_104",
    email: "nam.pham@mpclub.dev",
    fullName: "Phạm Hoàng Nam",
    department: "Ban Sự kiện",
    role: Role.MEMBER,
  },
];

async function main() {
  console.log("🌱 Starting PostgreSQL database seed...");

  // 1. Seed Users
  for (const u of SEED_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        department: u.department,
        role: u.role,
      },
      create: {
        id: u.id,
        ssoId: u.ssoId,
        email: u.email,
        fullName: u.fullName,
        department: u.department,
        role: u.role,
      },
    });
  }
  console.log(`✅ Seeded ${SEED_USERS.length} users.`);

  // 2. Seed Root Categories (depth = 1)
  const rootCats = INITIAL_CATEGORIES.filter((c) => c.depth === 1);
  for (const c of rootCats) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        orderIndex: c.orderIndex,
        isPublished: c.isPublished,
        depth: c.depth,
      },
      create: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        orderIndex: c.orderIndex,
        isPublished: c.isPublished,
        depth: c.depth,
      },
    });
  }

  // 3. Seed Subcategories (depth = 2)
  const subCats = INITIAL_CATEGORIES.filter((c) => c.depth === 2);
  for (const c of subCats) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        orderIndex: c.orderIndex,
        isPublished: c.isPublished,
        depth: c.depth,
        parentId: c.parentId || null,
      },
      create: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        orderIndex: c.orderIndex,
        isPublished: c.isPublished,
        depth: c.depth,
        parentId: c.parentId || null,
      },
    });
  }
  console.log(`✅ Seeded ${INITIAL_CATEGORIES.length} categories.`);

  // 4. Seed Articles
  const adminUser = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });
  const defaultAuthorId = adminUser?.id || SEED_USERS[0].id;

  for (const a of INITIAL_ARTICLES) {
    const article = await prisma.article.upsert({
      where: { id: a.id },
      update: {
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        coverImage: a.coverImage || null,
        content: a.content as any,
        plainText: a.plainText || "",
        readingTime: a.readingTime || 1,
        attachments: (a.attachments || []) as any,
        categoryId: a.categoryId,
        orderIndex: a.orderIndex,
        isPublished: a.isPublished,
        requirePrevious: a.requirePrevious,
        requireScrollToBottom: a.requireScrollToBottom,
        passScorePercent: a.passScorePercent || 0,
        updaterId: defaultAuthorId,
      },
      create: {
        id: a.id,
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        coverImage: a.coverImage || null,
        content: a.content as any,
        plainText: a.plainText || "",
        readingTime: a.readingTime || 1,
        attachments: (a.attachments || []) as any,
        categoryId: a.categoryId,
        orderIndex: a.orderIndex,
        isPublished: a.isPublished,
        requirePrevious: a.requirePrevious,
        requireScrollToBottom: a.requireScrollToBottom,
        passScorePercent: a.passScorePercent || 0,
        authorId: defaultAuthorId,
        updaterId: defaultAuthorId,
      },
    });

    // Seed Quiz if questions exist
    if (a.quizQuestions && a.quizQuestions.length > 0) {
      await prisma.quiz.upsert({
        where: { articleId: article.id },
        update: {
          questions: a.quizQuestions as any,
        },
        create: {
          articleId: article.id,
          questions: a.quizQuestions as any,
        },
      });
    }
  }
  console.log(`✅ Seeded ${INITIAL_ARTICLES.length} articles with quizzes.`);
  console.log("🎉 PostgreSQL database successfully seeded!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

