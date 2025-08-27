/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Poppins', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],     // 12px
        'sm': ['0.875rem', { lineHeight: '1.5' }],    // 14px
        'base': ['1rem', { lineHeight: '1.6' }],      // 16px
        'lg': ['1.125rem', { lineHeight: '1.6' }],    // 18px
        'xl': ['1.25rem', { lineHeight: '1.5' }],     // 20px
        '2xl': ['1.5rem', { lineHeight: '1.4' }],     // 24px
        '3xl': ['1.875rem', { lineHeight: '1.3' }],   // 30px
        '4xl': ['2.25rem', { lineHeight: '1.2' }],    // 36px
        '5xl': ['3rem', { lineHeight: '1.1' }],       // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }],      // 60px
      },
    },
  },
  plugins: [],
};
