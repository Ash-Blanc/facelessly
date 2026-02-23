'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Video,
  Sparkles,
  Loader2,
  CheckCircle,
  Youtube,
  Clock,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { APIRoutes } from '@/api/routes'
import { useStore } from '@/store'

interface NicheOption {
  id: string
  name: string
  description: string
  emoji: string
}

interface StyleOption {
  id: string
  name: string
  description: string
  emoji: string
}

type Step = 'niche' | 'style' | 'connect' | 'generate'

export default function GeneratePage() {
  const router = useRouter()
  const { currentUser } = useStore()

  const [currentStep, setCurrentStep] = useState<Step>('niche')
  const [niches, setNiches] = useState<NicheOption[]>([])
  const [styles, setStyles] = useState<StyleOption[]>([])
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<string | null>(null)
  const [autoPost, setAutoPost] = useState(false)

  const steps: Step[] = ['niche', 'style', 'connect', 'generate']
  const stepLabels: Record<Step, string> = {
    niche: 'Choose Niche',
    style: 'Pick Style',
    connect: 'Connect Platforms',
    generate: 'Generate'
  }

  useEffect(() => {
    fetchOptions()
  }, [])

  const fetchOptions = async () => {
    try {
      const [nichesRes, stylesRes] = await Promise.all([
        fetch(APIRoutes.GetNiches()),
        fetch(APIRoutes.GetStyles())
      ])
      if (nichesRes.ok) setNiches(await nichesRes.json())
      if (stylesRes.ok) setStyles(await stylesRes.json())
    } catch {
      toast.error('Failed to load options. Is the backend running?')
    } finally {
      setIsLoading(false)
    }
  }

  const goNext = () => {
    const idx = steps.indexOf(currentStep)
    if (idx < steps.length - 1) setCurrentStep(steps[idx + 1])
  }

  const goBack = () => {
    const idx = steps.indexOf(currentStep)
    if (idx > 0) setCurrentStep(steps[idx - 1])
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch(APIRoutes.Generate(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: selectedNiche,
          style: selectedStyle,
          user_id: currentUser?.id || 'anonymous'
        })
      })

      const data = await res.json()
      if (res.ok) {
        setGenerationResult(data.result)
        toast.success('Video package generated!')

        // If auto-post enabled, create schedule
        if (autoPost && currentUser) {
          await fetch(APIRoutes.CreateSchedule(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: currentUser.id,
              niche: selectedNiche,
              style: selectedStyle,
              platforms: 'youtube',
              frequency: 'daily',
              enabled: true
            })
          })
          toast.success('Daily auto-posting enabled!')
        }
      } else {
        toast.error(data.error || 'Generation failed')
      }
    } catch {
      toast.error('Failed to generate. Check backend.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleConnectYouTube = () => {
    const backendUrl = process.env.NEXT_PUBLIC_OS_URL || 'http://localhost:8000'
    window.location.href = `${backendUrl}/auth/youtube`
  }

  const stepIndex = steps.indexOf(currentStep)

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="flex items-center justify-between border-b border-border/50 px-6 py-4 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Faceless Factory</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/chat">
            <Button variant="ghost" size="sm">Chat</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Dashboard</Button>
          </Link>
        </div>
      </nav>

      {/* Progress Steps */}
      <div className="mx-auto max-w-3xl px-6 pt-8">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300 ${
                  i < stepIndex
                    ? 'border-primary bg-primary text-primary-foreground'
                    : i === stepIndex
                      ? 'border-primary bg-primary/10 text-primary scale-110'
                      : 'border-muted-foreground/30 text-muted-foreground/50'
                }`}
              >
                {i < stepIndex ? <CheckCircle className="h-5 w-5" /> : i + 1}
              </div>
              <span
                className={`ml-2 hidden text-sm font-medium sm:block ${
                  i <= stepIndex ? 'text-foreground' : 'text-muted-foreground/50'
                }`}
              >
                {stepLabels[step]}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`mx-4 h-0.5 w-8 sm:w-16 transition-colors duration-300 ${
                    i < stepIndex ? 'bg-primary' : 'bg-muted-foreground/20'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Step 1: Niche Selection */}
        {currentStep === 'niche' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold">What&apos;s your niche?</h1>
              <p className="mt-2 text-muted-foreground">
                Pick a content category. We&apos;ll tailor everything to your audience.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {niches.map((niche) => (
                <button
                  key={niche.id}
                  onClick={() => setSelectedNiche(niche.id)}
                  className={`group relative rounded-xl border-2 p-6 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                    selectedNiche === niche.id
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-4xl">{niche.emoji}</div>
                  <h3 className="mt-3 text-lg font-semibold">{niche.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{niche.description}</p>
                  {selectedNiche === niche.id && (
                    <CheckCircle className="absolute right-3 top-3 h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Style Selection */}
        {currentStep === 'style' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold">Choose your style</h1>
              <p className="mt-2 text-muted-foreground">
                Pick a visual aesthetic for your videos.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`group relative rounded-xl border-2 p-6 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                    selectedStyle === style.id
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-4xl">{style.emoji}</div>
                  <h3 className="mt-3 text-lg font-semibold">{style.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{style.description}</p>
                  {selectedStyle === style.id && (
                    <CheckCircle className="absolute right-3 top-3 h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Connect Platforms */}
        {currentStep === 'connect' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold">Connect your platforms</h1>
              <p className="mt-2 text-muted-foreground">
                Link your accounts for auto-posting. You can skip this for now.
              </p>
            </div>
            <div className="mx-auto max-w-lg space-y-4">
              {/* YouTube */}
              <div className="flex items-center justify-between rounded-xl border-2 border-border p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                    <Youtube className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">YouTube Shorts</h3>
                    {currentUser ? (
                      <p className="text-sm text-green-500">
                        Connected as {currentUser.channel_name}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not connected</p>
                    )}
                  </div>
                </div>
                {currentUser ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <Button onClick={handleConnectYouTube} variant="outline" size="sm">
                    Connect
                  </Button>
                )}
              </div>

              {/* TikTok */}
              <div className="flex items-center justify-between rounded-xl border-2 border-border/50 p-5 opacity-60">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-foreground/5">
                    <span className="text-2xl">🎵</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">TikTok</h3>
                    <p className="text-sm text-muted-foreground">Coming soon</p>
                  </div>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Soon</span>
              </div>

              {/* Instagram */}
              <div className="flex items-center justify-between rounded-xl border-2 border-border/50 p-5 opacity-60">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pink-500/5">
                    <span className="text-2xl">📸</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Instagram Reels</h3>
                    <p className="text-sm text-muted-foreground">Coming soon</p>
                  </div>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Soon</span>
              </div>

              {/* Auto-post toggle */}
              <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Daily Auto-Post</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate & post a new video every day
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAutoPost(!autoPost)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    autoPost ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      autoPost ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Generate */}
        {currentStep === 'generate' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold">Ready to create magic!</h1>
              <p className="mt-2 text-muted-foreground">
                Review your choices and hit generate.
              </p>
            </div>

            {/* Summary */}
            <div className="mx-auto max-w-md space-y-3 rounded-xl border-2 border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Niche</span>
                <span className="font-medium">
                  {niches.find((n) => n.id === selectedNiche)?.emoji}{' '}
                  {niches.find((n) => n.id === selectedNiche)?.name || 'Not selected'}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Style</span>
                <span className="font-medium">
                  {styles.find((s) => s.id === selectedStyle)?.emoji}{' '}
                  {styles.find((s) => s.id === selectedStyle)?.name || 'Not selected'}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Platforms</span>
                <span className="font-medium">
                  {currentUser ? '🔴 YouTube' : 'None connected'}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Auto-Post</span>
                <span className={`font-medium ${autoPost ? 'text-primary' : 'text-muted-foreground'}`}>
                  {autoPost ? '✅ Daily' : 'Off'}
                </span>
              </div>
            </div>

            {!generationResult ? (
              <div className="text-center">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !selectedNiche || !selectedStyle}
                  size="lg"
                  className="gap-2 px-8 py-6 text-lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating... This takes a few minutes
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Video Package
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-green-500/30 bg-green-500/5 p-6">
                  <div className="mb-3 flex items-center gap-2 text-green-500">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Generation Complete!</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg bg-card p-4 text-sm">
                    {generationResult}
                  </div>
                </div>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => router.push('/dashboard')} variant="outline">
                    Go to Dashboard
                  </Button>
                  <Button onClick={() => { setGenerationResult(null); setCurrentStep('niche') }}>
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Another
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        {!generationResult && (
          <div className="mt-10 flex items-center justify-between">
            <Button
              onClick={goBack}
              variant="ghost"
              disabled={stepIndex === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            {currentStep !== 'generate' && (
              <Button
                onClick={goNext}
                disabled={
                  (currentStep === 'niche' && !selectedNiche) ||
                  (currentStep === 'style' && !selectedStyle)
                }
                className="gap-2"
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
