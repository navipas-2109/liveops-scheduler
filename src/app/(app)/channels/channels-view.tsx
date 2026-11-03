"use client";

import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Brand } from "@/application/ports";
import { BulkBar, BulkDrawer, BulkField, BulkNote, SelectAll, useSelection, type BulkOutcome } from "../bulk";
import { addChannelAction, deleteChannelsAction, editChannelAction, updateChannelsAction } from "./actions";

const field =
  "w-full rounded-lg border border-line-strong bg-field px-3 py-2 text-[13px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 placeholder:text-muted";

// One row per brand and channel (platform) it goes live on.
export function ChannelsView({ brands }: { brands: Brand[] }) {
  const [query, setQuery] = useState("");
  const [brandName, setBrandName] = useState("");
  const [platform, setPlatform] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [bulkEditing, setBulkEditing] = useState(false);
  const [note, setNote] = useState<{ verb: string; outcome: BulkOutcome } | null>(null);

  const names = [...new Set(brands.map((b) => b.brandName))].sort((a, b) => a.localeCompare(b));
  const channels = [...new Set(brands.map((b) => b.platform))].sort((a, b) => a.localeCompare(b));
  const q = query.trim().toLowerCase();
  const visible = brands
    .filter((b) => !q || `${b.brandName} ${b.platform}`.toLowerCase().includes(q))
    .sort((a, b) => a.brandName.localeCompare(b.brandName) || a.platform.localeCompare(b.platform));
  const selection = useSelection(brands.map((b) => b.id));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const r = await addChannelAction(brandName, platform);
    setPending(false);
    if (r.ok) setPlatform("");
    else setError(r.error);
  }

  async function bulkDelete() {
    if (!window.confirm(`ลบ ${selection.selected.length} รายการ? (แบรนด์/Channel ที่ยังมีไลฟ์อยู่จะถูกข้าม)`)) return;
    setPending(true);
    const outcome = await deleteChannelsAction(selection.selected);
    setPending(false);
    setNote({ verb: "ลบ", outcome });
    if (outcome.ok) selection.clear();
  }

  async function removeOne(b: Brand) {
    if (!window.confirm(`ลบ ${b.brandName} (${b.platform})?`)) return;
    setPending(true);
    const outcome = await deleteChannelsAction([b.id]);
    setPending(false);
    setNote({ verb: "ลบ", outcome });
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

      <BulkBar
        count={selection.selected.length}
        onEdit={() => setBulkEditing(true)}
        onDelete={bulkDelete}
        onClear={selection.clear}
        pending={pending}
      />
      <BulkNote note={note} onClose={() => setNote(null)} />

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
              placeholder="ค้นหาแบรนด์ / Channel"
              className="w-44 bg-transparent text-xs text-ink outline-none placeholder:text-muted"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted">
              <tr className="border-b border-line">
                <th className="w-8 pl-4">
                  <SelectAll shown={visible.map((b) => b.id)} selection={selection} />
                </th>
                <th className="px-4 py-2 font-semibold">แบรนด์</th>
                <th className="px-3 py-2 font-semibold">Channel</th>
                <th className="w-20 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((b) => (
                <tr key={b.id} className={`border-b border-line/60 hover:bg-field/50 ${selection.has(b.id) ? "bg-primary/10" : ""}`}>
                  <td className="pl-4">
                    <input
                      type="checkbox"
                      aria-label={`เลือก ${b.brandName} ${b.platform}`}
                      checked={selection.has(b.id)}
                      onChange={() => selection.toggle(b.id)}
                    />
                  </td>
                  <td className="px-4 py-2 font-semibold">{b.brandName}</td>
                  <td className="px-3 py-2 text-soft">{b.platform}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => setEditing(b)} aria-label={`แก้ไข ${b.brandName} ${b.platform}`} className="rounded-md p-1.5 text-muted hover:bg-field hover:text-ink">
                      <Pencil size={13} />
                    </button>
                    <button type="button" onClick={() => removeOne(b)} aria-label={`ลบ ${b.brandName} ${b.platform}`} className="rounded-md p-1.5 text-muted hover:bg-conflict-bg hover:text-conflict-fg">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <p className="px-4 py-8 text-center text-xs text-muted">ไม่พบแบรนด์</p>}
        </div>
      </section>

      {editing && <EditChannelDrawer key={editing.id} brand={editing} onClose={() => setEditing(null)} />}
      {bulkEditing && (
        <BulkChannelDrawer
          ids={selection.selected}
          onClose={() => setBulkEditing(false)}
          onDone={(outcome) => {
            setNote({ verb: "แก้ไข", outcome });
            if (outcome.ok) {
              setBulkEditing(false);
              selection.clear();
            }
          }}
        />
      )}
    </div>
  );
}

function EditChannelDrawer({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  const [brandName, setBrandName] = useState(brand.brandName);
  const [platform, setPlatform] = useState(brand.platform);
  const [error, setError] = useState<string | null>(null);
  return (
    <BulkDrawer
      title="แก้ไขแบรนด์ / Channel"
      count={1}
      onClose={onClose}
      onSubmit={async () => {
        const r = await editChannelAction(brand.id, brandName, platform);
        if (r.ok) onClose();
        else setError(r.error);
      }}
    >
      <label className="grid gap-1.5">
        <span className="text-[11px] text-soft">แบรนด์</span>
        <input value={brandName} onChange={(e) => setBrandName(e.target.value)} required aria-label="ชื่อแบรนด์" className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className="text-[11px] text-soft">Channel / Platform</span>
        <input value={platform} onChange={(e) => setPlatform(e.target.value)} required aria-label="ชื่อ Channel" className={field} />
      </label>
      {error && <p role="alert" className="rounded-lg bg-conflict-bg px-3 py-2 text-xs text-conflict-fg">{error}</p>}
    </BulkDrawer>
  );
}

function BulkChannelDrawer({
  ids,
  onClose,
  onDone,
}: {
  ids: string[];
  onClose: () => void;
  onDone: (outcome: BulkOutcome) => void;
}) {
  const [useBrand, setUseBrand] = useState(false);
  const [usePlatform, setUsePlatform] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [platform, setPlatform] = useState("");
  return (
    <BulkDrawer
      title="แก้ไขที่เลือก"
      count={ids.length}
      onClose={onClose}
      onSubmit={async () =>
        onDone(await updateChannelsAction(ids, { ...(useBrand ? { brandName } : {}), ...(usePlatform ? { platform } : {}) }))
      }
    >
      <BulkField label="ชื่อแบรนด์" on={useBrand} onToggle={setUseBrand}>
        <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="ชื่อแบรนด์ใหม่" aria-label="ชื่อแบรนด์ใหม่" className={field} />
      </BulkField>
      <BulkField label="ชื่อ Channel" on={usePlatform} onToggle={setUsePlatform}>
        <input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="เช่น TikTok" aria-label="ชื่อ Channel ใหม่" className={field} />
      </BulkField>
    </BulkDrawer>
  );
}
