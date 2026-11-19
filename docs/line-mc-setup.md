# MC ยืนยันคิวผ่าน LINE (คิวจาก Google Sheet)

ระหว่างที่ทีมยังลงคิว MC ใน Google Sheet ("DEC X MC") ระบบนี้ให้ MC แต่ละคนดูและยืนยันคิวของตัวเองใน LINE ได้

```
Google Sheet ──(Apps Script ทุก 10 นาที)──▶ LiveOps /api/sheet-sync
MC ใน LINE ──(เมนู “คิวของฉัน” = LIFF)──▶ LiveOps /line  → ยืนยัน / รับไม่ได้
LiveOps ──(คำตอบ)──▶ แท็บ “MC Confirm (LINE)” ในชีต · หน้า LINE MC สำหรับ Planner
```

## 1. Environment Variables ใน Vercel (โปรเจกต์ liveops-scheduler-6g2l)

| ชื่อ | มาจากไหน |
| --- | --- |
| `SHEET_SYNC_SECRET` | ข้อความสุ่มยาว 32+ ตัว (ใส่ค่าเดียวกันใน Apps Script) |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers → Messaging API channel → Messaging API → Channel access token (long-lived) |
| `LINE_CHANNEL_SECRET` | Messaging API channel → Basic settings → Channel secret |
| `LINE_LOGIN_CHANNEL_ID` | LINE Login channel → Basic settings → Channel ID |
| `NEXT_PUBLIC_LIFF_ID` | LINE Login channel → LIFF → LIFF ID |

ใส่แล้ว Redeploy

## 2. LINE

1. สร้าง LINE Official Account (ฟรี) ที่ manager.line.biz และเปิดใช้ Messaging API (เลือก Provider เดียวกับข้อ 2)
2. developers.line.biz → Provider เดิม → สร้าง **LINE Login** channel → แท็บ LIFF → Add
   - Size: Full · Endpoint URL: `https://liveops-scheduler-6g2l.vercel.app/line` · Scope: `openid`, `profile` · Bot link: On (Aggressive)
3. Messaging API channel → Webhook URL: `https://liveops-scheduler-6g2l.vercel.app/api/line/webhook` → Use webhook: On → Verify
4. LINE Official Account Manager → ปิด Auto-reply / Greeting message (ระบบตอบเอง) → Rich menu: ปุ่ม “คิวของฉัน” ลิงก์ไป `https://liff.line.me/<LIFF ID>`

## 3. Apps Script ในชีต (คนที่มีสิทธิ์แก้ชีต)

1. เปิดชีต → Extensions → Apps Script → วางโค้ดจาก `scripts/google-apps-script/LiveOpsSync.gs` → Save
2. Project Settings → Script properties: `APP_URL` = `https://liveops-scheduler-6g2l.vercel.app`, `SYNC_SECRET` = ค่าเดียวกับ `SHEET_SYNC_SECRET`
3. เลือกฟังก์ชัน `installTrigger` → Run → อนุญาตสิทธิ์ (ครั้งแรก)

สคริปต์อ่านเฉพาะแท็บที่ชื่อมี “X MC” และไม่แก้ข้อมูลในแท็บเหล่านั้น เขียนเฉพาะแท็บใหม่ “MC Confirm (LINE)”

## 4. ใช้งาน

- Planner: หน้า **LINE MC** → ส่ง “รหัสผูก LINE” ให้ MC แต่ละคน (ครั้งเดียว)
- MC: เพิ่มเพื่อน LINE OA → พิมพ์รหัส หรือกดเมนู “คิวของฉัน” แล้วใส่รหัส → ยืนยัน / รับไม่ได้
- คิวที่ถูกเปลี่ยน MC หรือเวลาในชีต จะกลายเป็นคิวใหม่ที่ต้องยืนยันใหม่
- ปุ่ม “ส่ง LINE เตือน” ส่ง 1 ข้อความต่อ MC ที่ยังมีคิวรอยืนยัน (นับในโควตาข้อความของ LINE OA)
