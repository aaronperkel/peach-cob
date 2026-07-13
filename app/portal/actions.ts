"use server";

import path from "node:path";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getEmailMap, requireAdminAction } from "@/lib/auth";
import { execute, getPool, query } from "@/lib/db";
import { getBillTypeByName, getSplitters, billFileHref } from "@/lib/bills";
import { demoMode } from "@/lib/demo";
import {
  emailIdentity,
  formatLongDate,
  nameList,
  newBillEmailHtml,
  reminderEmailHtml,
} from "@/lib/emails";
import { sendSmtpMail } from "@/lib/mail";
import { RowDataPacket } from "mysql2";

function done(ok: string, path = "/portal"): never {
  revalidatePath(path);
  redirect(`${path}?ok=${encodeURIComponent(ok)}`);
}

function fail(err: string, path = "/portal"): never {
  redirect(`${path}?err=${encodeURIComponent(err)}`);
}

const HOUSEHOLD = "/portal/household";

const DEMO_MSG = "Demo mode — this is just for looking around, changes aren't saved yet.";

// ---------------------------------------------------------------------------
// Add bill (used with useActionState so validation errors render inline)
// ---------------------------------------------------------------------------

export interface AddBillState {
  errors: string[];
}

export async function addBill(
  _prev: AddBillState,
  formData: FormData,
): Promise<AddBillState> {
  if (demoMode()) return { errors: [DEMO_MSG] };
  let poster;
  try {
    poster = await requireAdminAction();
  } catch {
    return { errors: ["You need to be signed in as a resident to post bills."] };
  }

  const errors: string[] = [];
  const typeName = String(formData.get("type") ?? "");
  const billDateStr = String(formData.get("date") ?? "");
  const dueDateStr = String(formData.get("due") ?? "");
  const amountStr = String(formData.get("amount") ?? "");
  const file = formData.get("view");

  if (!billDateStr || !typeName || !amountStr || !dueDateStr || !(file instanceof File) || file.size === 0) {
    errors.push("Missing one of: date, type, amount, due, or PDF.");
  }

  const billType = await getBillTypeByName(typeName);
  if (!billType) {
    errors.push("Invalid bill type selected.");
  }

  const amount = Number(amountStr);
  if (!Number.isFinite(amount)) errors.push("Amount must be numeric.");
  else if (amount <= 0) errors.push("Amount must be a positive value.");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(billDateStr)) errors.push("Invalid bill date format. Please use YYYY-MM-DD.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDateStr)) errors.push("Invalid due date format. Please use YYYY-MM-DD.");

  let origName = "";
  let buffer: Buffer | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) errors.push("File is too large. Maximum size is 5MB.");
    origName = path.basename(file.name).replace(/[^A-Za-z0-9.\-_]/g, "");
    if (!origName || origName === "." || origName === "..") {
      errors.push("Invalid filename after sanitization. Please use standard characters.");
    } else if (!origName.toLowerCase().endsWith(".pdf")) {
      errors.push("Filename must end with .pdf.");
    }
    buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 0 && !buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      errors.push("Invalid file type. Only PDF files are allowed.");
    }
  }

  if (errors.length > 0) return { errors };

  const year = billDateStr.slice(0, 4);
  const total = amount + Number(billType!.processingFee);
  const splitters = await getSplitters();
  const cost = splitters.length > 0 ? Math.round((total / splitters.length) * 100) / 100 : 0;

  // The split: every splitter's share is total/N, but the type's owner
  // fronted the whole bill to the provider, so only the OTHERS get debt rows
  // (they pay her back). No owner configured → every splitter owes.
  const ownerId = billType!.ownerId;
  const debtors = splitters.filter((p) => p.id !== ownerId);

  // Blob key mirrors the stored pdf_path so /files/<pdf_path> resolves directly.
  const pdfPath = `${year}/${typeName}/${origName}`;
  try {
    await put(pdfPath, buffer!, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/pdf",
    });
  } catch (err) {
    console.error("Blob upload failed:", err);
    return { errors: ["Failed to store the PDF. Check BLOB_READ_WRITE_TOKEN and try again."] };
  }

  const result = await execute(
    `INSERT INTO bills (type_id, bill_date, due_date, total, per_person_cost, status, pdf_path, added_by_id)
     VALUES (?, ?, ?, ?, ?, 'unpaid', ?, ?)`,
    [billType!.id, billDateStr, dueDateStr, total, cost, pdfPath, poster.id],
  );
  const newBillId = result.insertId;

  if (debtors.length > 0) {
    const placeholders = debtors.map(() => "(?, ?)").join(", ");
    await execute(
      `INSERT INTO bill_debts (bill_id, person_id) VALUES ${placeholders}`,
      debtors.flatMap((p) => [newBillId, p.id]),
    );
  }

  // Every splitter hears about the new bill; debtors are told who to pay,
  // the owner is told who owes her.
  const id = emailIdentity();
  const emailMap = await getEmailMap();
  const billViewLink = `${id.baseUrl}${billFileHref(pdfPath)}`;
  const debtorNames = debtors.map((p) => p.name);
  const sent: Record<string, string> = {};
  for (const person of splitters) {
    const to = emailMap[person.name];
    if (!to) continue;
    const html = newBillEmailHtml(
      {
        personName: person.name,
        item: typeName,
        total,
        cost,
        dueDate: dueDateStr,
        billViewLink,
        ownerName: billType!.ownerName,
        postedByName: poster.name,
        isOwner: ownerId != null && person.id === ownerId,
        debtorNames,
      },
      id,
    );
    if (await sendSmtpMail(to, `New Bill Posted: ${typeName}`, html)) {
      sent[person.name] = to;
    }
  }
  const confirmTo = process.env.APP_CONFIRMATION_EMAIL_TO;
  if (confirmTo) {
    const sentList =
      Object.keys(sent).length === 0
        ? "None (or all failed, check logs)"
        : Object.entries(sent)
            .map(([name, email]) => `${name} &lt;${email}&gt;`)
            .join(", ");
    const confBody =
      `<div style="font-family:Georgia,serif;color:#43302b;">` +
      `<h3 style="margin:0 0 8px 0;">Peach Cob: New Bill Posted</h3>` +
      `<p style="margin:6px 0 10px 0;color:#6b5a4e;"><strong>Item:</strong> ${typeName} &nbsp;|&nbsp; <strong>Total:</strong> $${total.toFixed(2)}</p>` +
      `<p style="margin:6px 0 10px 0;color:#6b5a4e;"><strong>Posted by:</strong> ${poster.name} &nbsp;|&nbsp; <strong>Due:</strong> ${formatLongDate(dueDateStr)}</p>` +
      `<p style="margin:6px 0 10px 0;color:#6b5a4e;"><strong>Sent to:</strong> ${sentList}</p>` +
      `</div>`;
    await sendSmtpMail(confirmTo, `Peach Cob: New Bill Posted - ${typeName}`, confBody);
  }

  done(
    billType!.ownerName
      ? `Bill posted — ${nameList(debtorNames)} each owe ${billType!.ownerName} $${cost.toFixed(2)}.`
      : "Bill posted and split with the whole house.",
  );
}

