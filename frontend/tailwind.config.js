/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: { 800: '#0f172a', 900: '#0a0e17', 950: '#060910' },
        risk: { green: '#22c55e', yellow: '#f59e0b', orange: '#f97316', red: '#ef4444', darkred: '#dc2626' },
        hi: {
          bg: '#0a0e17',
          card: 'rgba(15,23,42,0.6)',
          border: 'rgba(255,255,255,0.06)',
          'border-hover': 'rgba(255,255,255,0.12)',
          text: '#e2e8f0',
          muted: 'rgba(255,255,255,0.45)',
          dim: 'rgba(255,255,255,0.3)',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
