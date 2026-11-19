"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { MyQueue, MyQueueItem } from "@/application/line-queue/my-queue";
import { dayLabel, timeRange } from "../format";
import { answerAction, linkAction, myQueueAction } from "./actions";

declare global {
  interface Window {
    liff?: {
      init(config: { liffId: string }): Promise<void>;
      isLoggedIn(): boolean;
      login(options?: { redirectUri?: string }): void;
      getIDToken(): string | null;
    };
  }
}

const LIFF_SDK = "https://static.line-scdn.net/liff/edge/2/sdk.js";

function loadSdk(): Promise<void> {
  if (window.liff) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = LIFF_SDK;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("โหลด LINE ไม่สำเร็จ"));
    document.head.appendChild(s);
  });
}

// Who is opening the page: the LIFF ID token from LINE. For local testing
// without LIFF, "?dev=<id>" is passed through (the server only accepts it
// when LINE_DEV_BYPASS_UNSAFE is on, never on Vercel).
async function getIdToken(liffId: string): Promise<string | null> {
  if (!liffId) {
    const dev = new URLSearchParams(location.search).get("dev");
    return dev ? `dev:${dev}` : null;
  }
  await loadSdk();
  await window.liff!.init({ liffId });
  if (!window.liff!.isLoggedIn()) {
    window.liff!.login({ redirectUri: location.href });
    return null;
  }
  return window.liff!.getIDToken();
}

export function LineQueue({ liffId }: { liffId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [queue, setQueue] = useState<MyQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async (t: string) => {
    const r = await myQueueAction(t);
    if (r.ok) setQueue(r.value);
    else setError(r.error);
  }, []);

  useEffect(() => {
    getIdToken(liffId)
      .then((t) => {
        if (!t) return setError(liffId ? null : "เปิดหน้านี้จากเมนู “คิวของฉัน” ใน LINE");
        setToken(t);
        return load(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "เปิดหน้าไม่สำเร็จ"));
  }, [liffId, load]);

  async function run(work: () => Promise<{ ok: boolean; error?: string }>) {
    if (!token) return;
    setBusy(true);
    setError(null);
    const r = await work();
    if (!r.ok) setError(r.error ?? "ทำรายการไม่สำเร็จ");
    await load(token);
    setBusy(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-page px-4 pb-24 pt-5 text-ink">
      <header className="mb-4">
        <p className="text-[11px] font-semibold tracking-widest text-accent">LIVEOPS · MC</p>
        <h1 className="text-xl font-semibold">{queue?.linked ? `คิวของ ${queue.mcName}` : "คิวของฉัน"}</h1>
      </header>

      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-conflict-fg/30 bg-conflict-bg px-3 py-2 text-sm text-conflict-fg">
          {error}
        </p>
      )}

      {!queue && !error && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <LoaderCircle size={16} className="animate-spin" /> กำลังโหลด…
        </p>
      )}

      {queue && !queue.linked && <LinkForm busy={busy} onLink={(code) => run(() => linkAction(token!, code))} />}

      {queue?.linked && (
        <QueueList
          items={queue.items}
          busy={busy}
          showAll={showAll}
          setShowAll={setShowAll}
          onAnswer={(keys, status, reason) => run(() => answerAction(token!, keys, status, reason))}
        />
      )}
    </main>
  );
}

function LinkForm({ busy, onLink }: { busy: boolean; onLink: (code: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onLink(code);
      }}
      className="grid gap-3 rounded-xl border border-line bg-card p-4"
    >
      <p className="text-sm">ผูกบัญชี LINE กับชื่อ MC ของคุณ (ทำครั้งเดียว)</p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="รหัส 6 ตัวจาก Planner"
        aria-label="รหัสผูกบัญชี"
        maxLength={6}
        autoCapitalize="characters"
        className="rounded-lg border border-line-strong bg-field px-3 py-3 text-center text-lg tracking-[0.3em] outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={busy || code.trim().length !== 6}
        className="rounded-lg bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        ผูกบัญชี
      </button>
    </form>
  );
}

