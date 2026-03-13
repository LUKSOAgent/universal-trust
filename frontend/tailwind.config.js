/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lukso: {
          pink: '#FE005B',
          purple: '#8B5CF6',
          dark: '#0f0f1a',
          darker: '#080812',
          card: '#14142b',
          border: '#1e1e3f',
        }
      }
    },
  },
  plugins: [],
}
