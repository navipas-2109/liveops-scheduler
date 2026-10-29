import bcrypt from "bcryptjs";
import type { PasswordHasher } from "@/application/ports";

export const bcryptHasher: PasswordHasher = {
  verify: (password, hash) => bcrypt.compare(password, hash),
};
