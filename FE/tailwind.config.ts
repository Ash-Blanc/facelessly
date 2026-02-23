import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'
import daisyui from 'daisyui'

export default {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}'
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#7C3AED',
                    50: '#F5F3FF',
                    100: '#EDE9FE',
                    200: '#DDD6FE',
                    300: '#C4B5FD',
                    400: '#A78BFA',
                    500: '#7C3AED',
                    600: '#6D28D9',
                    700: '#5B21B6',
                    800: '#4C1D95',
                    900: '#3B0764',
                },
            },
            fontFamily: {
                sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
                mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
                display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'system-ui'],
            },
            borderRadius: {
                xl: '12px',
                '2xl': '16px',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(124, 58, 237, 0.15)',
                'glow-lg': '0 0 40px rgba(124, 58, 237, 0.2)',
            },
        }
    },
    plugins: [tailwindcssAnimate, daisyui],
    daisyui: {
        themes: [
            {
                'facelessly-light': {
                    'primary': '#7C3AED',
                    'primary-content': '#FFFFFF',
                    'secondary': '#EC4899',
                    'secondary-content': '#FFFFFF',
                    'accent': '#06B6D4',
                    'accent-content': '#FFFFFF',
                    'neutral': '#F3F4F6',
                    'neutral-content': '#374151',
                    'base-100': '#FFFFFF',
                    'base-200': '#F9FAFB',
                    'base-300': '#E5E7EB',
                    'base-content': '#111827',
                    'info': '#3B82F6',
                    'info-content': '#FFFFFF',
                    'success': '#10B981',
                    'success-content': '#FFFFFF',
                    'warning': '#F59E0B',
                    'warning-content': '#FFFFFF',
                    'error': '#EF4444',
                    'error-content': '#FFFFFF',
                }
            },
            {
                facelessly: {
                    'primary': '#7C3AED',
                    'primary-content': '#FFFFFF',
                    'secondary': '#EC4899',
                    'secondary-content': '#FFFFFF',
                    'accent': '#06B6D4',
                    'accent-content': '#0A0F14',
                    'neutral': '#1E1E22',
                    'neutral-content': '#D4D4D8',
                    'base-100': '#111113',
                    'base-200': '#1A1A1E',
                    'base-300': '#27272A',
                    'base-content': '#F5F5F5',
                    'info': '#3B82F6',
                    'info-content': '#DBEAFE',
                    'success': '#10B981',
                    'success-content': '#052E16',
                    'warning': '#F59E0B',
                    'warning-content': '#422006',
                    'error': '#EF4444',
                    'error-content': '#FEE2E2',
                }
            },
        ],
        darkTheme: 'facelessly'
    }
} satisfies Config
