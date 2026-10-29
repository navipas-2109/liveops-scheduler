import type { UserRepository } from "@/application/ports";
import { prisma } from "../prisma";

export const prismaUserRepository: UserRepository = {
  findCredentialsByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, role: true, passwordHash: true },
    });
  },
};
