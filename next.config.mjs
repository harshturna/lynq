/** @type {import('next').NextConfig} */
const nextConfig = {
  // The e2e suite runs its own `next dev` (TICKET-047); a separate build
  // directory keeps it from corrupting a developer's running dev server.
  ...(process.env.LYNQ_E2E ? { distDir: ".next-e2e" } : {}),
  // next dev would otherwise append its own block to CLAUDE.md, which is ours (TICKET-028).
  agentRules: false,
  async headers() {
    return [
      {
        // The tracker (design §8.1): edge-cached, refreshed within five minutes
        // of a deploy; the hashed twin is immutable for pinned installs.
        source: "/js/lynq.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/js/lynq-:chunk(extras|vitals).js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/js/lynq.:hash([0-9a-f]{12}).js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
