// Every URL on the old site lands here: the household moved to Lejer.
const LEJER = "https://uselejer.com/peach-cob";

export default function Moved() {
  return (
    <main className="mx-auto w-full max-w-[560px] py-10">
      <section className="panel p-6 sm:p-8">
        <p className="eyebrow">404 Parke Ave</p>
        <h1 className="page-title mt-2">Peach Cob moved to Lejer</h1>
        <p className="mt-4">
          The house ledger, who owes whom, and every bill PDF now live at{" "}
          <a className="underline" href={LEJER}>
            uselejer.com/peach-cob
          </a>
          .
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          <li>Sign in there with the same email you used here. A code is emailed to you, like before.</li>
          <li>
            Re-add the calendar from <strong>Account</strong>. This site&rsquo;s calendar link no longer
            updates.
          </li>
        </ol>
        <p className="mt-4 text-sm text-ink-muted">This site is closed. Nothing here changes anymore.</p>
        <a className="btn btn-primary mt-6" href={LEJER}>
          Open Peach Cob on Lejer →
        </a>
      </section>
    </main>
  );
}
