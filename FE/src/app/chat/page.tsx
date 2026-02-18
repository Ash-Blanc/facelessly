'use client'

import Link from 'next/link'
import { ArrowRight, Video, Zap, Target, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Navigation */}
      <nav className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Faceless Video Factory</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
          <Link href="/chat">
            <Button>Launch App</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <h1 className="mb-6 text-5xl font-bold tracking-tight">
          Create Viral Shorts on Autopilot
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
          AI-powered pipeline that researches trends, writes scripts, generates videos,
          voiceovers, and thumbnails - all automatically.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/dashboard">
            <Button size="lg">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
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
          title="AI Research"
          description="Automatically discovers trending topics and analyzes what makes content go viral"
        />
        <FeatureCard
          icon={<Target className="h-8 w-8" />}
          title="Auto Generation"
          description="Generates scripts, videos, voiceovers, and thumbnails with one click"
        />
        <FeatureCard
          icon={<BarChart3 className="h-8 w-8" />}
          title="YouTube Integration"
          description="Connect your channel and publish directly to maximize reach"
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
    { num: '01', title: 'Connect YouTube', desc: 'Link your channel securely with OAuth' },
    { num: '02', title: 'AI Finds Trends', desc: 'Research engine discovers viral opportunities' },
    { num: '03', title: 'Script Generation', desc: 'Large language model writes engaging scripts' },
    { num: '04', title: 'Media Generation', desc: 'Create videos, voiceovers & thumbnails' },
    { num: '05', title: 'Review & Export', desc: 'Preview, edit, and download for your editor' }
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
