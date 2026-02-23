'use client'

import Link from 'next/link'
import { Film, Youtube, Instagram, ChevronRight, Sparkles, Zap, Clock, Shield } from 'lucide-react'

const NICHES = [
  { title: 'Scary Stories', emoji: '👻', color: 'from-purple-500/20 to-purple-900/30' },
  { title: 'History', emoji: '🏛️', color: 'from-amber-500/20 to-amber-900/30' },
  { title: 'True Crime', emoji: '🔍', color: 'from-red-500/20 to-red-900/30' },
  { title: 'Motivation', emoji: '💪', color: 'from-blue-500/20 to-blue-900/30' },
  { title: 'Finance', emoji: '💰', color: 'from-green-500/20 to-green-900/30' },
  { title: 'Top 10', emoji: '🏆', color: 'from-yellow-500/20 to-yellow-900/30' },
  { title: 'Space', emoji: '🚀', color: 'from-indigo-500/20 to-indigo-900/30' },
  { title: 'Reddit', emoji: '📖', color: 'from-orange-500/20 to-orange-900/30' },
]

const STEPS = [
  { num: '01', title: 'Pick your niche', desc: 'Choose from presets like Horror, Finance, or History — or create your own custom niche.', icon: Sparkles },
  { num: '02', title: 'Customize everything', desc: 'Select AI voice, art style, captions, and background music. Make it yours.', icon: Zap },
  { num: '03', title: 'Sit back & earn', desc: 'We generate and auto-post videos to your connected accounts. You sleep, we work.', icon: Clock },
]

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    credits: '30 credits',
    features: ['1 series', 'Basic styles', 'Watermarked', '~2 videos/mo'],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    credits: '1,200 credits',
    features: ['Unlimited series', 'Premium voices', 'No watermark', 'Priority queue', '~60 videos/mo'],
    cta: 'Go Pro',
    popular: true,
  },
  {
    name: 'Scale',
    price: '$99',
    period: '/mo',
    credits: '3,000 credits',
    features: ['Everything in Pro', 'Custom voices', 'API access', 'Dedicated support', '~150 videos/mo'],
    cta: 'Scale Up',
    popular: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base-100">
      {/* ── Navigation ──────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
              <Film className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold font-display">Facelessly</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm text-base-content/60 transition hover:text-base-content">How it works</a>
            <a href="#pricing" className="text-sm text-base-content/60 transition hover:text-base-content">Pricing</a>
            <a href="#niches" className="text-sm text-base-content/60 transition hover:text-base-content">Niches</a>
          </div>
          <Link
            href="/series"
            className="rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-glow hover:scale-105"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pb-20 pt-16 md:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          {/* Social Proof */}
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-base-300 bg-base-200/50 px-4 py-2">
            <div className="flex -space-x-2">
              {['🧑‍💻', '👩‍🎨', '🧑‍🚀', '👨‍💼', '👩‍🔬'].map((emoji, i) => (
                <div key={i} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-base-100 bg-base-200 text-sm">
                  {emoji}
                </div>
              ))}
            </div>
            <span className="text-sm text-base-content/70">
              Trusted by <strong className="text-base-content">2,000+</strong> creators
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Create viral faceless{' '}
            <br className="hidden sm:block" />
            videos on{' '}
            <span className="gradient-text">auto-pilot</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-base-content/60">
            The only AI that generates & posts videos for you automatically, even while you sleep.
          </p>

          {/* Platform Icons */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-base-content/50">
            <span>Perfect for</span>
            <div className="flex items-center gap-3 ml-1">
              <Youtube className="h-5 w-5 text-red-500" />
              <Instagram className="h-5 w-5 text-pink-500" />
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.88a8.18 8.18 0 004.77 1.53V7a4.84 4.84 0 01-1-.31z"/>
              </svg>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href="/series"
              className="group inline-flex items-center gap-2 rounded-2xl gradient-brand px-8 py-4 text-lg font-bold text-white shadow-glow transition-all hover:shadow-glow-lg hover:scale-105"
            >
              <Zap className="h-5 w-5" />
              Create your first video
            </Link>
            <span className="text-sm text-base-content/40">
              Get your generated video in less than 5 minutes.
            </span>
          </div>
        </div>

        {/* Background gradient orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-[300px] w-[300px] rounded-full bg-secondary/10 blur-[100px]" />
      </section>

      {/* ── Niche Showcase ──────────────────────────── */}
      <section id="niches" className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-center gap-2 text-base-content/60">
            <span className="text-sm font-medium">Creates videos for any niche</span>
            <ChevronRight className="h-4 w-4" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {NICHES.map((niche) => (
              <div
                key={niche.title}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-base-300 bg-base-200/30 p-5 transition-all hover:border-primary/30 hover:shadow-glow hover:-translate-y-1 cursor-pointer"
              >
                <span className="text-3xl">{niche.emoji}</span>
                <span className="text-xs font-medium text-base-content/70 group-hover:text-base-content">{niche.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────── */}
      <section id="how-it-works" className="px-6 py-20 bg-base-200/30">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Three steps to viral content
          </h2>
          <p className="mt-3 text-base-content/60">No editing skills needed. Just pick and publish.</p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.num} className="group rounded-2xl border border-base-300 bg-base-100 p-8 transition-all hover:border-primary/30 hover:shadow-glow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5">
                <step.icon className="h-6 w-6" />
              </div>
              <span className="text-xs font-bold text-primary/60 uppercase tracking-wider">Step {step.num}</span>
              <h3 className="mt-2 text-xl font-bold font-display">{step.title}</h3>
              <p className="mt-2 text-sm text-base-content/60 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────── */}
      <section id="pricing" className="px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mt-3 text-base-content/60">Start free. Scale when you&apos;re ready.</p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all hover:shadow-glow ${
                plan.popular
                  ? 'border-primary bg-primary/5 shadow-glow'
                  : 'border-base-300 bg-base-100'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-brand px-4 py-1 text-xs font-bold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-bold font-display">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold font-display">{plan.price}</span>
                <span className="text-base-content/50">{plan.period}</span>
              </div>
              <p className="mt-1 text-sm text-primary font-medium">{plan.credits}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-base-content/70">
                    <Shield className="h-4 w-4 text-primary/60" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/series"
                className={`mt-8 block rounded-xl py-3 text-center text-sm font-bold transition-all ${
                  plan.popular
                    ? 'gradient-brand text-white hover:shadow-glow-lg'
                    : 'border border-base-300 text-base-content hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-base-300 px-6 py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand">
              <Film className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold font-display">Facelessly</span>
          </div>
          <p className="text-xs text-base-content/40">
            © 2026 Facelessly. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
