import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  billFileHref,
  getBillsForPage,
  getBillTypes,
  getOwedPairs,
  getOwingByBill,
  getSplitters,
  getTotalBillCount,
} from "@/lib/bills";
import DueChip from "@/app/components/DueChip";
import Pagination from "@/app/components/Pagination";
import { DownloadIcon, EyeIcon } from "@/app/components/icons";
import PortalTabs from "@/app/portal/PortalTabs";
import AddBillForm from "@/app/portal/AddBillForm";
import PaymentCheckboxes from "@/app/portal/PaymentCheckboxes";
import ReminderButton from "@/app/portal/ReminderButton";

function money(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDayMonth(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; ok?: string; err?: string }>;
}) {
  const { page, ok, err } = await searchParams;

  const billsPerPage = Number(process.env.APP_BILLS_PER_PAGE ?? 10);
  const currentPage = Math.max(1, Number(page ?? 1) || 1);

  // One round-trip wave for everything except who-owes (which needs the bill
  // ids). requireAdmin joins the batch: on failure its redirect throws and
  // the fetched data is discarded unrendered.
  const [, billTypes, owedPairs, totalBills, allSplitters, bills] = await Promise.all([
    requireAdmin(),
    getBillTypes(),
    getOwedPairs(),
    getTotalBillCount(),
    getSplitters(),
    getBillsForPage(billsPerPage, (currentPage - 1) * billsPerPage),
  ]);

  const totalPages = totalBills > 0 ? Math.ceil(totalBills / billsPerPage) : 1;
  if (currentPage > totalPages && totalBills > 0) redirect(`/portal?page=${totalPages}`);

  // One query for "who still owes" across every bill on this page
  const owingByBill = await getOwingByBill(bills.map((b) => b.id));

  return (
    <main>
      <PortalTabs active="bills" />

      {err && <div className="flash flash-err">{err}</div>}
      {ok && <div className="flash flash-ok">{ok}</div>}

      {owedPairs.length > 0 && (
        <section className="mb-7">
          <div className="mb-2 flex items-center gap-3">
            <span className="eyebrow">Still owed</span>
            <span className="h-px flex-1 bg-line-soft" aria-hidden="true" />
          </div>
          <div className="panel grid grid-cols-1 sm:grid-cols-2 lg:flex sm:divide-x sm:divide-line-soft divide-y divide-line-soft sm:divide-y-0">
            {owedPairs.map(({ debtor, owner, amount }) => (
              <div key={`${debtor}->${owner ?? "house"}`} className="px-5 py-3 lg:flex-1">
                <span className="eyebrow mb-0.5">
                  {debtor} → {owner ?? "house"}
                </span>
                <div className="figure font-semibold text-unpaid">${money(amount)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <AddBillForm
        billTypes={billTypes.map((t) => ({
          name: t.name,
          emoji: t.emoji,
          processingFee: Number(t.processingFee),
          ownerName: t.ownerName,
        }))}
        peopleCount={allSplitters.length}
      />

      <div className="panel overflow-x-auto">
        <table className="data-table table-stack table-stack-owes">
          <thead>
            <tr>
              <th>Bill</th>
              <th>Due</th>
              <th>Status</th>
              <th>Paid back</th>
              <th className="num">Amount</th>
              <th className="num">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-ink-muted">
                  No bills on this page.
                </td>
              </tr>
            ) : (
              bills.map((bill) => {
                const owing = owingByBill.get(bill.id) ?? new Set<number>();
                // The owner fronted the provider, so she's not part of the
                // pay-back checklist for her own bill.
                const splitters = allSplitters.filter((p) => p.id !== bill.ownerId);
                const paidIds = splitters
                  .filter((p) => bill.status === "paid" || !owing.has(p.id))
                  .map((p) => p.id);
                const fileHref = bill.pdfPath ? billFileHref(bill.pdfPath) : null;
                return (
                  <tr key={bill.id}>
                    <td className="cell-bill">
                      <div className="font-medium">
                        {bill.typeEmoji} {bill.typeName}
                      </div>
                      <div className="figure text-xs text-ink-muted">
                        {formatDayMonth(bill.billDate)}
                        {bill.ownerName ? ` · ${bill.ownerName}'s account` : ""}
                      </div>
                    </td>
                    <td className="cell-due">
                      <DueChip due={bill.dueDate} paid={bill.status === "paid"} />
                    </td>
                    <td className="cell-status">
                      <span className={`tag ${bill.status === "paid" ? "tag-paid" : "tag-unpaid"}`}>
                        {bill.status === "paid" ? "Settled" : "Open"}
                      </span>
                    </td>
                    <td className="cell-owes">
                      {/* The column header is hidden on phones; label the checkboxes inline */}
                      <span className="eyebrow mb-1.5 sm:hidden">
                        Paid {bill.ownerName ?? "back"}
                      </span>
                      {splitters.length > 0 ? (
                        <PaymentCheckboxes
                          billId={bill.id}
                          people={splitters}
                          initialPaidIds={paidIds}
                        />
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="num cell-amount">
                      <div className="figure font-medium">${money(Number(bill.total))}</div>
                      <div className="figure text-xs text-ink-muted">
                        ${money(Number(bill.perPersonCost))} ea
                      </div>
                    </td>
                    <td className="num cell-actions">
                      <div className="flex justify-end gap-1.5">
                        {fileHref && (
                          <>
                            <a href={fileHref} target="_blank" className="btn-icon" title="View bill">
                              <EyeIcon />
                            </a>
                            <a href={fileHref} download className="btn-icon" title="Download bill">
                              <DownloadIcon />
                            </a>
                          </>
                        )}
                        {bill.status !== "paid" && <ReminderButton billId={bill.id} />}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/portal" />
    </main>
  );
}
