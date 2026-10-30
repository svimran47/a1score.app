import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import containerQueries from "@tailwindcss/container-queries";

// Design tokens are hex values held in CSS variables, so Tailwind cannot apply
// an opacity modifier to `bg-[var(--bg-card)]/95` (it silently emits nothing).
// Named token colours fix that: solid classes stay a plain `var(--x)` (works in
// every browser) and only explicit modifiers like `bg-bg-card/95` use color-mix().
// Tailwind accepts colour functions at runtime; its types only declare strings.
const token = (name: string) =>
  (({ opacityValue }: { opacityValue?: number | string }) => {
    if (opacityValue === undefined) return `var(--${name})`;
    const op = String(opacityValue);
    if (op.includes("--tw-")) return `var(--${name})`;
    return `color-mix(in srgb, var(--${name}) calc(${op} * 100%), transparent)`;
  }) as unknown as string;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "320px",
      sm: "480px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "3xl": "1920px",
      "4xl": "2560px",
      "5xl": "3840px",
    },
    extend: {
      maxWidth: {
        "container-xl": "1280px",
        "container-2xl": "1440px",
        "container-3xl": "1760px",
        "container-4xl": "2200px",
        "container-5xl": "3200px",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "bg-page": token("bg-page"),
        "bg-card": token("bg-card"),
        "bg-chip": token("bg-chip"),
        "bg-hover": token("bg-hover"),
        "bg-elevated": token("bg-elevated"),
        divider: token("divider"),
        "border-subtle": token("border-subtle"),
        "text-primary": token("text-primary"),
        "text-secondary": token("text-secondary"),
        "text-muted": token("text-muted"),
        "accent-contrast": token("accent-contrast"),
        "value-text": token("value-text"),
        "trend-up": token("trend-up"),
        "trend-down": token("trend-down"),
        live: token("live"),
        info: token("info"),
        highlight: token("highlight"),
        ink: {
          950: "var(--ink-950)",
          900: "var(--ink-900)",
          800: "var(--ink-800)",
          700: "var(--ink-700)",
          850: "#121724",
          600: "#313E56",
        },
        surface: {
          50: "#f8fafc",
          100: "#f1f5f9",
          800: "var(--ink-800)",
          900: "var(--ink-900)",
          950: "var(--ink-950)",
        },
        brand: {
          50: "var(--violet-50)",
          100: "#ede4ff",
          400: "var(--violet-400)",
          500: "var(--violet-500)",
          600: "var(--violet-600)",
          700: "var(--violet-700)",
        },
        pitch: {
          50: "#ecfdf5",
          100: "#d1fae5",
          400: "#34d399",
          500: "var(--green-500)",
          600: "#059669",
          700: "#047857",
        },
        accent: {
          DEFAULT: token("accent"),
          contrast: token("accent-contrast"),
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
        },
      },
      borderRadius: {
        card: "var(--card-radius)",
        chip: "var(--chip-radius)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      backdropBlur: {
        xs: "2px",
      },
      // Named so `duration-fast` stays unambiguous next to tailwindcss-animate's
      // animation-duration utility (an arbitrary `duration-[var(--x)]` is not).
      transitionDuration: {
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        editorial: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [animate, containerQueries],
};
export default config;
