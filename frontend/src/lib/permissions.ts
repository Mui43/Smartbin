export type Role =
  | "admin"
  | "staff"
  | "viewer";

export const permissions = {
  admin: [
    "dashboard:view",
    "history:view",
    "devices:view",
    "devices:manage",
    "lock:control",
    "notifications:view",
    "settings:manage",
    "logs:view",
  ],

  staff: [
    "dashboard:view",
    "history:view",
    "devices:view",
    "lock:control",
    "notifications:view",
  ],

  viewer: [
    "dashboard:view",
    "history:view",
    "devices:view",
    "notifications:view",
  ],
} as const;

export function hasPermission(
  role: Role,
  permission: string
) {
  return permissions[role]?.includes(
    permission as never
  );
}