// ---------------------------------------------------------------------------
// Payment checkboxes (auto-save; called programmatically from the client)
// ---------------------------------------------------------------------------

export async function updateOwes(
  billId: number,
  paidPersonIds: number[],
): Promise<{ ok: boolean; status?: string; error?: string }> {
  if (demoMode()) return { ok: false, error: DEMO_MSG };
  try {
    await requireAdminAction();
  } catch {
    return { ok: false, error: "You need to be signed in to update payments." };
  }

  const splitters = await getSplitters();
  if (splitters.length === 0) {
    return { ok: false, error: "No residents found in the system." };
  }

  const statusRows = await query<RowDataPacket>(
    `SELECT b.status, t.owner_id AS ownerId
     FROM bills b JOIN bill_types t ON t.id = b.type_id
     WHERE b.id = ?`,
    [billId],
  );
  if (statusRows.length === 0) return { ok: false, error: `Bill ${billId} not found.` };
  const currentStatus = statusRows[0].status as string;
  const ownerId = statusRows[0].ownerId == null ? null : Number(statusRows[0].ownerId);

  const paid = new Set(paidPersonIds.map(Number));
  const conn = await getPool().getConnection();
  let newStatus = currentStatus;
  try {
    await conn.beginTransaction();
    await conn.execute("DELETE FROM bill_debts WHERE bill_id = ?", [billId]);
    // The owner never owes on her own bill — she fronted the provider.
    const owing = splitters.filter((p) => p.id !== ownerId && !paid.has(p.id));
    if (owing.length > 0) {
      const placeholders = owing.map(() => "(?, ?)").join(", ");
      await conn.execute(
        `INSERT INTO bill_debts (bill_id, person_id) VALUES ${placeholders}`,
        owing.flatMap((p) => [billId, p.id]),
      );
    }
    newStatus = owing.length === 0 ? "paid" : "unpaid";
    if (newStatus !== currentStatus) {
      await conn.execute("UPDATE bills SET status = ? WHERE id = ?", [newStatus, billId]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error(`updateOwes failed for bill ${billId}:`, err);
    return { ok: false, error: "Database error updating payment status." };
  } finally {
    conn.release();
  }

  revalidatePath("/portal");
  revalidatePath("/");
  return { ok: true, status: newStatus };
}

// ---------------------------------------------------------------------------
// Per-bill reminder
// ---------------------------------------------------------------------------

export async function sendReminder(formData: FormData): Promise<void> {
  if (demoMode()) fail(DEMO_MSG);
  try {
    await requireAdminAction();
  } catch {
    fail("You need to be signed in to send reminders.");
  }

  const billId = Number(formData.get("billId"));
  const bills = await query<RowDataPacket>(
    `SELECT b.id, b.due_date AS dueDate, b.total, b.per_person_cost AS perPersonCost,
            t.name AS typeName, po.name AS ownerName
     FROM bills b
     JOIN bill_types t ON t.id = b.type_id
     LEFT JOIN people po ON po.id = t.owner_id
     WHERE b.id = ?`,
    [billId],
  );
  const bill = bills[0];
  if (!bill) fail(`Bill ${billId} not found.`);

  const owingRows = await query<RowDataPacket>(
    `SELECT p.name FROM people p
     JOIN bill_debts d ON p.id = d.person_id
     WHERE d.bill_id = ?`,
    [billId],
  );
  const owingNames: string[] = owingRows.map((r) => r.name);

  const due = new Date(`${bill.dueDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const intervalDays = today > due ? 0 : Math.round((due.getTime() - today.getTime()) / 86400000);
  const subject =
    intervalDays <= 3
      ? `URGENT: Reminder - ${bill.typeName} Bill Due Soon`
      : `Reminder: ${bill.typeName} Bill Due`;

  const id = emailIdentity();
  const emailMap = await getEmailMap();
  const sentTo: string[] = [];
  for (const personName of owingNames) {
    const to = emailMap[personName];
    if (!to) continue;
    const html = reminderEmailHtml(
      {
        personName,
        item: bill.typeName,
        total: Number(bill.total),
        cost: Number(bill.perPersonCost),
        dueDate: bill.dueDate,
        ownerName: bill.ownerName ?? null,
      },
      id,
    );
    if (await sendSmtpMail(to, subject, html)) {
      sentTo.push(`${personName} &lt;${to}&gt;`);
    }
  }

  const confirmTo = process.env.APP_CONFIRMATION_EMAIL_TO;
  if (owingNames.length > 0 && confirmTo) {
    const processed = sentTo.length === 0 ? "None (or all failed, check logs)" : sentTo.join(", ");
    const confirmBody =
      `<div style="font-family:Georgia,serif;color:#43302b;">` +
      `<h3 style="margin:0 0 8px 0;">Peach Cob: Reminder Batch Report</h3>` +
      `<p style="margin:6px 0 10px 0;color:#6b5a4e;">Bill: <strong>${bill.typeName}</strong> — Due: <strong>${bill.dueDate}</strong></p>` +
      `<p style="margin:6px 0 10px 0;color:#6b5a4e;"><strong>Processed recipients:</strong></p>` +
      `<p style="margin:0 0 8px 0;color:#6b5a4e;">${processed}</p>` +
      `</div>`;
    await sendSmtpMail(confirmTo, `Reminder Batch Processed: ${bill.typeName} due ${bill.dueDate}`, confirmBody);
  }

  done(`Reminders for the ${bill.typeName} bill are on their way.`);
}

// ---------------------------------------------------------------------------
// People management
// ---------------------------------------------------------------------------

export async function savePerson(formData: FormData): Promise<void> {
  if (demoMode()) fail(DEMO_MSG, HOUSEHOLD);
  try {
    await requireAdminAction();
  } catch {
    fail("You need to be signed in to edit residents.", HOUSEHOLD);
  }

  const action = String(formData.get("person_action") ?? "add");
  const name = String(formData.get("person_name") ?? "").trim();
  // Email doubles as the login identity, so keep it normalized
  const email = String(formData.get("person_email") ?? "").trim().toLowerCase();
  const isAdmin = formData.get("person_is_admin") ? 1 : 0;
  const splitsBills = formData.get("person_splits") ? 1 : 0;

  if (!name || !email) fail("Name and email are both required.", HOUSEHOLD);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("Invalid email address.", HOUSEHOLD);

  try {
    if (action === "add") {
      await execute(
        "INSERT INTO people (name, email, is_admin, splits_bills) VALUES (?, ?, ?, ?)",
        [name, email, isAdmin, splitsBills],
      );
    } else {
      const id = Number(formData.get("person_id"));
      if (!id) fail("Invalid resident ID.", HOUSEHOLD);
      await execute(
        "UPDATE people SET name=?, email=?, is_admin=?, splits_bills=? WHERE id=?",
        [name, email, isAdmin, splitsBills, id],
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail(
      /duplicate/i.test(message) ? "That name or email is already in use." : `Database error: ${message}`,
      HOUSEHOLD,
    );
  }

  done(action === "add" ? `${name} added to the house.` : `${name} updated.`, HOUSEHOLD);
}

export async function removePerson(formData: FormData): Promise<void> {
  if (demoMode()) fail(DEMO_MSG, HOUSEHOLD);
  try {
    await requireAdminAction();
  } catch {
    fail("You need to be signed in to edit residents.", HOUSEHOLD);
  }
  const id = Number(formData.get("person_id"));
  if (!id) fail("Invalid resident ID.", HOUSEHOLD);
  // No FK cascade on TiDB — clear their outstanding shares and any utilities
  // they owned explicitly.
  await execute("DELETE FROM bill_debts WHERE person_id = ?", [id]);
  await execute("UPDATE bill_types SET owner_id = NULL WHERE owner_id = ?", [id]);
  await execute("DELETE FROM people WHERE id = ?", [id]);
  done("Resident removed.", HOUSEHOLD);
}

// ---------------------------------------------------------------------------
// Bill type management
// ---------------------------------------------------------------------------

export async function saveBillType(formData: FormData): Promise<void> {
  if (demoMode()) fail(DEMO_MSG, HOUSEHOLD);
  try {
    await requireAdminAction();
  } catch {
    fail("You need to be signed in to edit bill types.", HOUSEHOLD);
  }

  const action = String(formData.get("billtype_action") ?? "add");
  const name = String(formData.get("billtype_name") ?? "").trim();
  const emoji = String(formData.get("billtype_emoji") ?? "").trim();
  const feeStr = String(formData.get("billtype_fee") ?? "0");
  const fee = Number(feeStr);
  const ownerRaw = String(formData.get("billtype_owner") ?? "");
  const ownerId = ownerRaw ? Number(ownerRaw) : null;

  if (!name || !emoji) fail("Name and emoji are required.", HOUSEHOLD);
  if (!Number.isFinite(fee) || fee < 0) {
    fail("Processing fee must be zero or a positive number.", HOUSEHOLD);
  }
  if (ownerId != null && !Number.isInteger(ownerId)) {
    fail("Invalid owner selected.", HOUSEHOLD);
  }

  try {
    if (action === "add") {
      await execute(
        "INSERT INTO bill_types (name, emoji, processing_fee, owner_id) VALUES (?, ?, ?, ?)",
        [name, emoji, fee, ownerId],
      );
    } else {
      const id = Number(formData.get("billtype_id"));
      if (!id) fail("Invalid bill type ID.", HOUSEHOLD);
      await execute(
        "UPDATE bill_types SET name=?, emoji=?, processing_fee=?, owner_id=? WHERE id=?",
        [name, emoji, fee, ownerId, id],
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fail(
      /duplicate/i.test(message)
        ? "A bill type with that name already exists."
        : `Database error: ${message}`,
      HOUSEHOLD,
    );
  }

  done(action === "add" ? `Bill type '${name}' added.` : `Bill type '${name}' updated.`, HOUSEHOLD);
}

export async function removeBillType(formData: FormData): Promise<void> {
  if (demoMode()) fail(DEMO_MSG, HOUSEHOLD);
  try {
    await requireAdminAction();
  } catch {
    fail("You need to be signed in to edit bill types.", HOUSEHOLD);
  }
  const id = Number(formData.get("billtype_id"));
  if (!id) fail("Invalid bill type ID.", HOUSEHOLD);

  const nameRows = await query<RowDataPacket>(
    "SELECT name FROM bill_types WHERE id = ?",
    [id],
  );
  const name = nameRows[0]?.name;
  if (!name) fail("Bill type not found.", HOUSEHOLD);

  const countRows = await query<RowDataPacket>(
    "SELECT COUNT(*) AS n FROM bills WHERE type_id = ?",
    [id],
  );
  if (Number(countRows[0].n) > 0) {
    fail(`Cannot remove '${name}' — there are existing bills of this type.`, HOUSEHOLD);
  }

  await execute("DELETE FROM bill_types WHERE id = ?", [id]);
  done(`Bill type '${name}' removed.`, HOUSEHOLD);
}

// ---------------------------------------------------------------------------
// Reminder schedule (drives the hourly cron endpoint, api/cron/reminders)
// ---------------------------------------------------------------------------

export async function saveReminderConfig(formData: FormData): Promise<void> {
  if (demoMode()) fail(DEMO_MSG, HOUSEHOLD);
  try {
    await requireAdminAction();
  } catch {
    fail("You need to be signed in to edit the schedule.", HOUSEHOLD);
  }

  const enabled = formData.get("enabled") === "on" ? 1 : 0;
  const sendHour = Number(formData.get("send_hour"));
  const firstDays = Number(formData.get("first_days"));
  const urgentDays = Number(formData.get("urgent_days"));

  if (!Number.isInteger(sendHour) || sendHour < 0 || sendHour > 23) {
    fail("Send hour must be between 0 and 23.", HOUSEHOLD);
  }
  if (!Number.isInteger(firstDays) || firstDays < 1 || firstDays > 30) {
    fail("Heads-up reminder must be 1–30 days before due.", HOUSEHOLD);
  }
  if (!Number.isInteger(urgentDays) || urgentDays < 0 || urgentDays > 30) {
    fail("Urgent reminder window must be 0–30 days.", HOUSEHOLD);
  }
  if (urgentDays >= firstDays) {
    fail("The urgent window must be smaller than the heads-up day.", HOUSEHOLD);
  }

  const existing = await query<RowDataPacket>(
    "SELECT id FROM reminder_config ORDER BY id DESC LIMIT 1",
  );
  if (existing.length > 0) {
    await execute(
      `UPDATE reminder_config
       SET enabled = ?, send_hour = ?, first_reminder_days = ?, urgent_reminder_days = ?
       WHERE id = ?`,
      [enabled, sendHour, firstDays, urgentDays, existing[0].id],
    );
  } else {
    await execute(
      `INSERT INTO reminder_config (enabled, send_hour, first_reminder_days, urgent_reminder_days)
       VALUES (?, ?, ?, ?)`,
      [enabled, sendHour, firstDays, urgentDays],
    );
  }

  done("Reminder schedule saved.", HOUSEHOLD);
}
