/**
 * LiveOps — send the MC queues in this Google Sheet to LiveOps (so MCs can
 * confirm them in LINE), and write their answers back into a new tab.
 *
 * Reads every tab whose name contains "X MC" (e.g. "DEC X MC"), from the
 * header row with "MC" and "Brand". Only reads those tabs; it never edits
 * them. Answers go to the tab "MC Confirm (LINE)", created if missing.
 *
 * Setup (once): Project Settings → Script properties:
 *   APP_URL     = https://liveops-scheduler-6g2l.vercel.app
 *   SYNC_SECRET = the same value as SHEET_SYNC_SECRET in Vercel
 * Then run installTrigger() once (sends every 10 minutes).
 */

const TAB_PATTERN = /X\s*MC/i;
const ANSWER_TAB = 'MC Confirm (LINE)';

function settings_() {
  const p = PropertiesService.getScriptProperties();
  const url = p.getProperty('APP_URL');
  const secret = p.getProperty('SYNC_SECRET');
  if (!url || !secret) throw new Error('ตั้งค่า APP_URL และ SYNC_SECRET ใน Project Settings > Script properties ก่อน');
  return { url: url.replace(/\/+$/, ''), secret: secret };
}

function readQueues_() {
  const rows = [];
  SpreadsheetApp.getActive().getSheets()
    .filter(function (sheet) { return TAB_PATTERN.test(sheet.getName()); })
    .forEach(function (sheet) {
      const values = sheet.getDataRange().getDisplayValues();
      const headerIndex = values.findIndex(function (r) {
        const cells = r.map(function (c) { return String(c).trim().toLowerCase(); });
        return cells.indexOf('mc') >= 0 && cells.indexOf('brand') >= 0;
      });
      if (headerIndex < 0) return;
      const header = values[headerIndex].map(function (c) { return String(c).trim().toLowerCase(); });
      const col = function (name) { return header.indexOf(name); };
      const at = {
        mc: col('mc'), brand: col('brand'), channel: col('channel'), date: col('date'),
        start: col('start time'), end: col('end time'), note: col('note'), bu: col('bu'),
      };
      for (let i = headerIndex + 1; i < values.length; i++) {
        const r = values[i];
        const get = function (k) { return at[k] >= 0 ? String(r[at[k]]).trim() : ''; };
        if (!get('mc') && !get('brand')) continue;
        rows.push({
          sheet: sheet.getName(), row: i + 1, mc: get('mc'), brand: get('brand'), channel: get('channel'),
          date: get('date'), start: get('start'), end: get('end'), note: get('note'), bu: get('bu'),
        });
      }
    });
  return rows;
}

/** Send all queues to LiveOps, then write the answers back. */
function syncQueues() {
  const s = settings_();
  const rows = readQueues_();
  const res = UrlFetchApp.fetch(s.url + '/api/sheet-sync', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ rows: rows }),
    headers: { Authorization: 'Bearer ' + s.secret },
    muteHttpExceptions: true,
  });
  Logger.log('ส่ง ' + rows.length + ' แถว → ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 500));
  if (res.getResponseCode() !== 200) throw new Error('ส่งคิวไม่สำเร็จ: ' + res.getContentText().slice(0, 300));
  writeAnswers();
}

/** Copy every queue with the MC's answer into the "MC Confirm (LINE)" tab. */
function writeAnswers() {
  const s = settings_();
  const res = UrlFetchApp.fetch(s.url + '/api/sheet-sync', {
    headers: { Authorization: 'Bearer ' + s.secret },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('อ่านคำตอบไม่สำเร็จ: ' + res.getContentText().slice(0, 300));
  const rows = JSON.parse(res.getContentText()).rows;
  const book = SpreadsheetApp.getActive();
  const tab = book.getSheetByName(ANSWER_TAB) || book.insertSheet(ANSWER_TAB);
  const header = ['Tab', 'Row', 'MC', 'Brand', 'Channel', 'Date', 'Start', 'End', 'สถานะ', 'เหตุผล', 'ตอบเมื่อ'];
  const data = rows.map(function (r) {
    return [r.sheet, r.row, r.mc, r.brand, r.channel, r.date, r.start, r.end, r.status, r.reason, r.answeredAt];
  });
  tab.clearContents();
  tab.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  if (data.length) tab.getRange(2, 1, data.length, header.length).setValues(data);
  tab.setFrozenRows(1);
}

/** Run once: send queues every 10 minutes. */
function installTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'syncQueues'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('syncQueues').timeBased().everyMinutes(10).create();
  syncQueues();
}

/** Adds a "LiveOps" menu to send right away. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('LiveOps')
    .addItem('ส่งคิวให้ LiveOps ตอนนี้', 'syncQueues')
    .addToUi();
}
