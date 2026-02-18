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
                brand: '#FF4017'
            },
            fontFamily: {
                sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
                mono: ['var(--font-mono)', 'ui-monospace', 'monospace']
            },
            borderRadius: {
                xl: '10px'
            }
        }
    },
    plugins: [tailwindcssAnimate, daisyui],
    daisyui: {
        themes: [
            {
                facelessly: {
                    'primary': '#FF4017',
                    'primary-content': '#FAFAFA',
                    'secondary': '#6366F1',
                    'secondary-content': '#F0F0FF',
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
                    'success': '#22C55E',
                    'success-content': '#052E16',
                    'warning': '#F59E0B',
                    'warning-content': '#422006',
                    'error': '#EF4444',
                    'error-content': '#FEE2E2'
                }
            },
            {
                'facelessly-light': {
                    'primary': '#E63610',
                    'primary-content': '#FFFFFF',
                    'secondary': '#4F46E5',
                    'secondary-content': '#FFFFFF',
                    'accent': '#0891B2',
                    'accent-content': '#FFFFFF',
                    'neutral': '#E5E7EB',
                    'neutral-content': '#1F2937',
                    'base-100': '#FAFAFA',
                    'base-200': '#F4F4F5',
                    'base-300': '#E4E4E7',
                    'base-content': '#18181B',
                    'info': '#3B82F6',
                    'info-content': '#1E3A5F',
                    'success': '#16A34A',
                    'success-content': '#052E16',
                    'warning': '#D97706',
                    'warning-content': '#422006',
                    'error': '#DC2626',
                    'error-content': '#450A0A'
                }
            }
        ],
        darkTheme: 'facelessly'
    }
} satisfies Config
