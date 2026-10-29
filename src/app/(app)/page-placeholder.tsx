import { Inbox } from "lucide-react";

// Temporary content for pages that haven't been built yet, styled like the
// Ripples Operations empty state.
export function PagePlaceholder() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-line bg-card px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-line-strong bg-field text-soft">
        <Inbox size={18} />
      </div>
      <p className="text-sm font-semibold text-ink">หน้านี้กำลังพัฒนา</p>
      <p className="mt-1 text-xs text-muted">This page is coming in a later step.</p>
    </div>
  );
}
