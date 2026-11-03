"""Builds public/templates/producer-import-template.xlsx, the file
Producer Database > "นำเข้าจาก xlsx" reads.

Run after changing positions (keep in step with src/domain/producer-sheet.ts):
    python3 scripts/make_producer_template.py

The layout must stay readable by parseProducerSheet: a header row with
"Employee ID", "Name", "Position", "Squad".
"""

from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

OUT = Path(__file__).resolve().parent.parent / "public" / "templates" / "producer-import-template.xlsx"

POSITIONS = ["Producer Team Lead", "Senior Producer", "Producer", "Jr. Producer"]
HEADERS = ["Employee ID", "Name", "Position", "Squad"]
WIDTHS = [16, 26, 22, 36]
HEADER_ROW = 4
DATA_ROWS = 300

NAVY = "1C2333"
BLUE = "1268FF"
thin = Side(style="thin", color="D0D5DD")
box = Border(left=thin, right=thin, top=thin, bottom=thin)


def header(ws, row):
    for i, (h, w) in enumerate(zip(HEADERS, WIDTHS), start=1):
        c = ws.cell(row=row, column=i, value=h)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=BLUE)
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = box
        ws.column_dimensions[chr(64 + i)].width = w


wb = Workbook()

# Main tab: what gets imported.
ws = wb.active
ws.title = "Producers"
ws["A1"] = "รายชื่อ Producer — LiveOps"
ws["A1"].font = Font(bold=True, size=14, color=NAVY)
ws["A2"] = "กรอกตั้งแต่แถว 5 ลงไป · Name จำเป็น · ช่องอื่นเว้นว่างได้ (คนเดิม = คงค่าเดิม) · ดูแท็บ วิธีใช้"
ws["A2"].font = Font(italic=True, color="667085")
header(ws, HEADER_ROW)
ws.freeze_panes = ws.cell(row=HEADER_ROW + 1, column=1)
for r in range(HEADER_ROW + 1, HEADER_ROW + 1 + DATA_ROWS):
    for c in range(1, 5):
        cell = ws.cell(row=r, column=c)
        cell.border = box
    ws.cell(row=r, column=1).number_format = "@"  # keep leading zeros in IDs
dv = DataValidation(type="list", formula1='"' + ",".join(POSITIONS) + '"', allow_blank=True)
dv.error = "เลือกตำแหน่งจากรายการ"
dv.prompt = "เลือกตำแหน่ง (เว้นว่าง = คงเดิม / คนใหม่เป็น Jr. Producer)"
ws.add_data_validation(dv)
dv.add(f"C{HEADER_ROW + 1}:C{HEADER_ROW + DATA_ROWS}")

# How-to tab.
how = wb.create_sheet("วิธีใช้")
how.column_dimensions["A"].width = 100
lines = [
    ("วิธีใช้ Template รายชื่อ Producer", True),
    ("1. กรอกรายชื่อในแท็บ Producers (แถวละ 1 คน) แล้วบันทึกเป็น .xlsx", False),
    ("   Google Sheets: File → Download → Microsoft Excel (.xlsx)", False),
    ("2. ไปที่ Producer Database → นำเข้าจาก xlsx → เลือกไฟล์ → ตรวจสอบ → นำเข้า", False),
    ("", False),
    ("ระบบจับคู่คนเดิมด้วย Employee ID ก่อน ถ้าไม่มีรหัสจะจับคู่ด้วยชื่อ", False),
    ("• คนที่จับคู่ได้ = อัปเดตข้อมูล (เช่น เปลี่ยนชื่อ ตำแหน่ง Squad หรือเติมรหัส)", False),
    ("• คนที่จับคู่ไม่ได้ = เพิ่มเป็นพนักงานใหม่", False),
    ("• Position / Squad ว่าง = คงค่าเดิม (คนใหม่: ตำแหน่ง Jr. Producer, Squad ว่าง)", False),
    ("• คนที่มีในระบบแต่ไม่มีในไฟล์ จะไม่ถูกลบ (ลบได้ที่หน้า Producer Database)", False),
    ("", False),
    ("Position ที่ใช้ได้: " + ", ".join(POSITIONS), False),
    ("Employee ID ใช้ได้เฉพาะ A-Z, 0-9 และ - (ไม่เกิน 20 ตัว)", False),
]
for i, (text, bold) in enumerate(lines, start=1):
    c = how.cell(row=i, column=1, value=text)
    c.font = Font(bold=bold, size=13 if bold else 11, color=NAVY)

# Example tab: not imported (only the first tab is read by default).
ex = wb.create_sheet("ตัวอย่าง")
ex["A1"] = "ตัวอย่างการกรอก (แท็บนี้ไม่ถูกนำเข้า)"
ex["A1"].font = Font(bold=True, color=NAVY)
header(ex, 3)
for r, row in enumerate(
    [
        ("110568", "Arm", "Jr. Producer", "Adidas Ch1 (TikTok)"),
        ("110601", "Sa", "Producer", "Adidas Shopee"),
        ("", "Donut", "", "Banobagi"),
    ],
    start=4,
):
    for c, v in enumerate(row, start=1):
        ex.cell(row=r, column=c, value=v).border = box

OUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUT)
print("wrote", OUT)
