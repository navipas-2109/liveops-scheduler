import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type { SessionUser } from "@/application/auth/login";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  signSessionToken,
  verifySessionToken,
} from "./session-token";

export async function createSession(user: SessionUser) {
  const token = await signSessionToken(user);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// Cached per request so layouts and pages can all ask without re-verifying.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
});
