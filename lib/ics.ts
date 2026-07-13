import { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { DEMO_BILLS, demoMode } from "@/lib/demo";

const EOL = "\r\n";

/**
 * Build the iCalendar feed: one all-day event per bill due date. Public at
 * /cal.ics so Apple Calendar (webcal://) and Google Calendar (add by URL)
 * can both subscribe and stay current.
 */
export async function buildIcs(): Promise<string> {
  const dtstamp =
    new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  let ics =
    `BEGIN:VCALENDAR${EOL}VERSION:2.0${EOL}PRODID:-//Peach Cob//404 Parke Ave//EN${EOL}` +
    `X-WR-CALNAME:Peach Cob · Bills${EOL}`;

  const bills = demoMode()
    ? DEMO_BILLS.map((b) => ({
        dueDate: b.dueDate,
        status: b.status,
        typeName: b.typeName,
        emoji: b.typeEmoji,
      }))
    : await query<RowDataPacket>(
        `SELECT b.due_date AS dueDate, b.status, t.name AS typeName, t.emoji
         FROM bills b
         JOIN bill_types t ON t.id = b.type_id`,
      );
  for (const row of bills) {
    if (!row.dueDate) continue;
    const due = String(row.dueDate).replaceAll("-", "");
    const paidFlag = row.status === "paid" ? " - PAID" : "";
    ics +=
      `BEGIN:VEVENT${EOL}` +
      `UID:${row.typeName}-${due}@peachcob${EOL}` +
      `DTSTAMP:${dtstamp}${EOL}` +
      `DTSTART;VALUE=DATE:${due}${EOL}` +
      `DTEND;VALUE=DATE:${due}${EOL}` +
      `SUMMARY:${row.emoji} ${row.typeName} Bill Due${paidFlag}${EOL}` +
      `END:VEVENT${EOL}`;
  }

  ics += `END:VCALENDAR${EOL}`;
  return ics;
}
