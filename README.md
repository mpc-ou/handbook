<div align="center">

# MPClub Handbook & Curriculum LMS

**Official Internal Handbook, Standard Operating Procedures (SOP), and Training Curriculum for Academic Programming Club (MPC)**

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*"Where there are bugs, there is MPC."*

</div>

---

## 🚀 Key Highlights & Features

### 1. 🎓 Training Curriculum & Progressive Learning
- **Course → Lesson → Item**: A course has many lessons; each lesson has chapters and exercises in order. Courses carry one or many flat categories. Covers exist for courses and lessons only.
- **Chapters are read-only; quizzes and assignments are separate items**:
  - `CONTENT` (chapter): reading only, completed by scrolling to the end.
  - `QUIZ`: multiple choice / fill-in / scale, graded automatically on the server.
  - `ASSIGNMENT`: essay / file upload / code, graded manually by staff.
  - Quizzes and assignments are full pages (intro → one question at a time → result), no modals.
- **Flexible learning order**: `Course.sequential` is the default (ordered vs free); a lesson or item can override it.
- **Focused reading**: focus mode, font size/width settings, keyboard shortcuts (`←` `→` `F` `?` `Ctrl+K`), reading progress bar.
- **Motivation**: learning streak, achievements, animated progress rings, a hideable fox companion, and a printable completion certificate per course.
- **Notifications**: a bell and inbox for comments on your chapters (admins get all), replies, @mentions, course completions, and assignments to grade or already graded.
- **Admin progress dashboard** (`/studio/progress`): overall learner progress, a learner × lesson heat-matrix per course, chapter drop-off funnel, CSV export.
- **Search**: instant, typo-tolerant, diacritic-insensitive Vietnamese search (MiniSearch, `Ctrl+K`).
- **Bilingual UI**: Vietnamese and English (cookie-based, no URL prefix). Course content itself is not translated.

### 2. 🔐 Dual Authentication Portal & RBAC
- **Centralized MPC Single Sign-On (OIDC)**: Seamless one-click login connected to `https://auth.mpclub.dev`.
- **Pre-provisioned Email & Password Login**: Secure authentication for internal accounts without opening public self-registration.
- **Smart Password Lifecycle (`noPassword` Flag)**: Accounts created via SSO carry a `noPassword` flag, allowing users to configure a dedicated password on their Profile without needing to enter a fake current password.
- **Toggleable Login Gate**: Configure `EMAIL_LOGIN="enable"` or `"disable"` in `.env` to enforce pure SSO or allow dual login.
- **Multi-Admin Support**: Set `SUPER_ADMIN_EMAIL` as a comma-separated list of protected executive emails.

### 3. ✍️ Studio Workspace (Executive & Editor CMS)
- **Rich Interactive Block Editor**: Built on modern block structures with full markdown support, code syntax highlighting, callouts, and multi-media embeds.
- **Course → Lesson → Item Curriculum**: A course holds many lessons, and each lesson holds chapters and exercises (`Item`: content, quiz, or assignment) in a defined order. Cover images belong to courses and lessons only; items have none. Drag-and-drop reordering at every level (`/studio/curriculum`).
- **Flexible Learning Order**: `Course.sequential` sets the default (ordered vs free); a lesson or item can override it with `requirePrevious`.
- **Flat Categories**: A course can carry one or many categories (tags) for browsing and filtering.
- **Role & Course Permissions**:
  - `ADMIN`: Full operational authority over all courses, categories, publishing, member management (edit, reset learning data, delete) and comment moderation.
  - `EDITOR`: Edit privileges and comment moderation limited to the courses assigned to them; cannot publish.
  - `MEMBER`: Read-only curriculum navigation, assessment submission, commenting, and personal progress tracking.

### 4. ☁️ Cloudinary Asset Tracking & Automated Garbage Collection
- **Orphan File Detection**: Prevents abandoned image uploads from accumulating costs on Cloudinary when authors refresh or close pages without saving. Covers are uploaded to Cloudinary (never stored as base64).
- **Automated Lifecycle / Cron Cleanup**: `POST /api/upload/cleanup?hours=2` sweeps and destroys unused cloud assets permanently.
- **Studio Storage Dashboard** (`/studio/settings`): Live Cloudinary quota insights (Bandwidth, Storage MB, Credits) with one-click manual garbage collection.

### 5. 🔎 SEO & Link Previews (privacy-aware)
- **Only the homepage is indexable.** `robots.txt` blocks search engines everywhere else, and every other page also carries `noindex` (meta + `X-Robots-Tag`).
- **Link previews** (Facebook, Zalo, Slack, Discord, Telegram, X, LinkedIn, WhatsApp) get a generated 1200×630 image plus a short excerpt, but only for *public* content (published course, `PUBLIC` + `FREE`, published lesson/chapter). Anything else — drafts, members-only, group-restricted, or non-existent — returns the same generic "members-only" card, so nothing leaks and existence can't be probed. Quiz and assignment questions are never exposed.
- Set `APP_URL` to the public site URL so canonical links, Open Graph URLs and the sitemap are correct.

