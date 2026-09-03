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
          DEFAULT: '#5EB929', // Offerly Brand Kit Lime/Apple Green
          light: '#EAF7E3',
          dark: '#489A1B',
          50: '#F4FAF0',
          100: '#E7F6E0',
          200: '#CEECC0',
          300: '#AEE097',
          400: '#8DD16B',
          500: '#5EB929',
          600: '#4E9F1F',
          700: '#3D8117',
          800: '#2E6312',
          900: '#1F450B',
        },
        brand: {
          green: '#5EB929',
          lightGreen: '#7AD032',
          darkGreen: '#489A1B',
          softBg: '#F3F9EE',
          charcoal: '#1E293B',
          coral: '#E15B64',
        },
        accent: '#7AD032',
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
        background: '#F8FAFC',
        'merchant-bg': '#FAFBFC',
        'sidebar-dark': '#111827',
        'text-primary': '#1E293B',
        'text-secondary': '#64748B',
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['Poppins', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
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
        'glow-green': '0 0 20px rgba(94, 185, 41,0.15), 0 0 60px rgba(94, 185, 41,0.05)',
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
