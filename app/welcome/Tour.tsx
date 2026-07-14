"use client";

import { useEffect, useState } from "react";
import SubmitButton from "@/app/components/SubmitButton";
import { finishWelcome } from "./actions";

/*
 * The welcome tour: five animated vignettes that walk a first-time resident
 * through the life of a bill. Scenes are built from the site's own visual
 * vocabulary (panels, tags, due chips, ledger figures) and stagger in via the
 * .tour-* animation classes in globals.css. The show auto-advances like a
 * little film until the viewer touches any control, and never auto-plays for
 * prefers-reduced-motion.
 */

const AUTO_ADVANCE_MS = 6500;

function SceneOwners() {
  const owners = [
    { emoji: "🛜", type: "Wifi", name: "Abby" },
    { emoji: "⚡", type: "Electric", name: "Ava" },
    { emoji: "🔥", type: "Gas", name: "Caroline" },
    { emoji: "💧", type: "Water", name: "Brenda" },
  ];
  return (
    <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4">
      {owners.map((o, i) => (
        <div
          key={o.type}
          className="tour-pop panel flex flex-col items-center gap-1 px-2 py-3 text-center"
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          <span className="text-2xl" aria-hidden="true">
            {o.emoji}
          </span>
          <span className="eyebrow">{o.type}</span>
          <span className="text-sm font-semibold">{o.name}</span>
        </div>
      ))}
    </div>
  );
}

function ScenePost() {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="tour-slide panel flex items-center gap-3 px-4 py-3">
        <span className="text-xl" aria-hidden="true">
          ⚡
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Electric</div>
          <div className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
            posted by Ava
          </div>
        </div>
        <span className="figure text-lg font-bold">$104.12</span>
        <span className="due-chip due-soon">due Jul 20</span>
      </div>
      <div
        className="tour-pop figure text-sm text-ink-muted"
        style={{ animationDelay: "0.6s" }}
        aria-hidden="true"
      >
        ÷ 4
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {["Abby", "Ava", "Caroline", "Brenda"].map((n, i) => (
          <span
            key={n}
            className="tour-pop tag bg-peri-soft text-peri"
            style={{ animationDelay: `${0.9 + i * 0.15}s` }}
          >
            {n} · $26.03
          </span>
        ))}
      </div>
    </div>
  );
}

function SceneLedger() {
  const debtors = ["Abby", "Caroline", "Brenda"];
  return (
    <div className="w-full max-w-xs">
      <span className="eyebrow mb-2 text-center">The house ledger</span>
      <div className="panel divide-y divide-line-soft">
        {debtors.map((name, i) => (
          <div
            key={name}
            className="tour-slide flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            <span className="font-semibold">{name}</span>
            <span className="text-ink-muted">owes Ava</span>
            <span className="figure font-bold">$26.03</span>
          </div>
        ))}
      </div>
      <p
        className="tour-pop mt-3 text-center text-xs text-ink-muted"
        style={{ animationDelay: "1.1s" }}
      >
        Ava fronted the whole bill, so her share is already covered.
      </p>
    </div>
  );
}

function ScenePaid() {
  const debtors = ["Abby", "Caroline", "Brenda"];
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="panel w-full max-w-xs divide-y divide-line-soft">
        {debtors.map((name, i) => (
          <div key={name} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span>{name} paid Ava back</span>
            <span
              className="tour-check inline-flex h-5 w-5 items-center justify-center rounded-(--radius-sm) bg-paid-soft font-mono text-xs font-bold text-paid"
              style={{ animationDelay: `${0.3 + i * 0.55}s` }}
            >
              ✓
            </span>
          </div>
        ))}
      </div>
      <span
        className="tour-stamp tag tag-paid px-3 py-1 text-sm"
        style={{ animationDelay: "2s" }}
      >
        Paid
      </span>
    </div>
  );
}

