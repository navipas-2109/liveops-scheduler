// Signs and verifies the login token kept in the session cookie.
// No Next.js imports here, so proxy.ts and server code can both use it.

import { jwtVerify, SignJWT } from "jose";
import type { SessionUser } from "@/application/auth/login";
import type { Role } from "@/domain/roles";

export const SESSION_COOKIE = "liveops_session";
export const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;

const ROLES: Role[] = ["AE", "PLANNER", "OPERATION", "MANAGER"];

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a random string of at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const role = payload.role as Role;
    if (!payload.sub || typeof payload.name !== "string" || !ROLES.includes(role)) return null;
    return { userId: payload.sub, name: payload.name, role };
  } catch {
    return null;
  }
}
