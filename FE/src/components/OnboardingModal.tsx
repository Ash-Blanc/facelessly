'use client'

import { useState, useEffect } from 'react'
import { Film, ArrowRight, Sparkles, Zap, Play, X } from 'lucide-react'
import Link from 'next/link'

const STORAGE_KEY = 'facelessly_onboarding_done'

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) setIsOpen(true)
  }, [])

  const close = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-base-300 bg-base-100 p-8 shadow-2xl scale-in">
        {/* Close */}
        <button
          onClick={close}
          className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-base-200 transition"
        >
          <X className="h-4 w-4 text-base-content/40" />
        </button>

        {slide === 0 ? (
          /* ── Slide 1 ─────────────────────────── */
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand-pink mb-6">
              <Film className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold font-display">Welcome to Facelessly 👋</h2>
            <p className="mt-3 text-base-content/60 text-sm leading-relaxed">
              The AI video engine that creates & posts faceless short-form videos for you — 
              automatically, even while you sleep.
            </p>

            {/* Sample video cards */}
            <div className="mt-8 flex gap-3 justify-center">
              {[
                { emoji: '👻', title: 'Scary Stories', views: '2.1M' },
                { emoji: '💰', title: 'Finance Tips', views: '890k' },
                { emoji: '🏛️', title: 'History Facts', views: '1.5M' },
              ].map((v) => (
                <div key={v.title} className="w-28 rounded-xl border border-base-300 bg-base-200/30 p-3 text-center">
                  <span className="text-3xl">{v.emoji}</span>
                  <p className="mt-2 text-xs font-medium truncate">{v.title}</p>
                  <p className="text-[10px] text-base-content/40">{v.views} views</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSlide(1)}
              className="mt-8 inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-glow"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* ── Slide 2 ─────────────────────────── */
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold font-display">Let&apos;s create your first series</h2>
            <p className="mt-3 text-base-content/60 text-sm">Just 3 simple steps to get started</p>

            <div className="mt-8 space-y-4 text-left">
              {[
                { num: '1', title: 'Pick a niche', desc: 'Choose what type of videos to make', icon: Sparkles },
                { num: '2', title: 'Customize your style', desc: 'Select voice, visuals, and music', icon: Zap },
                { num: '3', title: 'Connect & publish', desc: 'Link YouTube and start auto-posting', icon: Play },
              ].map((step) => (
                <div key={step.num} className="flex items-center gap-4 rounded-xl border border-base-300 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{step.title}</h4>
                    <p className="text-xs text-base-content/50">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/create"
              onClick={close}
              className="mt-8 inline-flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-glow"
            >
              <Sparkles className="h-4 w-4" />
              Get Started
            </Link>
          </div>
        )}

        {/* Dots */}
        <div className="mt-6 flex justify-center gap-2">
          <div className={`h-1.5 rounded-full transition-all ${slide === 0 ? 'w-6 bg-primary' : 'w-1.5 bg-base-300'}`} />
          <div className={`h-1.5 rounded-full transition-all ${slide === 1 ? 'w-6 bg-primary' : 'w-1.5 bg-base-300'}`} />
        </div>
      </div>
    </div>
  )
}
