import { redirect } from "next/navigation";
import { RowDataPacket } from "mysql2";
import { query } from "@/lib/db";
import { DEMO_PEOPLE, DEMO_VIEWER, demoMode } from "@/lib/demo";
import { getSessionEmail } from "@/lib/session";

export interface Person extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  isAdmin: number;
  splitsBills: number;
  welcomedAt: string | null; // UTC DATETIME string; null until she finishes /welcome
}

export async function getPersonByEmail(email: string): Promise<Person | null> {
  const rows = await query<Person>(
    "SELECT id, name, email, is_admin AS isAdmin, splits_bills AS splitsBills, welcomed_at AS welcomedAt FROM people WHERE LOWER(email) = ? LIMIT 1",
    [email.toLowerCase()],
  );
  return rows[0] ?? null;
}

/** Current people row for the logged-in email, or null. */
export async function getCurrentPerson(): Promise<Person | null> {
  // Demo mode: everyone browses as the demo viewer, no session, no DB.
  if (demoMode()) return DEMO_VIEWER as unknown as Person;
  const email = await getSessionEmail();
  if (!email) return null;
  return getPersonByEmail(email);
}

/** Halt (redirect to the 403 page) unless the login email is registered in people. */
export async function requireUser(): Promise<Person> {
  const person = await getCurrentPerson();
  if (!person) redirect("/no-access");
  return person;
}

/** Halt unless the current user is an admin. */
export async function requireAdmin(): Promise<Person> {
  const person = await requireUser();
  if (!person.isAdmin) redirect("/no-access");
  return person;
}

/** For server actions: throw instead of redirect so callers get an error result. */
export async function requireAdminAction(): Promise<Person> {
  const person = await getCurrentPerson();
  if (!person || !person.isAdmin) throw new Error("Admin access required.");
  return person;
}

/** name → email map for everyone with a configured address. */
export async function getEmailMap(): Promise<Record<string, string>> {
  if (demoMode()) return Object.fromEntries(DEMO_PEOPLE.map((p) => [p.name, p.email]));
  const rows = await query<RowDataPacket>(
    "SELECT name, email FROM people WHERE email IS NOT NULL AND email != ''",
  );
  return Object.fromEntries(rows.map((r) => [r.name, r.email]));
}

/** Full resident rows for the household tab. */
export async function getPeopleDetails(): Promise<
  { id: number; name: string; email: string | null; isAdmin: number; splitsBills: number }[]
> {
  if (demoMode()) return DEMO_PEOPLE.map((p) => ({ ...p }));
  const rows = await query<RowDataPacket>(
    "SELECT id, name, email, is_admin AS isAdmin, splits_bills AS splitsBills FROM people ORDER BY name ASC",
  );
  return rows as unknown as {
    id: number;
    name: string;
    email: string | null;
    isAdmin: number;
    splitsBills: number;
  }[];
}
