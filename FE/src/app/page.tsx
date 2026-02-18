'use client'

import Link from 'next/link'
import { ArrowRight, Video, Zap, Target, BarChart3, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
            {/* Navigation */}
            <nav className="flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-2">
                    <Video className="h-6 w-6 text-primary" />
                    <span className="text-xl font-bold">Faceless Factory</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost">Dashboard</Button>
                    </Link>
                    <Link href="/chat">
                        <Button variant="ghost">Chat</Button>
                    </Link>
                    <Link href="/generate">
                        <Button>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Create Video
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="px-6 py-24 text-center">
                <h1 className="mb-6 text-5xl font-bold tracking-tight">
                    Create Faceless Videos<br />Automatically with AI 🚀
                </h1>
                <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
                    Type your niche, choose your style, connect your channels — and FacelessFactory generates
                    & auto-posts videos <strong>every single day</strong> to every platform.
                </p>
                <div className="flex justify-center gap-4">
                    <Link href="/generate">
                        <Button size="lg" className="gap-2 px-8 py-6 text-lg">
                            Get Started <ArrowRight className="h-5 w-5" />
                        </Button>
                    </Link>
                    <Link href="/chat">
                        <Button size="lg" variant="outline">
                            Try Chat Interface
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Features */}
            <section className="grid gap-8 px-6 py-16 md:grid-cols-3">
                <FeatureCard
                    icon={<Zap className="h-8 w-8" />}
                    title="1. Pick Your Niche"
                    description="Choose from luxury, space, Reddit stories, finance, horror, or top-10. We tailor everything for you."
                />
                <FeatureCard
                    icon={<Target className="h-8 w-8" />}
                    title="2. Choose Your Style"
                    description="Cinematic dark, bright energetic, minimal, retro, or neon futuristic — your videos look incredible."
                />
                <FeatureCard
                    icon={<BarChart3 className="h-8 w-8" />}
                    title="3. Connect & Automate"
                    description="Link YouTube, TikTok, and Instagram. We generate and auto-post daily — put your growth on autopilot."
                />
            </section>

            {/* How it works */}
            <section className="border-t px-6 py-16">
                <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
                <div className="mx-auto max-w-4xl">
                    <Steps />
                </div>
            </section>
        </div>
    )
}

function FeatureCard({
    icon,
    title,
    description
}: {
    icon: React.ReactNode
    title: string
    description: string
}) {
    return (
        <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 text-primary">{icon}</div>
            <h3 className="mb-2 text-xl font-semibold">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
        </div>
    )
}

function Steps() {
    const steps = [
        { num: '01', title: 'Type Your Niche', desc: 'Pick a content category that matches your audience.' },
        { num: '02', title: 'Choose Style', desc: 'Select a visual aesthetic — cinematic, bright, retro & more.' },
        { num: '03', title: 'Connect Channels', desc: 'Link YouTube, TikTok, Instagram with one click.' },
        { num: '04', title: 'AI Generates', desc: 'Research, script, video, voiceover & thumbnail — all automatic.' },
        { num: '05', title: 'Auto-Post Daily', desc: 'Videos posted to every platform, every single day.' }
    ]

    return (
        <div className="grid gap-6 md:grid-cols-5">
            {steps.map((step) => (
                <div key={step.num} className="text-center">
                    <div className="mb-3 text-4xl font-bold text-primary/30">{step.num}</div>
                    <h3 className="mb-1 font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
            ))}
        </div>
    )
}
