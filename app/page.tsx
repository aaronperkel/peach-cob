import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  Bill,
  billFileHref,
  getBillsForPage,
  getOwedPairs,
  getTotalBillCount,
  getUserNextDue,
  getUserOwedAmount,
  getUserOwedBillIds,
} from "@/lib/bills";
import DueChip from "@/app/components/DueChip";
import Pagination from "@/app/components/Pagination";
import { DownloadIcon, EyeIcon } from "@/app/components/icons";

function formatDayMonth(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function money(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function groupBillsByYear(bills: Bill[]): [string, Bill[]][] {
  const byYear = new Map<string, Bill[]>();
  for (const bill of bills) {
    const year = bill.billDate.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(bill);
  }
  return [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const person = await requireUser();
  const { page } = await searchParams;

  const billsPerPage = Number(process.env.APP_BILLS_PER_PAGE ?? 10);
  const currentPage = Math.max(1, Number(page ?? 1) || 1);

  const [owedAmount, owedBillIds, totalBills, nextDue, bills, owedPairs] = await Promise.all([
    getUserOwedAmount(person.id),
    getUserOwedBillIds(person.id),
    getTotalBillCount(),
    getUserNextDue(person.id),
    getBillsForPage(billsPerPage, (currentPage - 1) * billsPerPage),
    getOwedPairs(),
  ]);

  const totalPages = totalBills > 0 ? Math.ceil(totalBills / billsPerPage) : 1;
  if (currentPage > totalPages && totalBills > 0) redirect(`/?page=${totalPages}`);

  const billsByYear = groupBillsByYear(bills);

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Calendar subscription links, derived from the deployed URL
  const baseUrl = (process.env.APP_BASE_URL ?? "").replace(/\/+$/, "");
  const webcalHref = baseUrl ? baseUrl.replace(/^https?/, "webcal") + "/cal.ics" : "/cal.ics";
  const googleCalHref = baseUrl
    ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalHref)}`
    : null;

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Hi, {person.name}</h1>
          <p className="text-sm text-ink-muted">The ledger as of {today}</p>
        </div>
        <div className="flex gap-2">
          {googleCalHref && (
            <a href={googleCalHref} target="_blank" rel="noopener" className="btn btn-sm">
              Google Calendar
            </a>
          )}
          <a href={webcalHref} className="btn btn-sm">
            Apple Calendar
          </a>
        </div>
      </div>

      <div className="panel panel-awning mb-8 grid divide-y divide-line-soft sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-5 py-4">
          <span className="eyebrow mb-1">You owe</span>
          <div className="figure text-[1.7rem] font-semibold leading-tight">
            ${money(owedAmount)}
          </div>
          <div className="mt-0.5 text-xs text-ink-muted">
            {owedBillIds.size > 0
              ? `across ${owedBillIds.size} unpaid ${owedBillIds.size === 1 ? "bill" : "bills"}`
              : "all settled up"}
          </div>
        </div>
        <div className="px-5 py-4">
          <span className="eyebrow mb-1">Next due</span>
          <div className="figure text-[1.7rem] font-semibold leading-tight">
            {nextDue ? formatDayMonth(nextDue.dueDate) : "—"}
          </div>
          <div className="mt-0.5 text-xs text-ink-muted">
            {nextDue ? nextDue.typeName : "no upcoming payments"}
          </div>
        </div>
        <div className="px-5 py-4">
          <span className="eyebrow mb-1">Bills on record</span>
          <div className="figure text-[1.7rem] font-semibold leading-tight">{totalBills}</div>
          <div className="mt-0.5 text-xs text-ink-muted">since move-in</div>
        </div>
      </div>

      <section className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <span className="eyebrow">The house ledger</span>
          <span className="h-px flex-1 bg-line-soft" aria-hidden="true" />
        </div>
        {owedPairs.length === 0 ? (
          <div className="panel px-5 py-4 text-sm text-ink-muted">
            Everyone&rsquo;s settled up — nothing owed in the house.
          </div>
        ) : (
          <div className="panel divide-y divide-line-soft">
            {owedPairs.map(({ debtor, owner, amount }) => (
              <div
                key={`${debtor}->${owner ?? "house"}`}
                className="flex items-baseline justify-between gap-3 px-5 py-2.5 text-sm"
              >
                <span>
                  <strong className={debtor === person.name ? "text-unpaid" : ""}>
                    {debtor === person.name ? "You" : debtor}
                  </strong>{" "}
                  <span className="text-ink-muted">
                    {debtor === person.name ? "owe" : "owes"}
                  </span>{" "}
                  <strong>{owner === person.name ? "you" : (owner ?? "the house")}</strong>
                </span>
                <span className="figure font-semibold">${money(amount)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {bills.length === 0 ? (
        <div className="panel px-5 py-8 text-center text-sm text-ink-muted">
          No bills on this page.
        </div>
      ) : (
        billsByYear.map(([year, yearBills]) => (
          <section key={year} className="mb-7">
            <div className="mb-2 flex items-center gap-3">
              <span className="eyebrow">{year}</span>
              <span className="h-px flex-1 bg-line-soft" aria-hidden="true" />
            </div>
            <div className="panel overflow-x-auto">
              <table className="data-table table-stack table-stack-bills">
                <thead>
                  <tr>
                    <th>Bill</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th className="num">Amount</th>
                    <th className="num">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {yearBills.map((bill) => {
                    const owedByMe = bill.status !== "paid" && owedBillIds.has(bill.id);
                    const isMine = bill.ownerName === person.name;
                    const fileHref = bill.pdfPath ? billFileHref(bill.pdfPath) : null;
                    return (
                      <tr key={bill.id}>
                        <td className="cell-bill">
                          <div className="font-medium">
                            {bill.typeEmoji} {bill.typeName}
                          </div>
                          <div className="figure text-xs text-ink-muted">
                            {formatDayMonth(bill.billDate)}
                            {bill.ownerName ? ` · ${isMine ? "yours" : `pay ${bill.ownerName}`}` : ""}
                          </div>
                        </td>
                        <td className="cell-due">
                          <DueChip
                            due={bill.dueDate}
                            paid={person.splitsBills ? !owedByMe : bill.status === "paid"}
                          />
                        </td>
                        <td className="cell-status">
                          {/* Non-splitters (the maintainer) see the bill's own state */}
                          {!person.splitsBills ? (
                            <span
                              className={`tag ${bill.status === "paid" ? "tag-paid" : "tag-unpaid"}`}
                            >
                              {bill.status === "paid" ? "Settled" : "Open"}
                            </span>
                          ) : owedByMe ? (
                            <span className="tag tag-unpaid" aria-label="Unpaid by you">
                              Unpaid
                            </span>
                          ) : (
                            <span className="tag tag-paid" aria-label="Paid by you">
                              {isMine ? "Covered" : "Paid"}
                            </span>
                          )}
                        </td>
                        <td className="num cell-amount">
                          <div className="figure font-medium">${money(Number(bill.total))}</div>
                          <div className="figure text-xs text-ink-muted">
                            ${money(Number(bill.perPersonCost))} ea
                          </div>
                        </td>
                        <td className="num cell-actions">
                          {fileHref ? (
                            <div className="flex justify-end gap-1.5">
                              <a
                                href={fileHref}
                                target="_blank"
                                className="btn-icon"
                                title="View bill"
                                aria-label={`View ${bill.typeName} bill`}
                              >
                                <EyeIcon />
                              </a>
                              <a
                                href={fileHref}
                                download
                                className="btn-icon"
                                title="Download bill"
                                aria-label={`Download ${bill.typeName} bill`}
                              >
                                <DownloadIcon />
                              </a>
                            </div>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/" />
    </main>
  );
}
