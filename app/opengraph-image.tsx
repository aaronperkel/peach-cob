import { ImageResponse } from "next/og";

// Link-preview card, generated at request time (no binary asset to go stale).
// Satori has no system fonts, so the design leans on shapes + the bundled
// sans: awning stripes, the peach, and typed-ledger lettering.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const STRIPE_A = "#eb9a76";
const STRIPE_B = "#f8e3d3";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#faf3e7",
        }}
      >
        {/* awning stripes */}
        <div style={{ display: "flex", height: 48 }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              style={{ flex: 1, background: i % 2 === 0 ? STRIPE_A : STRIPE_B }}
            />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <svg width="150" height="150" viewBox="0 0 64 64">
            <path
              d="M32 22 C23 15.5 10 20.5 10 33 C10 45 20 54 32 54 C44 54 54 45 54 33 C54 20.5 41 15.5 32 22 Z"
              fill="#eb9a76"
              stroke="#43302b"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M32 22.5 C30 29.5 30 40 33.5 48"
              fill="none"
              stroke="#43302b"
              strokeWidth="2.6"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              d="M32 21.5 C32 17 34 13.5 37.5 11"
              fill="none"
              stroke="#43302b"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M37.5 11 C43 9 48 10.5 50.5 14 C46.5 17.5 40.5 17.5 36.5 15 C36.7 13.5 37 12.2 37.5 11 Z"
              fill="#4e7a52"
              stroke="#43302b"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              color: "#43302b",
              letterSpacing: -2,
            }}
          >
            Peach Cob
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#8a7468",
              letterSpacing: 10,
              textTransform: "uppercase",
            }}
          >
            The house ledger · 404 Parke Ave
          </div>
        </div>
        {/* awning stripes, bottom */}
        <div style={{ display: "flex", height: 48 }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              style={{ flex: 1, background: i % 2 === 0 ? STRIPE_A : STRIPE_B }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