---

## 🛠️ Tech Stack Architecture

| Layer | Technologies |
|---|---|
| **Framework** | [Next.js 15 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) |
| **Language** | [TypeScript 5.9](https://www.typescriptlang.org/) (Strict Mode) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI Primitives](https://www.radix-ui.com/) + Lucide Icons |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM 6.4](https://www.prisma.io/) |
| **Authentication** | [Auth.js (NextAuth v5 beta)](https://authjs.dev/) + Custom OIDC & Credentials Provider + `bcryptjs` |
| **Cloud Storage** | [Cloudinary](https://cloudinary.com/) (Direct Signed Uploads + Admin Garbage Collection SDK) |
| **i18n** | [next-intl](https://next-intl.dev/) (vi + en, cookie-based) |
| **Search** | [MiniSearch](https://lucaong.github.io/minisearch/) (client-side, diacritic-insensitive) |
| **Motion & UX** | [motion](https://motion.dev/), `canvas-confetti`, [@dnd-kit](https://dndkit.com/) |
| **Link previews** | `next/og` (ImageResponse) with Plus Jakarta Sans (Vietnamese glyphs) |
| **Date & Time** | [date-fns v4](https://date-fns.org/) + `next-intl` formatters |

> Architecture, data model and conventions: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [CLAUDE.md](CLAUDE.md).

---

## 📦 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `pnpm` (v9 or v10)
- **PostgreSQL Database**: Local PostgreSQL or Cloud instance (Neon, Supabase, Prisma Postgres)

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
# Public URL of the site (canonical links, Open Graph previews, sitemap)
APP_URL="http://localhost:3000"

# Super Admin Emails (comma-separated list)
SUPER_ADMIN_EMAIL="trieukon1011@gmail.com,admin2@mpclub.dev"

# Email + Password Portal Toggle ("enable" or "disable")
EMAIL_LOGIN="enable"
NEXT_PUBLIC_EMAIL_LOGIN="enable"

# Authentication & NextAuth
AUTH_SECRET="your-generated-random-auth-secret"
NEXTAUTH_URL="http://localhost:3000"

# MPC Single Sign-On (OAuth2 / OIDC)
MPC_SSO_ISSUER="https://auth.mpclub.dev"
MPC_SSO_CLIENT_ID="your-mpc-sso-client-id"
MPC_SSO_CLIENT_SECRET="your-mpc-sso-client-secret"

# Cloudinary CDN Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLOUDINARY_UPLOAD_PRESET="your-preset"

# PostgreSQL Database Connection
DATABASE_URL="postgres://user:password@host:5432/dbname"

# Cron Job Protection Secret (Optional for automated webhooks)
CRON_SECRET="your-secret-cron-key"
```

### 3. Installation & Database Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Synchronize database schema with Prisma
pnpm db:push

# 3. Generate Prisma Client
pnpm db:generate

# 4. Populate pre-configured test users & sample curriculum
pnpm db:seed
```

### 4. Running the Application

```bash
# Start local development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Pre-seeded Test Accounts

A complete suite of 10 test accounts is created by `pnpm db:seed` with a shared default password. For privileges and test scopes, see [docs/TEST_ACCOUNT.md](docs/TEST_ACCOUNT.md).

> ⚠️ **Never seed a database that is, or shares data with, production.** The seed uses a publicly documented password for two `ADMIN` accounts. Use a separate development database, and set `EMAIL_LOGIN="disable"` where only SSO should be allowed.

---

## 📜 Database & Maintenance Scripts

```bash
# Populate initial categories, courses, lessons, items, quizzes, and 10 test users
pnpm db:seed

# Wipe progression logs, comments, and non-admin test records
pnpm db:clean

# Complete reset (clean + re-seed)
pnpm db:reset

# Wipe Next.js build cache
pnpm clean
```

> Don't run `pnpm build` while `pnpm dev` is running — they share `.next` and corrupt each other's cache. If it breaks, stop all `next` processes, run `pnpm clean`, and start again.

---

## 🤝 Contributing & Code of Conduct

1. All contributors must follow the MPC Code of Conduct & Culture (course "Nội quy & Văn hóa CLB" on the handbook). Agents and contributors working on code should read [CLAUDE.md](CLAUDE.md) first.
2. Branch naming convention: `feat/feature-name`, `fix/bug-fix`, `refactor/component-name`.
3. Always verify type safety (`pnpm exec tsc --noEmit`) and build integrity (`pnpm build`) before opening a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).  
Copyright © 2026 **Academic Programming Club (Mobile Programming Club - MPC)**. All rights reserved.

