import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#172B4D', 950: '#0A1630', 900: '#0F1F3D', 800: '#172B4D', 700: '#22396A' },
        brand: { DEFAULT: '#2563EB', 50: '#EFF5FF', 100: '#DBE7FE', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
        surface: '#F7F8FA',
        success: '#16A34A',
        danger: '#DC2626',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
      borderRadius: { xl: '12px', '2xl': '16px' },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)' },
    },
  },
  plugins: [],
} satisfies Config;
