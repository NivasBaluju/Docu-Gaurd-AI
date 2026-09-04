/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        paper: 'var(--paper)',
        'paper-dim': 'var(--paper-dim)',
        rule: 'var(--rule)',
        'rule-strong': 'var(--rule-strong)',
        signal: 'var(--signal)',
        'signal-soft': 'var(--signal-soft)',
      },
      spacing: {
        'space-0': '0px',
        'space-1': '4px',
        'space-2': '8px',
        'space-3': '12px',
        'space-4': '16px',
        'space-5': '24px',
        'space-6': '32px',
        'space-7': '48px',
        'space-8': '64px',
        'space-9': '96px',
        'space-10': '128px',
        'space-11': '160px',
        'space-12': '192px',
        'space-13': '240px',
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
