/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Важно! Классовый подход к темной теме
  theme: {
    extend: {},
  },
  plugins: [],
}
