import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        perre: {
          50: "#f4f7f4",
          100: "#e4ebe4",
          200: "#c9d7c9",
          300: "#a3bba3",
          400: "#779877",
          500: "#567a56",
          600: "#426142",
          700: "#364e36",
          800: "#2d3f2d",
          900: "#263526",
          950: "#131c13",
        },
        amber: {
          warn: "#b45309",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
