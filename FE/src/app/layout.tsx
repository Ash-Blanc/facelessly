import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap'
})

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap'
})

export const metadata: Metadata = {
    title: 'Faceless Video Factory',
    description:
        'AI-powered pipeline that researches trends, writes scripts, generates videos, voiceovers, and thumbnails — all automatically.'
}

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" data-theme="facelessly" suppressHydrationWarning>
            <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased font-sans`}>
                <ThemeProvider
                    attribute="data-theme"
                    defaultTheme="facelessly"
                    themes={['facelessly', 'facelessly-light']}
                    enableSystem={false}
                >
                    <NuqsAdapter>{children}</NuqsAdapter>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    )
}
