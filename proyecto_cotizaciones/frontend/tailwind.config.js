/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/styles/**/*.css",
  ],
  theme: {
    extend: {
      /* =========================
         BORDER RADIUS (UNIFICADO)
      ========================= */
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem", // cards, tabs, modals
      },

      /* =========================
         COLORS (CORPORATIVO)
      ========================= */
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },

        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },

        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },

        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },

        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        /* Branding */
        brand: {
          DEFAULT: "#1E40AF",
          light: "#3B82F6",
          dark: "#1E3A8A",
        },

        neutral: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },

        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
      },

      /* =========================
         TYPOGRAPHY SYSTEM
      ========================= */
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },

      fontSize: {
        xs: ["11px", { lineHeight: "1.4" }],      // tablas
        sm: ["12px", { lineHeight: "1.5" }],      // botones / labels
        base: ["14px", { lineHeight: "1.6" }],    // contenido
        lg: ["16px", { lineHeight: "1.6" }],      // subtítulos
        xl: ["18px", { lineHeight: "1.6" }],      // títulos
        kpi: ["20px", { lineHeight: "1.4" }],     // métricas
      },

      letterSpacing: {
        tightest: "-0.02em",
        wide: "0.04em",
        widest: "0.12em",
      },

      /* =========================
         SHADOWS (PRO)
      ========================= */
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.04)",
        card: "0 4px 12px rgba(0,0,0,0.06)",
        elevated: "0 12px 32px rgba(0,0,0,0.12)",
      },

      /* =========================
         ANIMATIONS (SOBRIAS)
      ========================= */
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },

      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