function QueueList({
  items,
  busy,
  showAll,
  setShowAll,
  onAnswer,
}: {
  items: MyQueueItem[];
  busy: boolean;
  showAll: boolean;
  setShowAll: (v: boolean) => void;
  onAnswer: (keys: string[], status: "confirmed" | "declined", reason: string) => void;
}) {
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const waiting = items.filter((i) => !i.status);
  const shown = showAll ? items : waiting;
  const days = [...new Set(shown.map((i) => i.date))];

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["รอยืนยัน", waiting.length, "text-waiting-fg"],
          ["ยืนยันแล้ว", items.filter((i) => i.status === "confirmed").length, "text-confirmed-fg"],
          ["รับไม่ได้", items.filter((i) => i.status === "declined").length, "text-conflict-fg"],
        ].map(([label, n, tone]) => (
          <div key={label as string} className="rounded-xl border border-line bg-card py-2">
            <p className={`text-xl font-semibold tabular-nums ${tone}`}>{n}</p>
            <p className="text-[11px] text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex overflow-hidden rounded-lg border border-line-strong text-sm">
        {[
          [false, `รอยืนยัน (${waiting.length})`],
          [true, `ทั้งหมด (${items.length})`],
        ].map(([all, label]) => (
          <button
            key={label as string}
            type="button"
            onClick={() => setShowAll(all as boolean)}
            className={`flex-1 py-2 ${showAll === all ? "bg-primary text-white" : "bg-field text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-muted">
          {items.length === 0 ? "ยังไม่มีคิวที่กำลังจะมาถึง" : "ยืนยันครบทุกคิวแล้ว 🎉"}
        </p>
      )}

      {days.map((date) => (
        <section key={date} className="grid gap-2">
          <h2 className="mt-1 text-xs font-semibold text-soft">{dayLabel(date)}</h2>
          {shown
            .filter((i) => i.date === date)
            .map((i) => (
              <article key={i.key} className="rounded-xl border border-line bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-semibold tabular-nums">{timeRange(i.startMinute, i.endMinute)}</p>
                    <p className="truncate text-sm">
                      {i.brand} <span className="text-muted">· {i.channel}</span>
                    </p>
                    {i.note && <p className="mt-0.5 text-xs text-waiting-fg">{i.note}</p>}
                  </div>
                  {i.status === "confirmed" && <span className="shrink-0 rounded-md bg-confirmed-bg px-2 py-1 text-xs font-semibold text-confirmed-fg">✓ ยืนยันแล้ว</span>}
                  {i.status === "declined" && <span className="shrink-0 rounded-md bg-conflict-bg px-2 py-1 text-xs font-semibold text-conflict-fg">รับไม่ได้</span>}
                </div>
                {declining === i.key ? (
                  <div className="mt-3 grid gap-2">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="เหตุผล (ถ้ามี) เช่น ติดธุระ"
                      maxLength={200}
                      className="rounded-lg border border-line-strong bg-field px-3 py-2 text-sm outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setDeclining(null)} className="rounded-lg border border-line-strong py-2 text-sm text-soft">
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          onAnswer([i.key], "declined", reason);
                          setDeclining(null);
                          setReason("");
                        }}
                        className="rounded-lg bg-conflict-fg py-2 text-sm font-semibold text-page disabled:opacity-50"
                      >
                        ยืนยันว่ารับไม่ได้
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={busy || i.status === "declined"}
                      onClick={() => setDeclining(i.key)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-line-strong py-2 text-sm text-soft disabled:opacity-40"
                    >
                      <X size={15} /> รับไม่ได้
                    </button>
                    <button
                      type="button"
                      disabled={busy || i.status === "confirmed"}
                      onClick={() => onAnswer([i.key], "confirmed", "")}
                      className="flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      <Check size={15} /> ยืนยัน
                    </button>
                  </div>
                )}
              </article>
            ))}
        </section>
      ))}

      {waiting.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-panel/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            disabled={busy}
            onClick={() => window.confirm(`ยืนยันทั้งหมด ${waiting.length} คิว?`) && onAnswer(waiting.map((w) => w.key), "confirmed", "")}
            className="mx-auto block w-full max-w-md rounded-lg bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : `ยืนยันทั้งหมดที่รอ (${waiting.length} คิว)`}
          </button>
        </div>
      )}
    </div>
  );
}
