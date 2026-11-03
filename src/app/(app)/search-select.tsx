"use client";

import { ChevronDown, X } from "lucide-react";
import { useId, useRef, useState } from "react";

export interface SearchOption {
  value: string;
  label: string;
  hint?: string; // second line, also searched (e.g. a PD's squad)
}

const MAX_SHOWN = 60;

// A select you can type into: filters the options by label and hint.
export function SearchSelect({
  value,
  options,
  onChange,
  placeholder,
  emptyLabel,
  disabled,
  ariaLabel,
  className,
}: {
  value: string;
  options: SearchOption[];
  onChange: (value: string) => void;
  placeholder: string;
  // When given, the list starts with an option that clears the choice.
  emptyLabel?: string;
  disabled?: boolean;
  ariaLabel: string;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = options.filter((o) => {
    const text = `${o.label} ${o.hint ?? ""}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
  const list = [...(emptyLabel && !words.length ? [{ value: "", label: emptyLabel }] : []), ...matches.slice(0, MAX_SHOWN)];

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
    input.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.max(0, Math.min(list.length - 1, i + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (list[active]) pick(list[active].value);
    } else if (e.key === "Escape" && open) {
      // Close the list only, not the drawer around it.
      e.stopPropagation();
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="relative">
      <input
        ref={input}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        value={open ? query : (selected?.label ?? "")}
        placeholder={open ? "พิมพ์เพื่อค้นหา…" : placeholder}
        disabled={disabled}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={`${className} pr-8 placeholder:text-muted`}
      />
      {value && emptyLabel && !disabled ? (
        <button
          type="button"
          aria-label={`ล้าง ${ariaLabel}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => pick("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-ink"
        >
          <X size={13} />
        </button>
      ) : (
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
      )}
      {open && (
        <ul id={listId} role="listbox" className="absolute z-50 mt-1 max-h-64 w-full min-w-[220px] overflow-y-auto rounded-lg border border-line-strong bg-panel py-1 shadow-2xl">
          {list.length === 0 && <li className="px-3 py-2 text-xs text-muted">ไม่พบ “{query}”</li>}
          {list.map((o, i) => (
            <li
              key={o.value || "none"}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o.value)}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-1.5 text-xs ${i === active ? "bg-primary/15" : ""} ${o.value === value ? "font-semibold text-accent" : "text-ink"}`}
            >
              <span className="block truncate">{o.label}</span>
              {"hint" in o && o.hint && <span className="block truncate text-[10px] text-muted">{o.hint}</span>}
            </li>
          ))}
          {matches.length > MAX_SHOWN && (
            <li className="px-3 py-1.5 text-[10px] text-muted">แสดง {MAX_SHOWN} จาก {matches.length} — พิมพ์เพิ่มเพื่อกรอง</li>
          )}
        </ul>
      )}
    </div>
  );
}
