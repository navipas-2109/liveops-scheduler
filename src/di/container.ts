// Wires use cases to their real implementations. Pages and server actions
// call these instead of reaching into infrastructure directly.

import "server-only";
import { login } from "@/application/auth/login";
import { getTodayAlerts } from "@/application/slots/get-alerts";
import { bcryptHasher } from "@/infrastructure/auth/bcrypt-hasher";
import { prismaSlotRepository } from "@/infrastructure/repositories/prisma-slot-repository";
import { prismaUserRepository } from "@/infrastructure/repositories/prisma-user-repository";

const deps = {
  users: prismaUserRepository,
  slots: prismaSlotRepository,
  passwords: bcryptHasher,
};

export const services = {
  login: (email: string, password: string) => login(deps, email, password),
  getTodayAlerts: (today: Date) => getTodayAlerts(deps, today),
};
