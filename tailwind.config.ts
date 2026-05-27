import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#050712',
        card: '#0d1324',
        cardAlt: '#131b31',
        border: '#223157',
        active: '#34d399',
        link: '#60a5fa',
        completed: '#c084fc',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(96, 165, 250, 0.3), 0 8px 28px rgba(5, 10, 24, 0.6)',
        card: '0 20px 45px rgba(4, 8, 20, 0.45)',
      },
      backgroundImage: {
        grid: `linear-gradient(to right, rgba(96, 165, 250, 0.08) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(96, 165, 250, 0.08) 1px, transparent 1px)`,
      },
    },
  },
  plugins: [],
};

export default config;
