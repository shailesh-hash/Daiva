export function canSeeAdminUi(user: { isAdmin?: boolean } | null | undefined): boolean {
  return user?.isAdmin === true;
}
