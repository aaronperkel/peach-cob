import type { Metadata, Viewport } from "next";
import { Courier_Prime, Fraunces, Karla } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { getCurrentPerson } from "@/lib/auth";
import Nav from "@/app/components/Nav";
import "./globals.css";

// The three voices: Fraunces for display, Karla for prose, Courier Prime as
// the typed ledger face on every figure, date, and section label.
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
  metadataBase: new URL(process.env.APP_BASE_URL ?? "https://peachcob.vercel.app"),
  title: "Peach Cob",
  description: "The house ledger for 404 Parke Ave — bills split, tracked, and settled.",
  authors: [{ name: "Aaron Perkel" }],
  openGraph: {
    title: "Peach Cob",
    description: "The house ledger for 404 Parke Ave — bills split, tracked, and settled.",
    url: "/",
    siteName: "Peach Cob",
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: { capable: true, title: "Peach Cob", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf3e7",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const person = await getCurrentPerson();

  return (
    <html lang="en" className={`${fraunces.variable} ${karla.variable} ${ledger.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <Nav authed={!!person} isAdmin={!!person?.isAdmin} />
        <div className="mx-auto w-full max-w-[1000px] flex-1 px-4 py-8 sm:px-5">
          {children}
        </div>
        <footer className="mx-auto w-full max-w-[1000px] px-4 pb-8 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-4 text-xs text-ink-muted">
            <span className="font-mono font-bold uppercase tracking-[0.12em]">
              Peach Cob · 404 Parke Ave
            </span>
            <span className="flex items-center gap-3">
              <a className="hover:text-ink underline" href="/welcome">
                how this works
              </a>
              <span>
                questions?{" "}
                <a className="hover:text-ink underline" href="mailto:me@aaronperkel.com">
                  me@aaronperkel.com
                </a>
              </span>
            </span>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
