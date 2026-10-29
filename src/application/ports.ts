// Interfaces the use cases depend on. Infrastructure provides the real ones;
// tests can pass simple fakes.

import type { Role } from "@/domain/roles";

export interface UserCredentials {
  id: string;
  name: string;
  role: Role;
  passwordHash: string;
}

export interface UserRepository {
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
}

export interface PasswordHasher {
  verify(password: string, hash: string): Promise<boolean>;
}

export interface SlotAlertCounts {
  conflict: number;
  waiting: number;
}

export interface SlotRepository {
  countAlertsOn(date: Date): Promise<SlotAlertCounts>;
}
