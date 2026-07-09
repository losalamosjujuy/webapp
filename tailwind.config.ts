import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#f7f2ea",
          100: "#eee1cf",
          200: "#dcc09c",
          300: "#c8a26f",
          400: "#b4874f",
          500: "#9c6d3d",
          600: "#7e5632",
          700: "#604226",
          800: "#46301b",
          900: "#2c1f12"
        },
        clay: "#9f5e42",
        agave: "#5f7563",
        night: "#161514",
        mist: "#f5f4f0"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"]
      },
      boxShadow: {
        card: "0 18px 40px rgba(22, 21, 20, 0.08)"
      },
      backgroundImage: {
        dune: "linear-gradient(135deg, rgba(247,242,234,1) 0%, rgba(238,225,207,1) 100%)",
        plateau:
          "radial-gradient(circle at top, rgba(159,94,66,0.18), transparent 42%), linear-gradient(180deg, #161514 0%, #2c1f12 100%)"
      }
    }
  },
  plugins: []
};

export default config;
