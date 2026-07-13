import { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";

export interface Bill extends RowDataPacket {
  id: number;
  typeName: string;
  typeEmoji: string;
  ownerId: number | null; // the roommate the others pay back for this bill
  ownerName: string | null;
  billDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  total: number;
  perPersonCost: number;
  status: "paid" | "unpaid";
  pdfPath: string | null;
  addedByName: string | null;
}

export interface BillType extends RowDataPacket {
  id: number;
  name: string;
  emoji: string;
  processingFee: number;
  ownerId: number | null;
  ownerName: string | null;
}

const BILL_SELECT = `
  SELECT b.id, t.name AS typeName, t.emoji AS typeEmoji,
         t.owner_id AS ownerId, po.name AS ownerName,
         b.bill_date AS billDate, b.due_date AS dueDate,
         b.total, b.per_person_cost AS perPersonCost, b.status,
         b.pdf_path AS pdfPath, pa.name AS addedByName
  FROM bills b
  JOIN bill_types t ON t.id = b.type_id
  LEFT JOIN people po ON po.id = t.owner_id
  LEFT JOIN people pa ON pa.id = b.added_by_id`;

const BILL_TYPE_SELECT = `
  SELECT t.id, t.name, t.emoji, t.processing_fee AS processingFee,
         t.owner_id AS ownerId, po.name AS ownerName
  FROM bill_types t
  LEFT JOIN people po ON po.id = t.owner_id`;

export async function getBillTypes(): Promise<BillType[]> {
  return query<BillType>(`${BILL_TYPE_SELECT} ORDER BY t.name`);
}

export async function getBillTypeByName(name: string): Promise<BillType | null> {
  const rows = await query<BillType>(`${BILL_TYPE_SELECT} WHERE t.name = ?`, [name]);
  return rows[0] ?? null;
}

/** type name → emoji map, with the 📄 fallback handled by the caller default. */
export async function getEmojiMap(): Promise<Record<string, string>> {
  try {
    const rows = await query<RowDataPacket>("SELECT name, emoji FROM bill_types");
    return Object.fromEntries(rows.map((r) => [r.name, r.emoji]));
  } catch {
    return {};
  }
}

export function billEmoji(map: Record<string, string>, typeName: string): string {
  return map[typeName] ?? "📄";
}

export async function getTotalBillCount(): Promise<number> {
  const rows = await query<RowDataPacket>("SELECT COUNT(*) AS n FROM bills");
  return Number(rows[0].n);
}

export async function getBillsForPage(limit: number, offset: number): Promise<Bill[]> {
  const safeLimit = Math.max(1, Math.trunc(limit));
  const safeOffset = Math.max(0, Math.trunc(offset));
  return query<Bill>(
    `${BILL_SELECT}
     ORDER BY b.bill_date DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
  );
}

/** Total outstanding for one person across unpaid bills. */
export async function getUserOwedAmount(personId: number): Promise<number> {
  const rows = await query<RowDataPacket>(
    `SELECT SUM(b.per_person_cost) AS owed
     FROM bills b
     JOIN bill_debts d ON b.id = d.bill_id
     WHERE d.person_id = ? AND b.status <> 'paid'`,
    [personId],
  );
  return Number(rows[0]?.owed ?? 0);
}

/** Bill IDs the person still owes on (bills not globally paid). */
export async function getUserOwedBillIds(personId: number): Promise<Set<number>> {
  const rows = await query<RowDataPacket>(
    `SELECT d.bill_id AS billId
     FROM bill_debts d
     JOIN bills b ON d.bill_id = b.id
     WHERE d.person_id = ? AND b.status <> 'paid'`,
    [personId],
  );
  return new Set(rows.map((r) => Number(r.billId)));
}

/** The person's earliest-due unpaid bill (dashboard "next due" cell). */
export async function getUserNextDue(
  personId: number,
): Promise<{ dueDate: string; typeName: string } | null> {
  const rows = await query<RowDataPacket>(
    `SELECT b.due_date AS dueDate, t.name AS typeName
     FROM bill_debts d
     JOIN bills b ON d.bill_id = b.id
     JOIN bill_types t ON t.id = b.type_id
     WHERE d.person_id = ? AND b.status <> 'paid'
     ORDER BY b.due_date ASC
     LIMIT 1`,
    [personId],
  );
  return rows[0] ? { dueDate: rows[0].dueDate, typeName: rows[0].typeName } : null;
}

export interface OwedPair {
  debtor: string;
  owner: string | null; // null when the bill type has no owner configured
  amount: number;
}

/**
 * The house ledger: who owes whom how much, summed across unpaid bills.
 * Debts on a bill run to the bill type's owner (she fronted the provider).
 */
export async function getOwedPairs(): Promise<OwedPair[]> {
  const rows = await query<RowDataPacket>(
    `SELECT p.name AS debtor, po.name AS owner, SUM(b.per_person_cost) AS amount
     FROM bill_debts d
     JOIN bills b ON d.bill_id = b.id
     JOIN bill_types t ON t.id = b.type_id
     JOIN people p ON d.person_id = p.id
     LEFT JOIN people po ON po.id = t.owner_id
     WHERE b.status = 'unpaid'
     GROUP BY p.name, po.name
     HAVING amount > 0
     ORDER BY p.name, po.name`,
  );
  return rows.map((r) => ({
    debtor: String(r.debtor),
    owner: r.owner == null ? null : String(r.owner),
    amount: Number(r.amount),
  }));
}

export async function getAllPeople(): Promise<{ id: number; name: string }[]> {
  const rows = await query<RowDataPacket>(
    "SELECT id, name FROM people ORDER BY name ASC",
  );
  return rows.map((r) => ({ id: Number(r.id), name: r.name }));
}

/** The people bills are split among (excludes sign-in-only accounts like the maintainer). */
export async function getSplitters(): Promise<{ id: number; name: string }[]> {
  const rows = await query<RowDataPacket>(
    "SELECT id, name FROM people WHERE splits_bills = 1 ORDER BY name ASC",
  );
  return rows.map((r) => ({ id: Number(r.id), name: r.name }));
}

/** Map a stored pdf_path (e.g. "2026/Gas/0623.pdf") to the auth-gated file route. */
export function billFileHref(pdfPath: string): string {
  return "/files/" + pdfPath;
}
