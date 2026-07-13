import { ImageResponse } from "next/og";

// Home-screen icon, generated at request time so no binary lives in the repo.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf3e7",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 64 64">
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
      </div>
    ),
    size,
  );
}