function SceneReminders() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-2.5">
      <div className="tour-slide panel flex items-center gap-3 px-4 py-3 text-sm">
        <span aria-hidden="true">📬</span>
        <div className="leading-snug">
          <div className="font-semibold">Heads-up: Electric is due in a week</div>
          <div className="text-xs text-ink-muted">a friendly email, seven days out</div>
        </div>
      </div>
      <div
        className="tour-slide panel flex items-center gap-3 px-4 py-3 text-sm"
        style={{ animationDelay: "0.45s" }}
      >
        <span aria-hidden="true">⏰</span>
        <div className="leading-snug">
          <div className="font-semibold">Urgent: Electric is due in 3 days</div>
          <div className="text-xs text-ink-muted">a louder nudge when it&apos;s close</div>
        </div>
      </div>
      <div
        className="tour-slide panel flex items-center gap-3 px-4 py-3 text-sm"
        style={{ animationDelay: "0.9s" }}
      >
        <span aria-hidden="true">📅</span>
        <div className="leading-snug">
          <div className="font-semibold">Every due date on your calendar</div>
          <div className="text-xs text-ink-muted">subscribe once from the front page</div>
        </div>
      </div>
    </div>
  );
}

const STEPS: { title: string; body: string; scene: React.ReactNode }[] = [
  {
    title: "Every utility has an owner",
    body: "Each account is in one girl's name, and she pays the provider directly every month. Peach Cob knows who owns what.",
    scene: <SceneOwners />,
  },
  {
    title: "She posts the bill",
    body: "When a bill lands, its owner posts it in the Portal — PDF and all — and the total splits evenly across the four of you.",
    scene: <ScenePost />,
  },
  {
    title: "Everyone else pays her back",
    body: "The owner already fronted the whole thing, so the other three owe her their shares. The front page always shows who owes whom.",
    scene: <SceneLedger />,
  },
  {
    title: "Check it off",
    body: "Pay her back however you like (Venmo counts), then tick your box in the Portal. When the last share settles, the bill stamps paid.",
    scene: <ScenePaid />,
  },
  {
    title: "You won't have to remember",
    body: "Peach Cob emails a heads-up a week before each due date and an urgent nudge when it's close — no chasing, no spreadsheets.",
    scene: <SceneReminders />,
  },
];

export default function Tour({ name }: { name: string }) {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const last = STEPS.length - 1;

  useEffect(() => {
    if (!auto || step >= last) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setStep((s) => Math.min(s + 1, last)), AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [auto, step, last]);

  const goTo = (s: number) => {
    setAuto(false);
    setStep(Math.max(0, Math.min(last, s)));
  };

  return (
    <main className="mx-auto max-w-xl py-6 sm:py-10">
      <div className="mb-6 text-center">
        <span className="eyebrow mb-2">Welcome to the house ledger</span>
        <h1 className="display text-3xl font-semibold tracking-tight">Hi, {name} 🍑</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Here&apos;s how Peach Cob works — it takes about thirty seconds.
        </p>
      </div>

      <div className="panel panel-awning overflow-hidden">
        {/* key={step} remounts the scene so its entrance animation replays */}
        <div
          key={step}
          className="flex min-h-[230px] items-center justify-center px-5 py-6 sm:px-8"
        >
          {STEPS[step].scene}
        </div>
        <div className="border-t border-line-soft px-5 py-5 sm:px-8">
          <span className="eyebrow">
            Step {step + 1} of {STEPS.length}
          </span>
          <h2 className="display mt-1 text-xl font-semibold">{STEPS[step].title}</h2>
          <p className="mt-1.5 text-sm text-ink-muted">{STEPS[step].body}</p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  aria-current={i === step ? "step" : undefined}
                  onClick={() => goTo(i)}
                  className={`h-2.5 w-2.5 cursor-pointer rounded-full transition-colors duration-100 ${
                    i === step ? "bg-accent" : "bg-line hover:bg-ink-muted"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button type="button" className="btn btn-sm" onClick={() => goTo(step - 1)}>
                  Back
                </button>
              )}
              {step < last ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => goTo(step + 1)}
                >
                  Next
                </button>
              ) : (
                <form action={finishWelcome}>
                  <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Opening…">
                    Open the ledger →
                  </SubmitButton>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {step < last && (
        <form action={finishWelcome} className="mt-4 text-center">
          <button
            type="submit"
            className="cursor-pointer text-sm text-ink-muted underline hover:text-ink"
          >
            Skip the tour — take me to the ledger
          </button>
        </form>
      )}
    </main>
  );
}
