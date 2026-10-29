import { RadioTower } from "lucide-react";

// App logo: a gradient tile with a broadcast icon, in the Ripples blue/violet.
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet text-white shadow-[0_0_16px_rgba(18,104,255,0.35)]"
      style={{ width: size, height: size }}
    >
      <RadioTower size={size * 0.55} strokeWidth={2.2} />
    </div>
  );
}
