import { Prisma, PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  estimateReadingTime,
  extractPlainTextFromBlocks,
  INITIAL_CATEGORIES,
  INITIAL_COURSES,
  INITIAL_ITEMS,
  INITIAL_LESSONS,
} from "../lib/seed-data";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Tester@123"; // Default password for test seed accounts

const SEED_DEPARTMENTS = [
  {
    name: "Ban Chủ Nhiệm",
    description: "Điều hành chung và định hướng chiến lược toàn CLB MPC",
    color: "#ef4444",
  },
  {
    name: "Ban Chuyên môn",
    description: "Phụ trách nghiên cứu học thuật, phát triển phần mềm và ra đề thi",
    color: "#f97316",
  },
  {
    name: "Ban Truyền thông",
    description: "Phụ trách hình ảnh, thiết kế ấn phẩm, nội dung fanpage và nhiếp ảnh",
    color: "#3b82f6",
  },
  {
    name: "Ban Sự kiện",
    description: "Phụ trách kịch bản, hậu cần và điều phối tổ chức các sự kiện CLB",
    color: "#10b981",
  },
  {
    name: "Ban Nhân sự",
    description: "Phụ trách tuyển dụng CTV, gắn kết nội bộ và theo dõi điểm hoạt động",
    color: "#a855f7",
  },
];

