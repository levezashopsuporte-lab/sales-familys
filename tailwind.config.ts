import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f7f2",
        ink: "#12211a",
        muted: "#68776f",
        line: "#d9e2db",
        card: "#fbfcf9",
        brand: {
          DEFAULT: "#22c55e",
          dark: "#16a34a",
          soft: "#dcfce7",
        },
        accent: "#fff3c8",
      },
      boxShadow: {
        float: "0 24px 70px -28px rgba(17, 24, 39, 0.22)",
        card: "0 14px 40px -28px rgba(15, 23, 42, 0.24)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      backgroundImage: {
        mesh: "radial-gradient(circle at top left, rgba(34,197,94,0.18), transparent 34%), radial-gradient(circle at bottom right, rgba(255,243,200,0.9), transparent 28%)",
      },
    },
  },
  plugins: [],
};

export default config;

