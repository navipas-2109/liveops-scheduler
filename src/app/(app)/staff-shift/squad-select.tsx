export function SquadSelect({
  squads,
  value,
  onChange,
}: {
  squads: string[];
  value: string;
  onChange: (squad: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-muted">
      Brand Squad
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[240px] rounded-md border border-line-strong bg-field px-2 py-1.5 text-xs text-ink outline-none"
      >
        <option value="">ทุก Squad</option>
        {squads.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </label>
  );
}
