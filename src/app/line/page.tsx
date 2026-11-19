import type { Metadata, Viewport } from "next";
import { LineQueue } from "./line-queue";

export const metadata: Metadata = { title: "คิวของฉัน · LiveOps" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export default function LineQueuePage() {
  return <LineQueue liffId={process.env.NEXT_PUBLIC_LIFF_ID ?? ""} />;
}
