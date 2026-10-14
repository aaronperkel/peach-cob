import type { Metadata, Viewport } from "next";
import { Courier_Prime, Fraunces, Karla } from "next/font/google";
import "./globals.css";

// Frozen 2026-10-14: the household moved to Lejer (uselejer.com). This root renders the one
// static "moved" page and nothing else — no session, no database, no writes.

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

const karla = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const ledger = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-ledger",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://peachcob.vercel.app"),
  title: "Peach Cob · moved to Lejer",
  description: "404 Parke Ave's house ledger now lives on Lejer.",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf3e7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${karla.variable} ${ledger.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <div className="awning" aria-hidden />
        <div className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-8 sm:px-5">{children}</div>
        <footer className="mx-auto w-full max-w-[1000px] px-4 pb-8 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-4 text-xs text-ink-muted">
            <span className="font-mono font-bold uppercase tracking-[0.12em]">Peach Cob · 404 Parke Ave</span>
            <span>
              questions?{" "}
              <a className="hover:text-ink underline" href="mailto:me@aaronperkel.com">
                me@aaronperkel.com
              </a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
