export type AuthUser = {
  userId: string;
  password: string;
};

export const ALLOWED_USERS: AuthUser[] = [
  { userId: "admin", password: "admin" },
  { userId: "bankiq_analyst", password: "Insight#456" },
  { userId: "bankiq_ops", password: "OpsSecure789" },
  { userId: "bankiq_viewer", password: "Viewer!321" },
];

export function isValidUser(userId: string, password: string): boolean {
  return ALLOWED_USERS.some(
    (user) => user.userId === userId && user.password === password
  );
}
