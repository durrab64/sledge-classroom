/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Design tokens mirroring the legacy Sledge Classroom visual language
      // (Bebas Neue headings, Inter body, JetBrains Mono accents). These are
      // deliberately named so the migrated pages can adopt them incrementally.
      colors: {
        sledge: {
          ink: '#0f172a',
          surface: '#ffffff',
          muted: '#64748b',
          accent: '#0ea5e9',
          accentHover: '#0284c7',
          border: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Bebas Neue', 'cursive'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display': ['3rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
      },
    },
  },
  plugins: [],
}
