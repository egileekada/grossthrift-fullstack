/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      backgroundColor: {
        white: "rgb(var(--color-white-rgb, 23 32 27) / <alpha-value>)",
      },
      borderColor: {
        DEFAULT: "rgb(var(--color-border-rgb, 35 44 38) / <alpha-value>)",
        border: "rgb(var(--color-border-rgb, 35 44 38) / <alpha-value>)",
      },
      divideColor: {
        DEFAULT: "rgb(var(--color-border-rgb, 35 44 38) / <alpha-value>)",
        border: "rgb(var(--color-border-rgb, 35 44 38) / <alpha-value>)",
      },
      colors: {
        // GrossThrift brand design tokens with full Tailwind v3 opacity modifier support (<alpha-value>)
        ink: "rgb(var(--color-ink-rgb, 241 244 240) / <alpha-value>)",
        slate: "rgb(var(--color-slate-rgb, 151 163 155) / <alpha-value>)",
        dust: "rgb(var(--color-dust-rgb, 115 130 120) / <alpha-value>)",
        charcoal: "rgb(var(--color-charcoal-rgb, 237 243 238) / <alpha-value>)",
        surface: "rgb(var(--color-surface-rgb, 28 38 32) / <alpha-value>)",
        accent: "rgb(var(--color-accent-rgb, 229 124 76) / <alpha-value>)",
        "off-white": "rgb(var(--color-off-white-rgb, 15 21 17) / <alpha-value>)",
        border: "rgb(var(--color-border-rgb, 35 44 38) / <alpha-value>)",

        "dark-bg": "rgb(var(--color-dark-bg-rgb, 20 28 23) / <alpha-value>)",
        "dark-surface": "rgb(var(--color-dark-surface-rgb, 30 38 33) / <alpha-value>)",
        "dark-border": "rgb(var(--color-dark-border-rgb, 46 57 49) / <alpha-value>)",
        "dark-text": "rgb(var(--color-dark-text-rgb, 241 244 240) / <alpha-value>)",
        "dark-muted": "rgb(var(--color-dark-muted-rgb, 115 130 120) / <alpha-value>)",

        "gt-bg": "rgb(var(--color-gt-bg-rgb, 15 21 17) / <alpha-value>)",
        "gt-surface": "rgb(var(--color-gt-surface-rgb, 23 32 27) / <alpha-value>)",
        "gt-text": "rgb(var(--color-gt-text-rgb, 241 244 240) / <alpha-value>)",
        "gt-text-secondary": "rgb(var(--color-gt-text-secondary-rgb, 151 163 155) / <alpha-value>)",
        "gt-text-muted": "rgb(var(--color-gt-text-muted-rgb, 115 130 120) / <alpha-value>)",
        "gt-border": "rgb(var(--color-gt-border-rgb, 35 44 38) / <alpha-value>)",
        "gt-border-hover": "rgb(var(--color-gt-border-hover-rgb, 50 62 53) / <alpha-value>)",
        "gt-charcoal": "rgb(var(--color-gt-charcoal-rgb, 237 243 238) / <alpha-value>)",
        "gt-charcoal-hover": "rgb(var(--color-gt-charcoal-hover-rgb, 255 255 255) / <alpha-value>)",
        "gt-green": "rgb(var(--color-gt-green-rgb, 46 204 113) / <alpha-value>)",
        "gt-green-bg": "rgb(var(--color-gt-green-bg-rgb, 20 40 27) / <alpha-value>)",
        "gt-amber": "rgb(var(--color-gt-amber-rgb, 230 126 34) / <alpha-value>)",
        "gt-red": "rgb(var(--color-gt-red-rgb, 231 76 60) / <alpha-value>)",
        "gt-savings-bg": "rgb(var(--color-gt-savings-bg-rgb, 24 51 33) / <alpha-value>)",
        "gt-savings-text": "rgb(var(--color-gt-savings-text-rgb, 46 204 113) / <alpha-value>)",
        "gt-sage": "rgb(var(--color-gt-sage-rgb, 28 38 32) / <alpha-value>)",
        "gt-accent": "rgb(var(--color-gt-accent-rgb, 46 204 113) / <alpha-value>)",
        "gt-dark": "rgb(var(--color-gt-dark-rgb, 251 250 246) / <alpha-value>)",

        // UI component color tokens
        primary: {
          100: "#f0fdf4",
          150: "#dcfce7",
          250: "#15724c",
          300: "#115c3e",
        },
        secondary: {
          50: "#fbfaf6",
          350: "#1e2621",
          500: "#141c17",
        },
        neutral: {
          150: "#e5e7eb",
          500: "#525c56",
        },
        error: {
          250: "#ef4444",
          300: "#b91c1c",
        },
        grey: {
          "01": "#f9fafb",
          "02": "#e5e7eb",
          "03": "#9ca3af",
          "04": "#4b5563",
          "05": "#111827",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Plus Jakarta Sans", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
        mono: ["JetBrains Mono", "var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "gt-card": "var(--shadow-gt-card, 0 1px 2px rgba(20, 28, 23, 0.02), 0 0 0 1px rgba(20, 28, 23, 0.04))",
        "gt-hover": "var(--shadow-gt-hover, 0 12px 32px rgba(20, 28, 23, 0.06), 0 0 0 1px rgba(20, 28, 23, 0.05))",
        "gt-modal": "var(--shadow-gt-modal, 0 24px 64px rgba(20, 28, 23, 0.12))",
      },
    },
  },
  plugins: [],
};
