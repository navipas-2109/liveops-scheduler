import type { Role } from "@/domain/roles";
import type { PasswordHasher, UserRepository } from "../ports";

export interface SessionUser {
  userId: string;
  name: string;
  role: Role;
}

// Returns the user to sign in, or null. The same null is returned for an
// unknown email and a wrong password so the login form can't be used to
// discover which emails exist.
export async function login(
  deps: { users: UserRepository; passwords: PasswordHasher },
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await deps.users.findCredentialsByEmail(email.trim().toLowerCase());
  if (!user) return null;
  if (!(await deps.passwords.verify(password, user.passwordHash))) return null;
  return { userId: user.id, name: user.name, role: user.role };
}
