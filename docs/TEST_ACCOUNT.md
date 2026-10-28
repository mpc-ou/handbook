# Test Accounts Specification

> **Environment**: Staging & Testing  
> **Default Password**: `Tester@123`  
> **Authentication Mode**: Email + Password & MPC-SSO (OIDC)

All test accounts below have been pre-seeded into the PostgreSQL database. They are ready for testing role-based access control (RBAC), sequential curriculum unlocks, interactive assessment quizzes, and the Studio administration workspace.

---

## 1. Test Accounts Directory

| # | Full Name | Email | Role | Department | Default Password | Access Scope |
|:---:|---|---|:---:|---|:---:|---|
| **0** | **Nguyễn Thanh Triều** | `trieukon1011@gmail.com` | `ADMIN` | Ban Chủ Nhiệm | `Tester@123` | **Super Admin** (Full privileges, SSO & Password, cannot be deleted or demoted) |
| **1** | **Nguyễn Gia Bảo** | `admin.bao@mpclub.dev` | `ADMIN` | Ban Chủ Nhiệm | `Tester@123` | **Administrator** (Full studio management, curriculum creation, member role assignment) |
| **2** | **Trần Minh Quân** | `editor.quan@mpclub.dev` | `EDITOR` | Ban Chuyên môn | `Tester@123` | **Department Editor** (Create, edit, draft, and publish curriculum for Academic Team) |
| **3** | **Lê Khánh Linh** | `editor.linh@mpclub.dev` | `EDITOR` | Ban Truyền thông | `Tester@123` | **Department Editor** (Manage playbooks, communication guides, and event materials) |
| **4** | **Võ Tuấn Anh** | `dev.tuan@mpclub.dev` | `MEMBER` | Ban Chuyên môn | `Tester@123` | **Member** (Learning roadmap, read lessons, take quizzes, like & comment) |
| **5** | **Đỗ Quốc Huy** | `dev.huy@mpclub.dev` | `MEMBER` | Ban Chuyên môn | `Tester@123` | **Member** (Learning roadmap, take quizzes, track personal completion) |
| **6** | **Hoàng Tuyết Mai** | `media.mai@mpclub.dev` | `MEMBER` | Ban Truyền thông | `Tester@123` | **Member** (Read communications material, submit quiz assessments) |
| **7** | **Phan Đăng Khoa** | `media.khoa@mpclub.dev` | `MEMBER` | Ban Truyền thông | `Tester@123` | **Member** (Read communications material, view progress transcripts) |
| **8** | **Phạm Hoàng Nam** | `event.nam@mpclub.dev` | `MEMBER` | Ban Sự kiện | `Tester@123` | **Member** (Read event playbooks, take assessments) |
| **9** | **Ngô Thu Hà** | `event.ha@mpclub.dev` | `MEMBER` | Ban Sự kiện | `Tester@123` | **Member** (Read event playbooks, take assessments) |

---

## 2. Authentication Rules & Flags

### A. Dual-Portal Login
- **MPC Single Sign-On**: Authenticate using centralized club OAuth2 / OIDC credentials at `https://auth.mpclub.dev`.
- **Email + Password**: Authenticate using pre-authorized member email and password. Public self-registration is permanently disabled for system security.

### B. The `noPassword` Flag
- When a user logs in via **MPC-SSO for the first time**, the account is created in PostgreSQL with `noPassword: true`.
- On the **User Profile page** (`/profile` -> Security & Password tab):
  - If `noPassword: true`, the user can **directly set their desired password** without entering a fake or non-existent current password.
  - Once set, `noPassword` switches to `false`, allowing the user to sign in using either MPC-SSO or Email + Password.

### C. Environment Toggles
- **`EMAIL_LOGIN` / `NEXT_PUBLIC_EMAIL_LOGIN`**:
  - `enable`: Shows both MPC-SSO and Email + Password form.
  - `disable`: Hides password fields and disables credential auth endpoints; login is strictly restricted to MPC-SSO.
- **`SUPER_ADMIN_EMAIL`**:
  - Accepts a comma-separated list of Super Admin emails (e.g. `trieukon1011@gmail.com,admin2@mpclub.dev`).

---

## 3. Database Re-seed Command

To restore this exact state with fresh progress and all 10 test accounts:

```powershell
pnpm db:seed
```

Or to completely clean non-admin records and repopulate:

```powershell
pnpm db:reset
```