// 10 Test Accounts:
// - 1 Super Admin + 1 Regular Admin
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
  console.log("🌱 Starting PostgreSQL database seed (Course → Lesson → Item)...");

  // 1. Seed Departments
  for (const dept of SEED_DEPARTMENTS) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {
        description: dept.description,
        color: dept.color,
      },
      create: {
        name: dept.name,
        description: dept.description,
        color: dept.color,
      },
    });
  }
  console.log(`✅ Seeded ${SEED_DEPARTMENTS.length} departments.`);

  // 2. Seed Users
  const defaultHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const userIdByEmail = new Map<string, string>();

  for (const u of SEED_USERS) {
    const passwordHash = u.password
      ? u.password === DEFAULT_PASSWORD
        ? defaultHash
        : await bcrypt.hash(u.password, 10)
      : null;

    const user = await prisma.user.upsert({
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
    userIdByEmail.set(user.email, user.id);
  }
  console.log(`✅ Seeded ${SEED_USERS.length} users successfully with passwords.`);

  const adminUser = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    orderBy: { createdAt: "asc" },
  });
  const defaultAuthorId = adminUser?.id || SEED_USERS[0].id;

  // 3. Seed Flat Categories (orderIndex from 0)
  const categoryIdBySlug = new Map<string, string>();
  for (let idx = 0; idx < INITIAL_CATEGORIES.length; idx++) {
    const c = INITIAL_CATEGORIES[idx];
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        description: c.description,
        icon: c.icon,
        orderIndex: idx,
      },
      create: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        orderIndex: idx,
      },
    });
    categoryIdBySlug.set(category.slug, category.id);
  }
  console.log(`✅ Seeded ${INITIAL_CATEGORIES.length} flat categories.`);

  // 4. Seed Courses (+ CourseCategory + CourseEditor, orderIndex from 0)
  const courseIdBySlug = new Map<string, string>();
  let courseCategoryCount = 0;
  let courseEditorCount = 0;

  for (let idx = 0; idx < INITIAL_COURSES.length; idx++) {
    const c = INITIAL_COURSES[idx];
    const allowedGroups = c.allowedGroups as unknown as Prisma.InputJsonValue;

    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: {
        title: c.title,
        summary: c.summary,
        coverImage: c.coverImage || null,
        status: c.status,
        orderIndex: idx,
        sequential: c.sequential,
        visibility: c.visibility,
        audience: c.audience,
        allowedGroups,
        updaterId: defaultAuthorId,
      },
      create: {
        id: c.id,
        title: c.title,
        slug: c.slug,
        summary: c.summary,
        coverImage: c.coverImage || null,
        status: c.status,
        orderIndex: idx,
        sequential: c.sequential,
        visibility: c.visibility,
        audience: c.audience,
        allowedGroups,
        authorId: defaultAuthorId,
        updaterId: defaultAuthorId,
      },
    });
    courseIdBySlug.set(course.slug, course.id);

    // Link Course ↔ Category via CourseCategory
    const resolvedCategoryIds = c.categorySlugs
      .map((slug) => categoryIdBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    await prisma.courseCategory.deleteMany({
      where: {
        courseId: course.id,
        categoryId: { notIn: resolvedCategoryIds },
      },
    });

    for (const categoryId of resolvedCategoryIds) {
      await prisma.courseCategory.upsert({
        where: {
          courseId_categoryId: {
            courseId: course.id,
            categoryId,
          },
        },
        update: {},
        create: {
          courseId: course.id,
          categoryId,
        },
      });
      courseCategoryCount++;
    }

    // Assign EDITOR accounts to CourseEditor
    const editorEmails = c.editorEmails ?? [];
    for (const email of editorEmails) {
      const editorUserId = userIdByEmail.get(email);
      if (!editorUserId) continue;

      await prisma.courseEditor.upsert({
        where: {
          userId_courseId: {
            userId: editorUserId,
            courseId: course.id,
          },
        },
        update: {},
        create: {
          userId: editorUserId,
          courseId: course.id,
        },
      });
      courseEditorCount++;
    }
  }
  console.log(
    `✅ Seeded ${INITIAL_COURSES.length} courses (${courseCategoryCount} category links, ${courseEditorCount} editor assignments).`
  );

  // 5. Seed Lessons (orderIndex from 0 per course, upsert by courseId_slug)
  const lessonIdByKey = new Map<string, string>();
  const lessonOrderByCourse = new Map<string, number>();

  for (const l of INITIAL_LESSONS) {
    const courseId = courseIdBySlug.get(l.courseSlug);
    if (!courseId) {
      throw new Error(`Course slug "${l.courseSlug}" not found for lesson "${l.slug}"`);
    }

    const orderIndex = lessonOrderByCourse.get(courseId) ?? 0;
    lessonOrderByCourse.set(courseId, orderIndex + 1);

    const lesson = await prisma.lesson.upsert({
      where: {
        courseId_slug: {
          courseId,
          slug: l.slug,
        },
      },
      update: {
        title: l.title,
        summary: l.summary,
        coverImage: l.coverImage || null,
        orderIndex,
        isPublished: l.isPublished,
        requirePrevious: l.requirePrevious,
      },
      create: {
        id: l.id,
        courseId,
        title: l.title,
        slug: l.slug,
        summary: l.summary,
        coverImage: l.coverImage || null,
        orderIndex,
        isPublished: l.isPublished,
        requirePrevious: l.requirePrevious,
      },
    });
    lessonIdByKey.set(`${l.courseSlug}:${l.slug}`, lesson.id);
  }
  console.log(`✅ Seeded ${INITIAL_LESSONS.length} lessons.`);

  // 6. Seed Items & Quizzes (orderIndex from 0 per lesson, upsert by lessonId_slug)
  const itemOrderByLesson = new Map<string, number>();
  let quizCount = 0;

  for (const it of INITIAL_ITEMS) {
    const lessonId = lessonIdByKey.get(`${it.courseSlug}:${it.lessonSlug}`);
    if (!lessonId) {
      throw new Error(
        `Lesson "${it.courseSlug}:${it.lessonSlug}" not found for item "${it.slug}"`
      );
    }

    const orderIndex = itemOrderByLesson.get(lessonId) ?? 0;
    itemOrderByLesson.set(lessonId, orderIndex + 1);

    const plainText = extractPlainTextFromBlocks(it.content);
    const readingTime = estimateReadingTime(plainText, it.content.length);
    const contentJson = it.content as unknown as Prisma.InputJsonValue;
    const attachmentsJson = it.attachments as unknown as Prisma.InputJsonValue;
    const passScorePercent = it.passScorePercent > 0 ? it.passScorePercent : null;

    const item = await prisma.item.upsert({
      where: {
        lessonId_slug: {
          lessonId,
          slug: it.slug,
        },
      },
      update: {
        type: it.type,
        title: it.title,
        summary: it.summary,
        orderIndex,
        status: it.status,
        isRequired: it.isRequired,
        requirePrevious: it.requirePrevious,
        requireScrollToBottom: it.requireScrollToBottom,
        passScorePercent,
        content: contentJson,
        plainText,
        readingTime,
        attachments: attachmentsJson,
        updaterId: defaultAuthorId,
      },
      create: {
        id: it.id,
        lessonId,
        type: it.type,
        title: it.title,
        slug: it.slug,
        summary: it.summary,
        orderIndex,
        status: it.status,
        isRequired: it.isRequired,
        requirePrevious: it.requirePrevious,
        requireScrollToBottom: it.requireScrollToBottom,
        passScorePercent,
        content: contentJson,
        plainText,
        readingTime,
        attachments: attachmentsJson,
        authorId: defaultAuthorId,
        updaterId: defaultAuthorId,
      },
    });

    // Item of type QUIZ or ASSIGNMENT must have a Quiz attached (1-1 via itemId)
    if (
      it.type === "QUIZ" ||
      it.type === "ASSIGNMENT" ||
      it.quizQuestions.length > 0
    ) {
      const quizPassScore = it.passScorePercent > 0 ? it.passScorePercent : 80;
      const questionsJson = it.quizQuestions as unknown as Prisma.InputJsonValue;

      await prisma.quiz.upsert({
        where: { itemId: item.id },
        update: {
          title: it.quizTitle ?? it.title,
          description: it.quizDescription ?? it.summary,
          durationMinutes: it.quizDurationMinutes ?? null,
          passScorePercent: quizPassScore,
          maxAttempts: it.quizMaxAttempts ?? null,
          isExam: it.quizIsExam ?? false,
          questions: questionsJson,
        },
        create: {
          itemId: item.id,
          title: it.quizTitle ?? it.title,
          description: it.quizDescription ?? it.summary,
          durationMinutes: it.quizDurationMinutes ?? null,
          passScorePercent: quizPassScore,
          maxAttempts: it.quizMaxAttempts ?? null,
          isExam: it.quizIsExam ?? false,
          questions: questionsJson,
        },
      });
      quizCount++;
    }
  }

  console.log(`✅ Seeded ${INITIAL_ITEMS.length} items and ${quizCount} quizzes.`);
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
