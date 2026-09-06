import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
      },
      colors: {
        // Lynq tokens (design §3, D-008)
        canvas: "var(--canvas)",
        soft: { DEFAULT: "var(--soft)", 2: "var(--soft-2)" },
        ink: { DEFAULT: "var(--ink)", 2: "var(--ink-2)" },
        mute: "var(--mute)",
        faint: "var(--faint)",
        rule: { DEFAULT: "var(--rule)", strong: "var(--rule-strong)" },
        teal: {
          DEFAULT: "var(--teal)",
          ink: "var(--teal-ink)",
          soft: "var(--teal-soft)",
          bar: "var(--teal-bar)",
          2: "var(--teal-2)",
          3: "var(--teal-3)",
        },
        good: { DEFAULT: "var(--good)", soft: "var(--good-soft)" },
        warn: { DEFAULT: "var(--warn)", soft: "var(--warn-soft)" },
        poor: { DEFAULT: "var(--poor)", soft: "var(--poor-soft)" },
        compare: "var(--compare)",
        scrim: "var(--scrim)",
      },
      borderRadius: {
        // design §3 radius scale
        chip: "4px",
        control: "6px",
        card: "8px",
      },
    },
  },
  plugins: [],
};
export default config;
