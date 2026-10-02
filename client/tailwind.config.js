/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070b14',
          900: '#0b1120',
          850: '#0f172a',
          800: '#111a30',
          700: '#1b2740',
          600: '#273550',
        },
        accent: {
          DEFAULT: '#38bdf8',
          dim: '#0ea5e9',
        },
        geo: '#a78bfa',
        aeo: '#34d399',
        seo: '#38bdf8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
