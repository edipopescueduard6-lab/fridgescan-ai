/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#2D8B4E",
        secondary: "#FF6B35",
        accent: "#5C6BC0",
        bg: "#FAFDF7",
        txt: "#1A2E1A",
        critical: "#D32F2F",
        warning: "#F57C00",
        safe: "#2E7D32",
        fresh: "#4CAF50",
        ok: "#FFC107",
        expiring: "#FF9800",
        expired: "#F44336",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
