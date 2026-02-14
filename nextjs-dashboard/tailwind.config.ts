import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        surface: {
          DEFAULT: '#0a0e1a',
          50: '#1e293b',
          100: '#1a1f2e',
          200: '#151a28',
          300: '#111827',
          400: '#0f1320',
          500: '#0a0e1a',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh':
          'radial-gradient(at 20% 80%, rgba(34, 211, 238, 0.08) 0, transparent 50%), radial-gradient(at 80% 20%, rgba(167, 139, 250, 0.06) 0, transparent 50%), radial-gradient(at 50% 50%, rgba(251, 113, 133, 0.04) 0, transparent 50%)',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.15)',
        'glow-emerald': '0 0 20px rgba(52, 211, 153, 0.15)',
        'glow-violet': '0 0 20px rgba(167, 139, 250, 0.15)',
        'glow-rose': '0 0 20px rgba(251, 113, 133, 0.15)',
        'glow-amber': '0 0 20px rgba(251, 191, 36, 0.15)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.35)',
      },
      animation: {
        'slideUp': 'slideUp 0.5s ease-out forwards',
        'fadeIn': 'fadeIn 0.4s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'pulseGlow': 'pulseGlow 2s ease-in-out infinite',
        'borderGlow': 'borderGlow 4s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        borderGlow: {
          '0%, 100%': {
            borderColor: 'rgba(34, 211, 238, 0.3)',
            boxShadow: '0 0 15px rgba(34, 211, 238, 0.1)',
          },
          '50%': {
            borderColor: 'rgba(167, 139, 250, 0.3)',
            boxShadow: '0 0 15px rgba(167, 139, 250, 0.1)',
          },
        },
      },
    },
  },
  plugins: [],
}
export default config
