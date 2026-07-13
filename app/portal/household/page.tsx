import { getPeopleDetails, requireAdmin } from "@/lib/auth";
import { getBillTypes } from "@/lib/bills";
import { getReminderConfig } from "@/lib/reminders";
import PortalTabs from "@/app/portal/PortalTabs";
import BillTypesSection from "@/app/portal/BillTypesSection";
import RemindersSection from "@/app/portal/RemindersSection";
import UsersSection, { PersonDetail } from "@/app/portal/UsersSection";

export default async function HouseholdPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  // Single round-trip wave; requireAdmin's redirect throws on failure and the
  // fetched data is discarded unrendered.
  const [, billTypes, reminderConfig, peopleDetails] = await Promise.all([
    requireAdmin(),
    getBillTypes(),
    getReminderConfig(),
    getPeopleDetails(),
  ]);

  const people = peopleDetails as PersonDetail[];

  return (
    <main>
      <PortalTabs active="household" />

      {err && <div className="flash flash-err">{err}</div>}
      {ok && <div className="flash flash-ok">{ok}</div>}

      <UsersSection people={people} />

      <BillTypesSection
        billTypes={billTypes.map((t) => ({
          id: t.id,
          name: t.name,
          emoji: t.emoji,
          processingFee: Number(t.processingFee),
          ownerId: t.ownerId,
          ownerName: t.ownerName,
        }))}
        people={people.map((p) => ({ id: p.id, name: p.name }))}
      />

      <RemindersSection config={reminderConfig} />
    </main>
  );
}
