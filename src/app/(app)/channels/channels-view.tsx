"use client";

import { Plus, Search, X } from "lucide-react";
import { useState } from "react";
import type { Brand } from "@/application/ports";
import { addChannelAction, deleteChannelAction } from "./actions";

const field =
  "w-full rounded-lg border border-line-strong bg-field px-3 py-2 text-[13px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 placeholder:text-muted";

// Each row is one brand with the channels (platforms) it goes live on.
export function ChannelsView({ brands }: { brands: Brand[] }) {
  const [query, setQuery] = useState("");
  const [brandName, setBrandName] = useState("");
  const [platform, setPlatform] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const names = [...new Set(brands.map((b) => b.brandName))].sort((a, b) => a.localeCompare(b));
  const channels = [...new Set(brands.map((b) => b.platform))].sort((a, b) => a.localeCompare(b));
  const q = query.trim().toLowerCase();
  const visible = names.filter((n) => !q || n.toLowerCase().includes(q));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const r = await addChannelAction(brandName, platform);
    setPending(false);
    if (r.ok) setPlatform("");
    else setError(r.error);
  }

  async function remove(b: Brand) {
    if (!window.confirm(`ลบ ${b.brandName} (${b.platform})?`)) return;
    setError(null);
    const r = await deleteChannelAction(b.id);
    if (!r.ok) setError(`${b.brandName} (${b.platform}): ${r.error}`);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <form onSubmit={add} className="grid gap-3 rounded-xl border border-line bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-1.5">
          <span className="text-[11px] text-soft">แบรนด์ (เลือกที่มี หรือพิมพ์ชื่อใหม่)</span>
          <input list="brand-names" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="เช่น Adidas" required className={field} />
          <datalist id="brand-names">
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[11px] text-soft">Channel / Platform</span>
          <input list="channel-names" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="เช่น TikTok" required className={field} />
          <datalist id="channel-names">
            {channels.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          <Plus size={14} /> เพิ่ม Channel
        </button>
        {error && (
          <p role="alert" className="rounded-lg bg-conflict-bg px-3 py-2 text-xs text-conflict-fg sm:col-span-3">
            {error}
          </p>
        )}
      </form>

      <section className="rounded-xl border border-line bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">
            แบรนด์ทั้งหมด <span className="font-normal text-muted">· {names.length} แบรนด์ · {brands.length} Channel</span>
          </h2>
          <label className="flex items-center gap-2 rounded-lg border border-line-strong bg-field px-2.5 py-1.5 text-muted">
            <Search size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาแบรนด์"
              className="w-40 bg-transparent text-xs text-ink outline-none placeholder:text-muted"
            />
          </label>
        </div>
        <ul>
          {visible.map((n) => (
            <li key={n} className="flex flex-wrap items-center gap-2 border-b border-line/60 px-4 py-2.5 text-xs">
              <span className="w-40 shrink-0 font-semibold">{n}</span>
              {brands
                .filter((b) => b.brandName === n)
                .map((b) => (
                  <span key={b.id} className="flex items-center gap-1 rounded-md bg-field py-0.5 pl-2 pr-0.5 text-[11px] text-soft">
                    {b.platform}
                    <button
                      type="button"
                      onClick={() => remove(b)}
                      aria-label={`ลบ ${n} ${b.platform}`}
                      className="rounded p-0.5 text-muted hover:bg-conflict-bg hover:text-conflict-fg"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
            </li>
          ))}
        </ul>
        {visible.length === 0 && <p className="px-4 py-8 text-center text-xs text-muted">ไม่พบแบรนด์</p>}
      </section>
    </div>
  );
}
