"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "../auth-actions";

const inputClass =
  "w-full rounded-lg border border-line-strong bg-field px-3.5 py-2.5 text-[13px] text-ink " +
  "placeholder:text-muted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25";

type Tab = "password" | "lark";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [tab, setTab] = useState<Tab>("password");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div role="tablist" className="mb-6 grid grid-cols-2 rounded-lg bg-field p-1">
        {(
          [
            ["password", "Email & Password"],
            ["lark", "Ripples Employee"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-md px-2 py-2 text-xs font-medium transition ${
              tab === id ? "bg-card text-ink shadow" : "text-muted hover:text-soft"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "password" ? (
        <form action={formAction} className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs font-medium text-soft">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              placeholder="Enter your email"
              defaultValue={state.email}
              required
              className={inputClass}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-medium text-soft">Password</span>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-soft"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          {state.error && (
            <p
              role="alert"
              className="rounded-lg border border-conflict-fg/30 bg-conflict-bg px-3 py-2 text-xs text-conflict-fg"
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 rounded-lg bg-primary px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_0_24px_rgba(18,104,255,0.35)] transition hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : (
        <div className="grid gap-4 text-center">
          <p className="text-xs text-soft">Employee sign-in is through Lark.</p>
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-2 rounded-lg border border-line-strong bg-field px-4 py-2.5 text-[13px] font-medium text-soft opacity-60"
          >
            Sign in with Lark
          </button>
          <p className="text-[11px] text-muted">
            ยังไม่เปิดใช้งาน — ระหว่างนี้ใช้อีเมลและรหัสผ่านไปก่อน
          </p>
        </div>
      )}
    </>
  );
}
