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
            },
            boxShadow: {
                'glow-sm': '0 0 12px rgba(255, 64, 23, 0.2), 0 0 30px rgba(255, 64, 23, 0.08)',
                'glow-md': '0 0 20px rgba(255, 64, 23, 0.3), 0 0 60px rgba(255, 64, 23, 0.1)',
                'glow-lg': '0 0 40px rgba(255, 64, 23, 0.4), 0 0 100px rgba(255, 64, 23, 0.15)',
                'glow-xl': '0 0 60px rgba(255, 64, 23, 0.5), 0 0 140px rgba(255, 64, 23, 0.2)',
                'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.08)',
                'card': '0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04)',
                'card-hover': '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(255,64,23,0.15)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'gradient-brand': 'linear-gradient(135deg, #FF4017 0%, #FF8C42 50%, #FF4017 100%)',
                'gradient-brand-subtle': 'linear-gradient(135deg, rgba(255,64,23,0.15) 0%, rgba(255,140,66,0.08) 100%)',
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'float-slow': 'float 9s ease-in-out infinite',
                'shimmer': 'shimmer 3s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'orb': 'orbPulse 8s ease-in-out infinite',
                'fade-in-up': 'fadeInUp 0.6s ease-out both',
            },
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
                    'base-100': '#0D0D0F',
                    'base-200': '#161618',
                    'base-300': '#222226',
                    'base-content': '#F0F0F0',
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
