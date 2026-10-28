export function getSuperAdminEmails(): string[] {
  const envVal =
    process.env.SUPER_ADMIN_EMAILS ||
    process.env.SUPER_ADMIN_EMAIL ||
    "trieukon1011@gmail.com";

  return envVal
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = getSuperAdminEmails();
  return list.includes(email.trim().toLowerCase());
}

export function isEmailLoginEnabled(): boolean {
  // Check EMAIL_LOGIN or NEXT_PUBLIC_EMAIL_LOGIN
  // If set to "disabled", "disable", "false", "0", returns false. Otherwise default to true.
  const envVal = (
    process.env.NEXT_PUBLIC_EMAIL_LOGIN ||
    process.env.EMAIL_LOGIN ||
    "enable"
  )
    .trim()
    .toLowerCase();

  return !["disable", "disabled", "false", "0"].includes(envVal);
}
