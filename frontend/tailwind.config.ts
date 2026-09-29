import type { Config } from 'tailwindcss';

/**
 * Design tokens for the Smart Farming Assistant.
 * Green + cream agricultural system: cream page, near-white cards, deep green
 * for emphasis, sage for support, warm beige for secondary surfaces.
 * JS-side equivalents live in src/config/theme.ts.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F0E6',
        surface: '#FFFFFF',
        raised: '#FBF9F4',
        sand: { DEFAULT: '#E8DFCF', 100: '#F4EFE4', 300: '#E8DFCF', 500: '#D6C9AE', 700: '#A3906B' },
        line: '#D9D4C8',
        'line-strong': '#C3BCAA',
        ink: {
          DEFAULT: '#263229',
          soft: '#3E4C42',
          muted: '#68736A',
          faint: '#8D968E',
        },
        leaf: {
          50: '#F1F5EE',
          100: '#E3EADD',
          200: '#C9D6C0',
          300: '#A8B99A',
          400: '#829B80',
          500: '#5F8062',
          600: '#456B4C',
          700: '#315B3D',
          800: '#2A4E35',
          900: '#23452F',
        },
        // Warm amber — warnings and elevated-but-not-critical states
        clay: { 100: '#F7EEDB', 300: '#E3C68C', 500: '#B8832A', 700: '#8C6218' },
        sun: { 100: '#FBF4E3', 300: '#EBD5A0', 500: '#C79A3F', 700: '#967023' },
        // Muted red — critical only
        ember: { 100: '#F7E6E1', 300: '#D9A99A', 500: '#A8442F', 700: '#83301F' },
        // Calm stone-teal — informational
        sky: { 100: '#E8EEEC', 300: '#A9BFBA', 500: '#55706B', 700: '#3C5450' },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(38,50,41,0.04)',
        raise: '0 1px 2px rgba(38,50,41,0.04), 0 6px 18px -12px rgba(38,50,41,0.18)',
        pop: '0 10px 34px -14px rgba(38,50,41,0.24), 0 2px 6px rgba(38,50,41,0.05)',
      },
      borderRadius: { xl: '0.75rem', '2xl': '1rem' },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-dot': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.35' } },
      },
      animation: {
        'fade-up': 'fade-up 220ms cubic-bezier(0.22,1,0.36,1)',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-dot': 'pulse-dot 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
