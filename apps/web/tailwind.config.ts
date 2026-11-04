import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm charcoal used for headings, dark heroes and the dashboard sidebar.
        ink: { DEFAULT: '#292524', 950: '#1C1917', 900: '#231F1D', 800: '#292524', 700: '#3A3532' },
        // CAN orange. 600 (#C2410C) is the interactive colour: 5.2:1 with white text.
        brand: { DEFAULT: '#C2410C', 50: '#FFF4ED', 100: '#FFE4D3', 400: '#F7941D', 500: '#F15A29', 600: '#C2410C', 700: '#9A3412' },
        can: { red: '#C1272D', orange: '#F15A29', amber: '#F7941D' },
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
