// Demo mode: set APP_DEMO_MODE=1 to run the whole site off this in-memory
// dataset — no database, no login (everyone browses as Abby). For showing
// the site before the real DB exists. Mutations are politely refused.
// Dates are relative to "today" so the demo never looks stale.

export function demoMode(): boolean {
  return process.env.APP_DEMO_MODE === "1";
}

/** YYYY-MM-DD for today + offsetDays. */
function ymd(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export interface DemoPerson {
  id: number;
  name: string;
  email: string;
  isAdmin: number;
  splitsBills: number;
}

export const DEMO_PEOPLE: DemoPerson[] = [
  { id: 1, name: "Abby", email: "abby@example.com", isAdmin: 1, splitsBills: 1 },
  { id: 2, name: "Ava", email: "ava@example.com", isAdmin: 1, splitsBills: 1 },
  { id: 3, name: "Caroline", email: "caroline@example.com", isAdmin: 1, splitsBills: 1 },
  { id: 4, name: "Brenda", email: "brenda@example.com", isAdmin: 1, splitsBills: 1 },
  { id: 5, name: "Aaron", email: "me@aaronperkel.com", isAdmin: 1, splitsBills: 0 },
];

/** Who the demo visitor is signed in as. */
export const DEMO_VIEWER = DEMO_PEOPLE[0]; // Abby

export const DEMO_BILL_TYPES = [
  { id: 1, name: "Electric", emoji: "⚡", processingFee: 0, ownerId: 2, ownerName: "Ava" },
  { id: 2, name: "Gas", emoji: "🔥", processingFee: 0, ownerId: 3, ownerName: "Caroline" },
  { id: 3, name: "Water", emoji: "💧", processingFee: 0, ownerId: 4, ownerName: "Brenda" },
  { id: 4, name: "Wifi", emoji: "🛜", processingFee: 0, ownerId: 1, ownerName: "Abby" },
];

export const DEMO_BILLS = [
  {
    id: 1,
    typeName: "Gas",
    typeEmoji: "🔥",
    ownerId: 3,
    ownerName: "Caroline",
    billDate: ymd(-11),
    dueDate: ymd(5),
    total: 62.4,
    perPersonCost: 15.6,
    status: "unpaid" as const,
    pdfPath: null,
    addedByName: "Caroline",
  },
  {
    id: 2,
    typeName: "Wifi",
    typeEmoji: "🛜",
    ownerId: 1,
    ownerName: "Abby",
    billDate: ymd(-12),
    dueDate: ymd(12),
    total: 79.99,
    perPersonCost: 20.0,
    status: "unpaid" as const,
    pdfPath: null,
    addedByName: "Abby",
  },
  {
    id: 3,
    typeName: "Water",
    typeEmoji: "💧",
    ownerId: 4,
    ownerName: "Brenda",
    billDate: ymd(-3),
    dueDate: ymd(19),
    total: 43.16,
    perPersonCost: 10.79,
    status: "unpaid" as const,
    pdfPath: null,
    addedByName: "Brenda",
  },
  {
    id: 4,
    typeName: "Electric",
    typeEmoji: "⚡",
    ownerId: 2,
    ownerName: "Ava",
    billDate: ymd(-38),
    dueDate: ymd(-23),
    total: 104.12,
    perPersonCost: 26.03,
    status: "paid" as const,
    pdfPath: null,
    addedByName: "Ava",
  },
];

/** billId → personIds who still owe (Ava already paid Abby back for Wifi). */
export const DEMO_DEBTS = new Map<number, Set<number>>([
  [1, new Set([1, 2, 4])],
  [2, new Set([3, 4])],
  [3, new Set([1, 2, 3])],
]);

export function demoOwedBillIds(personId: number): Set<number> {
  const ids = new Set<number>();
  for (const [billId, owing] of DEMO_DEBTS) {
    if (owing.has(personId)) ids.add(billId);
  }
  return ids;
}

export function demoOwedAmount(personId: number): number {
  let sum = 0;
  for (const billId of demoOwedBillIds(personId)) {
    sum += DEMO_BILLS.find((b) => b.id === billId)?.perPersonCost ?? 0;
  }
  return Math.round(sum * 100) / 100;
}

export function demoNextDue(personId: number): { dueDate: string; typeName: string } | null {
  const owed = DEMO_BILLS
    .filter((b) => demoOwedBillIds(personId).has(b.id))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return owed[0] ? { dueDate: owed[0].dueDate, typeName: owed[0].typeName } : null;
}

export function demoOwedPairs(): { debtor: string; owner: string | null; amount: number }[] {
  const byPair = new Map<string, { debtor: string; owner: string | null; amount: number }>();
  for (const [billId, owing] of DEMO_DEBTS) {
    const bill = DEMO_BILLS.find((b) => b.id === billId);
    if (!bill || bill.status === "paid") continue;
    for (const personId of owing) {
      const debtor = DEMO_PEOPLE.find((p) => p.id === personId)?.name ?? "?";
      const key = `${debtor}->${bill.ownerName}`;
      const entry = byPair.get(key) ?? { debtor, owner: bill.ownerName, amount: 0 };
      entry.amount = Math.round((entry.amount + bill.perPersonCost) * 100) / 100;
      byPair.set(key, entry);
    }
  }
  return [...byPair.values()].sort(
    (a, b) => a.debtor.localeCompare(b.debtor) || (a.owner ?? "").localeCompare(b.owner ?? ""),
  );
}
