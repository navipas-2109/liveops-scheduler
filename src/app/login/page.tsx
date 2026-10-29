import type { Metadata } from "next";
import { BrandMark } from "../brand-mark";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ · LiveOps Scheduler" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Navy glow background, as on the Ripples Operations sign-in page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#13274d_0%,#0b1220_55%),linear-gradient(180deg,#0b1220_60%,#141f4a_100%)]"
      />
      <div className="relative w-full max-w-[376px] rounded-2xl border border-line-strong bg-panel/80 px-8 pb-8 pt-10 shadow-[0_0_80px_rgba(18,104,255,0.12)] backdrop-blur">
        <div className="mb-7 flex flex-col items-center text-center">
          <BrandMark size={44} />
          <h1 className="mt-4 text-lg font-semibold text-ink">LiveOps Scheduler</h1>
          <p className="mt-1 text-xs tracking-wide text-muted">Live Operation Scheduling Platform</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-[10px] leading-relaxed text-muted">
          สำหรับทีม E-commerce Live Operation · Ripples Commerce
        </p>
      </div>
    </main>
  );
}
