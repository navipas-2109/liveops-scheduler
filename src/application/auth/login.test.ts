import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { login } from "./login";

const hash = bcrypt.hashSync("secret-pass", 4);
const deps = {
  users: {
    findCredentialsByEmail: async (email: string) =>
      email === "planner@liveops.local"
        ? { id: "u1", name: "Planner", role: "PLANNER" as const, passwordHash: hash }
        : null,
  },
  passwords: { verify: (p: string, h: string) => bcrypt.compare(p, h) },
};

describe("login", () => {
  it("accepts the right password, ignoring email case and spaces", async () => {
    expect(await login(deps, " Planner@LiveOps.local ", "secret-pass")).toEqual({
      userId: "u1",
      name: "Planner",
      role: "PLANNER",
    });
  });

  it("rejects a wrong password or unknown email", async () => {
    expect(await login(deps, "planner@liveops.local", "nope")).toBeNull();
    expect(await login(deps, "nobody@liveops.local", "secret-pass")).toBeNull();
  });
});
