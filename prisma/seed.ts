import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { INITIAL_CATEGORIES, INITIAL_ARTICLES } from "../lib/seed-data";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Tester@123"; // Default password for test seed accounts

// 9 Test Accounts:
// - 1 Admin (in addition to SUPER_ADMIN_EMAILS from .env)
// - 2 Content Editors
// - 6 Members distributed across 3 departments: Ban Chuyên môn, Ban Truyền thông, Ban Sự kiện
const SEED_USERS = [
  // 1. Super Admin from .env (Có thể đăng nhập bằng SSO hoặc mật khẩu Tester@123)
  {
    id: "usr_superadmin_trieu",
    ssoId: "mpc_sso_superadmin",
    email: "trieukon1011@gmail.com",
    fullName: "Nguyễn Thanh Triều",
    department: "Ban Chủ Nhiệm",
    role: Role.ADMIN,
    noPassword: false, // Sẵn mật khẩu Tester@123
    password: DEFAULT_PASSWORD,
  },
  // 2. Regular Admin
  {
    id: "usr_admin_bao",
    ssoId: "mpc_seed_admin_1",
    email: "admin.bao@mpclub.dev",
    fullName: "Nguyễn Gia Bảo",
    department: "Ban Chủ Nhiệm",
    role: Role.ADMIN,
    noPassword: false,
    password: DEFAULT_PASSWORD,
  },
  // 3. Content Editor 1 (Tech)
  {
    id: "usr_editor_quan",
    ssoId: "mpc_seed_editor_1",
    email: "editor.quan@mpclub.dev",
    fullName: "Trần Minh Quân",
    department: "Ban Chuyên môn",
    role: Role.EDITOR,
    noPassword: false,
    password: DEFAULT_PASSWORD,
  },
  // 4. Content Editor 2 (Media)
  {
    id: "usr_editor_linh",
    ssoId: "mpc_seed_editor_2",
    email: "editor.linh@mpclub.dev",
    fullName: "Lê Khánh Linh",
    department: "Ban Truyền thông",
    role: Role.EDITOR,
    noPassword: false,
    password: DEFAULT_PASSWORD,
  },
  // 5. Member 1 - Ban Chuyên môn
  {
    id: "usr_member_dev1",
    ssoId: "mpc_seed_mem_1",
    email: "dev.tuan@mpclub.dev",
    fullName: "Võ Tuấn Anh",
    department: "Ban Chuyên môn",
    role: Role.MEMBER,
    noPassword: false,
    password: DEFAULT_PASSWORD,
  },
  // 6. Member 2 - Ban Chuyên môn
  {
    id: "usr_member_dev2",
    ssoId: "mpc_seed_mem_2",
    email: "dev.huy@mpclub.dev",
    fullName: "Đỗ Quốc Huy",
    department: "Ban Chuyên môn",
    role: Role.MEMBER,
    noPassword: false,
    password: DEFAULT_PASSWORD,
  },
  // 7. Member 3 - Ban Truyền thông
  {
    id: "usr_member_media1",
    ssoId: "mpc_seed_mem_3",
    email: "media.mai@mpclub.dev",
    fullName: "Hoàng Tuyết Mai",
    department: "Ban Truyền thông",
    role: Role.MEMBER,
    noPassword: false,
    password: DEFAULT_PASSWORD,
  },
  // 8. Member 4 - Ban Truyền thông
  {
    id: "usr_member_media2",
    ssoId: "mpc_seed_mem_4",
    email: "media.khoa@mpclub.dev",
    fullName: "Phan Đăng Khoa",
    department: "Ban Truyền thông",
    role: Role.MEMBER,
    noPassword: false,
    password: DEFAULT_PASSWORD,
  },
  // 9. Member 5 - Ban Sự kiện
  {
    id: "usr_member_event1",
    ssoId: "mpc_seed_mem_5",
    email: "event.nam@mpclub.dev",
    fullName: "Phạm Hoàng Nam",
    department: "Ban Sự kiện",
    role: Role.MEMBER,
    noPassword: false,
    password: DEFAULT_PASSWORD,
  },
  // 10. Member 6 - Ban Sự kiện
  {
    id: "usr_member_event2",
    ssoId: "mpc_seed_mem_6",
    email: "event.ha@mpclub.dev",
    fullName: "Ngô Thu Hà",
    department: "Ban Sự kiện",
    role: Role.MEMBER,
    noPassword: false,
    password: DEFAULT_PASSWORD,
  },
];

async function main() {
  console.log("🌱 Starting PostgreSQL database seed with 9 test accounts + 1 SuperAdmin...");

  // Pre-calculate hash for default password
  const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Seed Users
  for (const u of SEED_USERS) {
    const passwordHash = u.password ? await bcrypt.hash(u.password, 10) : null;

    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        department: u.department,
        role: u.role,
        noPassword: u.noPassword,
        ...(passwordHash ? { passwordHash } : {}),
      },
      create: {
        id: u.id,
        ssoId: u.ssoId,
        email: u.email,
        fullName: u.fullName,
        department: u.department,
        role: u.role,
        noPassword: u.noPassword,
        passwordHash,
      },
    });
  }
  console.log(`✅ Seeded ${SEED_USERS.length} users successfully with passwords.`);

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
