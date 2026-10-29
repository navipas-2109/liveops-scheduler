"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../auth-actions";

const inputClass =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-[13px] outline-none " +
  "focus:border-accent focus:ring-2 focus:ring-accent/20";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-1.5">
        <span className="text-[11px] text-muted">อีเมล</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email}
          required
          className={inputClass}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-[11px] text-muted">รหัสผ่าน</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-[#F7C1C1] bg-conflict-bg px-3 py-2 text-xs text-conflict-fg"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-[#134d87] disabled:opacity-60"
      >
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
