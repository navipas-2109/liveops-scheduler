import { connection } from "next/server";
import { services } from "@/di/container";
import { lineGateway, liffUrl, verifyLineSignature } from "@/infrastructure/line/line-gateway";

// LINE Official Account webhook. MCs mostly use the "คิวของฉัน" page (LIFF);
// in chat they can also send their link code, or anything else to get a
// summary and the page link.

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
}

const CODE = /^[A-Z0-9]{6}$/;

async function handle(e: LineEvent) {
  const userId = e.source?.userId;
  if (!e.replyToken || !userId) return;
  const page = liffUrl();
  if (e.type === "follow") {
    await lineGateway.reply(e.replyToken, `สวัสดีค่ะ 🙏\nพิมพ์รหัส 6 ตัวที่ได้จาก Planner เพื่อผูกบัญชี แล้วดูคิวได้ที่: ${page}`);
    return;
  }
  if (e.type !== "message" || e.message?.type !== "text") return;
  const text = (e.message.text ?? "").trim().toUpperCase();
  const user = { userId, name: "" };
  if (CODE.test(text)) {
    const r = await services.linkMyLine(user, text);
    await lineGateway.reply(e.replyToken, r.ok ? `ผูกบัญชีกับ ${r.value} เรียบร้อย ✅\nดูและยืนยันคิวได้ที่: ${page}` : r.error);
    return;
  }
  const mine = await services.getMyQueue(user);
  if (!mine.linked) {
    await lineGateway.reply(e.replyToken, `ยังไม่ได้ผูกบัญชี — พิมพ์รหัส 6 ตัวที่ได้จาก Planner`);
    return;
  }
  const waiting = mine.items.filter((i) => !i.status).length;
  await lineGateway.reply(
    e.replyToken,
    `${mine.mcName}: คิวที่กำลังจะมาถึง ${mine.items.length} คิว · รอยืนยัน ${waiting} คิว\nดูและยืนยันได้ที่: ${page}`,
  );
}

export async function POST(req: Request) {
  await connection();
  const body = await req.text();
  if (!verifyLineSignature(body, req.headers.get("x-line-signature"))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const { events = [] } = JSON.parse(body) as { events?: LineEvent[] };
  // LINE wants a quick 200; answer each event, but don't fail the batch.
  await Promise.all(events.map((e) => handle(e).catch((err) => console.error("LINE event failed", err))));
  return Response.json({ ok: true });
}
