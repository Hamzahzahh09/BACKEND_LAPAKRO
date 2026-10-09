export const ROLES_HIERARCHY: Record<string, number> = {
  owner: 4,
  admin: 3,
  seller: 2,
  user: 1,
};

export const ROLE_LEVELS = ['user', 'seller', 'admin', 'owner'] as const;
export type Role = (typeof ROLE_LEVELS)[number];

export function hasSufficientRole(
  userRole: string,
  requiredRole: string,
): boolean {
  const userLevel = ROLES_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLES_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}
