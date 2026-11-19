// LINE Messaging API (push / reply), LIFF ID-token checks and webhook
// signatures. Settings come from environment variables; without a channel
// access token, LINE features report themselves as not set up.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { LineGateway } from "@/application/ports";

const API = "https://api.line.me";

// Local testing only: lets "dev:<id>" stand in for a LIFF ID token. Never
// active on Vercel.
function devUser(idToken: string) {
  if (process.env.LINE_DEV_BYPASS_UNSAFE !== "1" || process.env.VERCEL) return null;
  return idToken.startsWith("dev:") ? { userId: idToken.slice(4), name: "Dev" } : null;
}

export function liffUrl(): string {
  const id = process.env.NEXT_PUBLIC_LIFF_ID;
  return id ? `https://liff.line.me/${id}` : `${process.env.APP_URL ?? ""}/line`;
}

export function verifyLineSignature(body: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function send(path: string, payload: unknown): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error(`LINE ${path} failed: ${res.status} ${await res.text()}`);
    return res.ok;
  } catch (e) {
    console.error(`LINE ${path} failed`, e);
    return false;
  }
}

export const lineGateway: LineGateway = {
  get enabled() {
    return !!process.env.LINE_CHANNEL_ACCESS_TOKEN;
  },
  async verifyIdToken(idToken) {
    const dev = devUser(idToken);
    if (dev) return dev;
    const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
    if (!clientId || !idToken) return null;
    try {
      const res = await fetch(`${API}/oauth2/v2.1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { sub?: string; name?: string };
      return body.sub ? { userId: body.sub, name: body.name ?? "" } : null;
    } catch {
      return null;
    }
  },
  push: (to, text) => send("/v2/bot/message/push", { to, messages: [{ type: "text", text }] }),
  async reply(replyToken, text) {
    await send("/v2/bot/message/reply", { replyToken, messages: [{ type: "text", text }] });
  },
};
