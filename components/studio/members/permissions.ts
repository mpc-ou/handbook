import type { UserProfile } from "@/types";

export function isSuperAdminEmail(
  email: string | undefined | null,
  superAdminEmails?: string[]
): boolean {
  if (!email || !superAdminEmails || superAdminEmails.length === 0) {
    return false;
  }
  const normalized = email.trim().toLowerCase();
  return superAdminEmails.some((item) => item.trim().toLowerCase() === normalized);
}

/**
 * Quy tắc chỉnh sửa thành viên:
 * - Chỉ ADMIN mới có quyền.
 * - Không ai sửa được Super Admin trừ chính họ.
 * - Chỉ Super Admin mới sửa được ADMIN khác.
 */
export function canEditMember(
  currentUser: UserProfile | null,
  targetMember: UserProfile,
  superAdminEmails?: string[]
): boolean {
  if (!currentUser || currentUser.role !== "ADMIN") return false;

  const isSelf = currentUser.uid === targetMember.uid;
  const isCurrentSuper = isSuperAdminEmail(currentUser.email, superAdminEmails);
  const isTargetSuper = isSuperAdminEmail(targetMember.email, superAdminEmails);

  if (isTargetSuper) {
    return isSelf;
  }

  if (targetMember.role === "ADMIN" && !isSelf) {
    return isCurrentSuper;
  }

  return true;
}

/**
 * Chỉ Super Admin mới được bổ nhiệm ADMIN mới.
 */
export function canAssignAdminRole(
  currentUser: UserProfile | null,
  superAdminEmails?: string[]
): boolean {
  if (!currentUser || currentUser.role !== "ADMIN") return false;
  return isSuperAdminEmail(currentUser.email, superAdminEmails);
}

/**
 * Quy tắc xóa thành viên:
 * - Ẩn mục xóa cho: chính mình, Super Admin, và ADMIN khác khi người dùng hiện tại không phải Super Admin.
 */
export function canDeleteMember(
  currentUser: UserProfile | null,
  targetMember: UserProfile,
  superAdminEmails?: string[]
): boolean {
  if (!currentUser || currentUser.role !== "ADMIN") return false;
  if (currentUser.uid === targetMember.uid) return false;
  if (isSuperAdminEmail(targetMember.email, superAdminEmails)) return false;
  if (
    targetMember.role === "ADMIN" &&
    !isSuperAdminEmail(currentUser.email, superAdminEmails)
  ) {
    return false;
  }
  return true;
}
