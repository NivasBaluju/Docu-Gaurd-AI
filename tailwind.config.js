/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    colors: {
      ink: '#0A0A0A',
      'ink-soft': '#3A3A38',
      paper: '#FAF9F6',
      'paper-dim': '#F1EFEA',
      rule: '#D8D5CC',
      'rule-strong': '#0A0A0A',
      transparent: 'transparent',
      current: 'currentColor',
    },
    spacing: {
      0: '0px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '24px',
      6: '32px',
      7: '48px',
      8: '64px',
      9: '96px',
      10: '128px',
      11: '160px',
      12: '192px',
      13: '240px',
    },
    borderRadius: {
      none: '0px',
      DEFAULT: '0px',
      full: '9999px', // Restricted to mobile menu close and back-to-top circular buttons
    },
    boxShadow: {
      none: 'none', // Strictly no box-shadow anywhere in the theme
    },
    fontFamily: {
      display: ['var(--font-display)', 'Fraunces', 'Georgia', 'serif'],
      body: ['var(--font-body)', 'Public Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    },
    fontSize: {
      'display-01': ['7.5rem', { lineHeight: '0.95', letterSpacing: '-0.01em' }],
      'display-02': ['4.5rem', { lineHeight: '1.0', letterSpacing: '-0.01em' }],
      'display-03': ['3rem', { lineHeight: '1.05' }],
      'display-04': ['2rem', { lineHeight: '1.2' }],
      'heading-01': ['1.5rem', { lineHeight: '1.3' }],
      'heading-02': ['1.125rem', { lineHeight: '1.4' }],
      'body-lg': ['1.25rem', { lineHeight: '1.6' }],
      body: ['1.0625rem', { lineHeight: '1.65' }],
      'body-sm': ['0.9375rem', { lineHeight: '1.55' }],
      label: ['0.9375rem', { lineHeight: '1.4', letterSpacing: '0.005em' }],
      micro: ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0.01em' }],
    },
    screens: {
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      maxWidth: {
        wide: '1440px',
        text: '800px',
        measure: '38rem', // ~608px body copy constraint
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-quad': 'cubic-bezier(0.45, 0, 0.55, 1)',
        redact: 'cubic-bezier(0.83, 0, 0.17, 1)',
      },
      transitionDuration: {
        instant: '120ms',
        fast: '240ms',
        base: '400ms',
        slow: '700ms',
        hero: '1400ms',
      },
    },
  },
  plugins: [],
};
