import type { Config } from "tailwindcss";

/** rgb(var(--x) / <alpha-value>) 헬퍼 — 투명도 유틸(bg-primary/20 등) 지원 */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── 시맨틱 토큰 (라이트/다크 자동 전환) ──
        bg: {
          DEFAULT: v("bg"),
          soft: v("surface-2"),
          card: v("surface"),
          hover: v("surface-3"),
          border: v("border"),
        },
        surface: {
          DEFAULT: v("surface"),
          2: v("surface-2"),
          3: v("surface-3"),
        },
        line: v("border"),
        primary: {
          DEFAULT: v("primary"),
          strong: v("primary-strong"),
        },
        brand: {
          DEFAULT: v("primary"),
          soft: v("primary-strong"),
          glow: v("primary"),
        },
        navy: v("navy"),
        win: v("win"),
        lose: v("lose"),
        up: v("up"),
        // ── 텍스트용 gray (라이트=어둡게 / 다크=밝게 자동 반전) ──
        gray: {
          50: v("g50"),
          100: v("g100"),
          200: v("g200"),
          300: v("g300"),
          400: v("g400"),
          500: v("g500"),
          600: v("g600"),
          700: v("g600"),
          800: v("g200"),
          900: v("g50"),
        },
        tier: {
          bronze: "#b06b3f",
          silver: "#9aa7b4",
          gold: "#e3b23c",
          diamond: "#4fc7e8",
          joker: "#a15bf0",
          ace: "#ff5470",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "sans-serif",
        ],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04)",
        float: "0 4px 12px rgba(16,24,40,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
