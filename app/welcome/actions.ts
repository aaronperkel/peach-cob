"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { execute } from "@/lib/db";
import { demoMode } from "@/lib/demo";

/** Stamp the tour as seen (first visit only) and open the ledger. */
export async function finishWelcome(): Promise<void> {
  if (!demoMode()) {
    const person = await requireUser();
    if (!person.welcomedAt) {
      await execute("UPDATE people SET welcomed_at = UTC_TIMESTAMP() WHERE id = ?", [
        person.id,
      ]);
    }
  }
  redirect("/");
}
