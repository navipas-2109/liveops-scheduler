"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { services } from "@/di/container";
import { createSession, deleteSession } from "@/infrastructure/auth/session";
import { homeHref } from "./navigation";

export interface LoginState {
  error?: string;
  email?: string;
}

const LoginInput = z.object({
  email: z.string().trim().min(1, "กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const user = await services.login(parsed.data.email, parsed.data.password);
  if (!user) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง", email };

  await createSession(user);
  redirect(homeHref(user.role));
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
