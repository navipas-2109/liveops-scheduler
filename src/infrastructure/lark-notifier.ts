import type { Notifier, NotifyChannel } from "@/application/ports";

const WEBHOOK_ENV: Record<NotifyChannel, string> = {
  planner: "LARK_WEBHOOK_PLANNER",
  operation: "LARK_WEBHOOK_OPERATION",
  finance: "LARK_WEBHOOK_FINANCE",
};

// Posts a text message to each channel's Lark group via its incoming webhook.
// Channels without a webhook URL are skipped. A failed notification is logged
// but never blocks the action that triggered it.
export const larkNotifier: Notifier = {
  async notify(channels, text) {
    const urls = [...new Set(channels.map((c) => process.env[WEBHOOK_ENV[c]]).filter(Boolean))];
    await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ msg_type: "text", content: { text } }),
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) console.error(`Lark webhook failed: HTTP ${res.status}`);
        } catch (error) {
          console.error("Lark webhook failed:", error);
        }
      }),
    );
  },
};
