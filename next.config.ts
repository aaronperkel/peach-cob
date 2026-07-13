import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mysql2 must stay a Node dependency, not get bundled
  serverExternalPackages: ["mysql2", "nodemailer"],
  experimental: {
    // Reuse a page's RSC payload for 30s of client-side navigation, so
    // bouncing between Home/Portal doesn't re-query the DB each time.
    // Server actions revalidatePath, which purges this cache after mutations.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
