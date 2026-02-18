'use client'

import Link from 'next/link'
import { Video, MessageSquare, LayoutDashboard, Sparkles, Mic, Image, TrendingUp, Zap } from 'lucide-react'

const FEATURES = [
    { icon: TrendingUp, label: 'Research' },
    { icon: Sparkles, label: 'Script' },
    { icon: Video, label: 'Video' },
    { icon: Mic, label: 'Voice' },
    { icon: Image, label: 'Thumbnail' },
]

export default function Home() {
    return (
        <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-base-100 px-6">
            {/* Animated background grid */}
            <div className="absolute inset-0 bg-grid opacity-100" />

            {/* Radial gradient mask over grid */}
            <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-base-100 opacity-80" />

            {/* Animated orbs */}
            <div
                className="animate-orb pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(255,64,23,0.18) 0%, rgba(255,64,23,0.05) 50%, transparent 70%)',
                    filter: 'blur(40px)',
                }}
            />
            <div
                className="animate-orb-delay pointer-events-none absolute right-1/4 bottom-1/3 h-80 w-80 translate-x-1/2 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 50%, transparent 70%)',
                    filter: 'blur(50px)',
                }}
            />
            <div
                className="animate-float-slow pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(255,64,23,0.06) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center">
                {/* Badge */}
                <div
                    className="fade-in mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary"
                    style={{ animationDelay: '0ms' }}
                >
                    <Zap className="h-3 w-3" />
                    AI-Powered Video Creation
                </div>

                {/* Logo + Headline */}
                <div className="fade-in mb-6" style={{ animationDelay: '80ms' }}>
                    <div className="mb-5 flex items-center justify-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-xl glow-primary opacity-60 blur-sm" />
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                                <Video className="h-6 w-6 text-primary-content" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
                        <span className="text-gradient">Faceless</span>
                        <br />
                        <span className="text-base-content">Video Factory</span>
                    </h1>
                </div>

                {/* Tagline */}
                <p
                    className="fade-in mb-8 max-w-lg text-lg leading-relaxed text-base-content/50 md:text-xl"
                    style={{ animationDelay: '160ms' }}
                >
                    From trending topic to viral short — fully automated with AI.
                </p>

                {/* Feature pills */}
                <div
                    className="fade-in mb-10 flex flex-wrap items-center justify-center gap-2"
                    style={{ animationDelay: '240ms' }}
                >
                    {FEATURES.map(({ icon: Icon, label }) => (
                        <span
                            key={label}
                            className="inline-flex items-center gap-1.5 rounded-full border border-base-300 bg-base-200/60 px-3 py-1 text-xs font-medium text-base-content/60 backdrop-blur-sm"
                        >
                            <Icon className="h-3 w-3 text-primary" />
                            {label}
                        </span>
                    ))}
                </div>

                {/* CTA Buttons */}
                <div
                    className="slide-up flex flex-col items-center gap-3 sm:flex-row"
                    style={{ animationDelay: '320ms' }}
                >
                    <Link href="/chat">
                        <button className="btn btn-lg btn-primary relative gap-2 overflow-hidden rounded-xl px-8 font-semibold shadow-glow-md transition-all duration-300 hover:shadow-glow-lg hover:-translate-y-0.5">
                            <MessageSquare className="h-5 w-5" />
                            Start Creating
                        </button>
                    </Link>
                    <Link href="/dashboard">
                        <button className="btn btn-lg gap-2 rounded-xl border border-base-300 bg-base-200/60 text-base-content backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:bg-base-200 hover:shadow-glow-sm">
                            <LayoutDashboard className="h-5 w-5" />
                            Dashboard
                        </button>
                    </Link>
                </div>
            </div>

            {/* Bottom gradient fade */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-base-100 to-transparent" />
        </div>
    )
}
