/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // All values below are CSS custom properties defined once in
      // src/styles/tokens.css — this file only maps semantic token
      // names onto Tailwind utility classes (bg-surface, text-accent,
      // font-technical, rounded-md, ...). No raw hex/px values here.
      //
      // Tailwind's own default spacing scale (p-1=4px, p-2=8px,
      // p-3=12px, p-4=16px, p-6=24px, p-8=32px, p-12=48px, p-16=64px)
      // already matches the requested 4/8/12/16/24/32/48/64 scale
      // exactly, so `spacing` is intentionally not overridden here —
      // doing so would just duplicate the same values under a second
      // name.
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        "surface-highest": "var(--color-surface-highest)",
        text: "var(--color-text)",
        "text-secondary": "var(--color-text-secondary)",
        "text-faint": "var(--color-text-faint)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        accent: "var(--color-accent)",
        "accent-foreground": "var(--color-accent-foreground)",
        danger: "var(--color-danger)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        technical: "var(--font-technical)",
      },
      fontSize: {
        "display-lg": "var(--text-display-lg)",
        "display-md": "var(--text-display-md)",
        "display-sm": "var(--text-display-sm)",
        technical: "var(--text-technical)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        elevation: "var(--shadow-elevation)",
        modal: "var(--shadow-modal)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "180ms",
      },
    },
  },
  plugins: [],
}