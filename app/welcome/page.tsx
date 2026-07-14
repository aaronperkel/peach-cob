import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import Tour from "./Tour";

export const metadata: Metadata = { title: "Welcome — Peach Cob" };

// First-timers land here straight from login (app/login/actions.ts redirects
// while people.welcomed_at is NULL); afterwards it stays reachable from the
// footer's "how this works" link.
export default async function WelcomePage() {
  const person = await requireUser();
  return <Tour name={person.name} />;
}
