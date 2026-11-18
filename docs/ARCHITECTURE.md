# Architecture

A short map of how MPC Handbook is put together. For day-to-day coding rules see [CLAUDE.md](../CLAUDE.md).

## Data model

```
Category ──< CourseCategory >── Course ──< Lesson ──< Item ──1:1── Quiz ──< QuizAttempt
 (flat tag)                      (cover)    (cover)   (no cover)
                                   │                    │
                                   └── CourseEditor     ├── UserProgress (per user × item)
                                        (EDITOR scope)  ├── ItemLike
                                                        ├── Comment (2 levels)
                                                        └── UploadedFile (course / lesson / item)
```

- **Item types**: `CONTENT` (read-only chapter), `QUIZ` (auto-graded), `ASSIGNMENT` (manually graded). Allowed question types per item type live in `lib/quiz-rules.ts` and are enforced by the API.
- **Learning order**: `item.requirePrevious ?? lesson.requirePrevious ?? course.sequential`. Course/lesson progress is derived from item progress, never stored.
- **Status**: `ContentStatus` (`DRAFT → PENDING_REVIEW → PUBLISHED`); only `ADMIN` publishes.
- Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma). Schema changes use `pnpm db:push` (no migration files yet).

## Request flow and security

| Concern | Where |
|---|---|
| Authentication | Auth.js v5, JWT session in an httpOnly cookie. Providers: email + password (bcrypt) and MPC-SSO (OIDC + PKCE). `lib/auth.ts` |
| Authorization | Every write route calls a guard in `lib/authz.ts` (`requireUser`, `requireAdmin`, `requireCourseEditor`, …), which re-reads the role from the DB. `middleware.ts` only checks that a session cookie exists for `/studio` |
| Data for the UI | `GET /api/handbook/data` filters by viewer: guests/members get published content only, quiz answers are stripped, other users' emails are hidden |
| Quiz grading | Server-side only (`POST /api/quiz/grade`); the client never receives correct answers |
| Errors | `lib/api-errors.ts` returns `{ success:false, error, code }`, translated to the caller's locale from `messages/*/errors.json` |
| Client store | `context/HandbookContext.tsx` (data + mutations + toasts); `lib/api-client.ts` wraps `fetch` and throws `ApiError` |

**Rule:** never pass item/quiz data from a server component into a client component. Doing so once exposed quiz answers and drafts in the page HTML.

## URLs

| Area | Path |
|---|---|
| Home (course grid) | `/` |
| Course / lesson / chapter | `/learn/[course]`, `/learn/[course]/[lesson]`, `/learn/[course]/[lesson]/[item]` |
| Certificate | `/learn/[course]/certificate` |
| Studio | `/studio`, `/studio/curriculum`, `/studio/items`, `/studio/items/[id]`, `/studio/progress`, `/studio/quizzes`, `/studio/members`, `/studio/settings` |
| Legacy (redirected) | `/docs/*`, `/studio/articles/*`, `/editor/*` |

## Internationalisation

next-intl with `vi` (default) and `en`, chosen by the `NEXT_LOCALE` cookie (no URL prefix). Messages are split by namespace in `messages/<locale>/<namespace>.json`; the namespace list is in `i18n/config.ts`. Both locales must keep identical keys and ICU variables. Course content is user-authored and is not translated.

## SEO and link previews

- Only `/` is indexable: `app/robots.ts` + `noindex` metadata + `X-Robots-Tag` (middleware). Link-preview bots (Facebook, Zalo, Slack, …) may fetch `/learn/`.
- `lib/seo.ts#resolvePreview` decides what a crawler may see. Only fully public content (published, `PUBLIC`, `FREE`, no group restriction) exposes a title, a ~160-character excerpt and a cover. Everything else — including non-existent URLs — returns one identical generic "members-only" card.
- `opengraph-image.tsx` per segment renders the 1200×630 image with `next/og` using fonts in `assets/fonts/`.

## Cloudinary

Direct signed upload (`/api/upload/sign` → Cloudinary → `/api/upload/register`). Saving a course, lesson or item attaches the files it uses and detaches the ones it no longer uses; `/api/upload/cleanup` deletes unattached files. Learner uploads (assignment files) are not registered, so cleanup never removes them.

## Learning features

| Feature | Location |
|---|---|
| Progress rings/bars, count-up | `components/ui/animated-progress.tsx` |
| Streak and achievements (derived, not stored) | `lib/gamification.ts` |
| Search (MiniSearch, diacritic-insensitive) | `lib/search.ts`, `components/layout/CommandSearch.tsx` |
| Fox companion | `components/companion/` (listens to `window` events `mpc:companion` and `mpc:companion-toggle`) |
| Admin learner progress | `app/studio/progress/`, `components/studio/progress/` |

## Known gaps

- Sequential unlock is enforced in the UI only; the API still serves content to a determined caller.
- `/api/handbook/data` loads all content in one request; fine for now, lazy-load chapter bodies if content grows.
- No automated tests are committed yet; no login rate limiting; `AUTH_SECRET` has a development fallback in code.
- `pnpm lint` reports `react-hooks/*` (React Compiler) errors in several files.
