import type { Metadata } from 'next'
import { Inter, Outfit, JetBrains_Mono } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap'
})

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-display',
    display: 'swap'
})

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    display: 'swap'
})

export const metadata: Metadata = {
    title: 'Facelessly | AI Faceless Video Generator',
    description:
        'Create viral faceless videos on autopilot. The only AI that generates & posts videos for you automatically, even while you sleep.'
}

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" data-theme="facelessly-light" suppressHydrationWarning>
            <body className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} antialiased font-sans`}>
                <ThemeProvider
                    attribute="data-theme"
                    defaultTheme="facelessly-light"
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
