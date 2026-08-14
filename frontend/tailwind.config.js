/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D6A4F',
          light: '#D8F3DC',
          dark: '#1B4332',
          50: '#F0F9F4',
          100: '#D8F3DC',
          200: '#B7E4C7',
          300: '#95D5AB',
          400: '#74C69D',
          500: '#52B788',
          600: '#40916C',
          700: '#2D6A4F',
          800: '#1B4332',
          900: '#081C15',
        },
        accent: '#52B788',
        'accent-warm': {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark: '#D97706',
        },
        'accent-cool': {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
          dark: '#2563EB',
        },
        'accent-rose': {
          DEFAULT: '#F43F5E',
          light: '#FFE4E6',
          dark: '#E11D48',
        },
        surface: '#FFFFFF',
        background: '#F5F5F5',
        'merchant-bg': '#FAFBFC',
        'sidebar-dark': '#111827',
        'text-primary': '#1A1A1A',
        'text-secondary': '#64748B',
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display': ['2rem', { lineHeight: '1.1', fontWeight: '800' }],
        'heading': ['1.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        'title': ['1.125rem', { lineHeight: '1.3', fontWeight: '600' }],
        'micro': ['0.625rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '0.1em' }],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)',
        'card-elevated': '0 20px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
        'bottom-nav': '0 -4px 20px rgba(0,0,0,0.08)',
        'top': '0 2px 12px rgba(0,0,0,0.06)',
        'glow-green': '0 0 20px rgba(45,106,79,0.15), 0 0 60px rgba(45,106,79,0.05)',
        'glow-amber': '0 0 20px rgba(245,158,11,0.15)',
        'glow-blue': '0 0 20px rgba(59,130,246,0.15)',
        'inner-soft': 'inset 0 2px 4px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
