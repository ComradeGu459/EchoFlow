/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    // 禁用 Tailwind 的 CSS reset，避免与现有 globals.css 冲突
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
