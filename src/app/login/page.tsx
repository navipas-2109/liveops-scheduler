import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ · LiveOps Scheduler" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-lg">
            📡
          </div>
          <div>
            <p className="text-base font-semibold leading-tight">LIVE OPS</p>
            <p className="text-[11px] text-muted">ระบบตารางไลฟ์ (Live Scheduling System)</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-white p-6">
          <h1 className="mb-1 text-[15px] font-semibold">เข้าสู่ระบบ</h1>
          <p className="mb-5 text-xs text-muted">ใช้อีเมลและรหัสผ่านที่ได้รับจากทีม</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
