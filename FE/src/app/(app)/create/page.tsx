'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Loader2,
  Play,
  Pause,
  Youtube,
  Globe,
  Mic,
  Palette,
  Type,
  Music,
  Link2,
  ClipboardCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { APIRoutes } from '@/api/routes'
import { useStore } from '@/store'

/* ─── Types ──────────────────────────────────── */
interface NicheOption { id: string; name: string; description: string; emoji: string }
interface StyleOption { id: string; name: string; description: string; emoji: string }

const LANGUAGES = [
  { id: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'es', name: 'Spanish', flag: '🇪🇸' },
  { id: 'fr', name: 'French', flag: '🇫🇷' },
  { id: 'de', name: 'German', flag: '🇩🇪' },
  { id: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { id: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { id: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { id: 'ko', name: 'Korean', flag: '🇰🇷' },
  { id: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { id: 'zh', name: 'Chinese', flag: '🇨🇳' },
]

// Voices mapped to Web Speech API pitch/rate settings
const VOICES = [
  { id: 'onyx',    name: 'Deep Narrator',     desc: 'Authoritative male voice', category: 'Male',   pitch: 0.7, rate: 0.9 },
  { id: 'nova',    name: 'Smooth Narrator',    desc: 'Warm female voice',        category: 'Female', pitch: 1.2, rate: 1.0 },
  { id: 'echo',    name: 'Energetic Host',     desc: 'Upbeat, fast-paced male',  category: 'Male',   pitch: 0.9, rate: 1.15 },
  { id: 'shimmer', name: 'Calm Guide',         desc: 'Soothing, ASMR-style',     category: 'Female', pitch: 1.3, rate: 0.85 },
  { id: 'fable',   name: 'Edgy Storyteller',   desc: 'Intense, dramatic male',   category: 'Male',   pitch: 0.85, rate: 0.95 },
  { id: 'alloy',   name: 'Friendly Explainer', desc: 'Casual, approachable',     category: 'Neutral',pitch: 1.0, rate: 1.05 },
]

const CAPTION_STYLES = [
  { id: 'bold_center', name: 'Bold Center', desc: 'Large bold text, centered', preview: 'THE CRAZIEST THING' },
  { id: 'subtitle_bottom', name: 'Subtitle', desc: 'Clean bottom subtitles', preview: 'Clean subtitle text' },
  { id: 'word_highlight', name: 'Word Highlight', desc: 'One word pops at a time', preview: 'WORD by WORD' },
  { id: 'karaoke', name: 'Karaoke Style', desc: 'Words highlight as spoken', preview: 'Karaoke flow' },
  { id: 'none', name: 'No Captions', desc: 'Video only, no text overlay', preview: '' },
]

const MUSIC_TRACKS = [
  { id: 'suspense_dark', name: 'Dark Suspense', genre: 'Horror/Mystery', duration: '2:30' },
  { id: 'epicorch', name: 'Epic Orchestra', genre: 'Cinematic', duration: '3:15' },
  { id: 'lofi_chill', name: 'Lo-Fi Chill', genre: 'Ambient', duration: '4:00' },
  { id: 'upbeat_pop', name: 'Upbeat Energy', genre: 'Pop/EDM', duration: '2:45' },
  { id: 'piano_emotional', name: 'Emotional Piano', genre: 'Classical', duration: '3:30' },
  { id: 'trap_bass', name: 'Hard Trap', genre: 'Hip-Hop', duration: '2:20' },
  { id: 'none', name: 'No Music', genre: '', duration: '' },
]

type StepId = 'niche' | 'language' | 'voice' | 'style' | 'captions' | 'music' | 'connect' | 'review'

const STEP_CONFIG: { id: StepId; title: string; icon: typeof Sparkles }[] = [
  { id: 'niche', title: 'Niche', icon: Sparkles },
  { id: 'language', title: 'Language', icon: Globe },
  { id: 'voice', title: 'Voice', icon: Mic },
  { id: 'style', title: 'Art Style', icon: Palette },
  { id: 'captions', title: 'Captions', icon: Type },
  { id: 'music', title: 'Music', icon: Music },
  { id: 'connect', title: 'Connect', icon: Link2 },
  { id: 'review', title: 'Review', icon: ClipboardCheck },
]

export default function CreateSeriesPage() {
  const router = useRouter()
  const { currentUser } = useStore()

  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [niches, setNiches] = useState<NicheOption[]>([])
  const [styles, setStyles] = useState<StyleOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [nicheTab, setNicheTab] = useState<'presets' | 'custom'>('presets')
  const [customNiche, setCustomNiche] = useState('')
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)

  // Selections
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const [selectedCaptions, setSelectedCaptions] = useState('bold_center')
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null)

  const currentStep = STEP_CONFIG[currentStepIdx]

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
      // Use defaults if backend is down
      setNiches([
        { id: 'horror', name: 'Scary Stories', description: 'Scary stories that give you goosebumps', emoji: '👻' },
        { id: 'history', name: 'History', description: 'Viral videos about history spanning from ancient times to the modern day.', emoji: '🏛️' },
        { id: 'true_crime', name: 'True Crime', description: 'Viral videos about true crime stories.', emoji: '🔍' },
        { id: 'motivation', name: 'Stoic Motivation', description: 'Viral videos about stoic philosophy and life lessons.', emoji: '💪' },
        { id: 'finance', name: 'Finance', description: 'Money tips, investing, and wealth building.', emoji: '💰' },
        { id: 'top10', name: 'Top 10', description: 'Countdown-style listicle videos.', emoji: '🏆' },
        { id: 'space', name: 'Space & Science', description: 'Mind-blowing facts about the universe.', emoji: '🚀' },
        { id: 'reddit', name: 'Reddit Stories', description: 'The best stories from Reddit, narrated.', emoji: '📖' },
      ])
      setStyles([
        { id: 'cinematic_dark', name: 'Cinematic Dark', description: 'Moody, atmospheric visuals', emoji: '🎬' },
        { id: 'bright_energetic', name: 'Bright & Energetic', description: 'Colorful, fast-paced edits', emoji: '⚡' },
        { id: 'minimal_clean', name: 'Minimal Clean', description: 'Simple, elegant compositions', emoji: '✨' },
        { id: 'retro_vintage', name: 'Retro Vintage', description: 'Nostalgic, film-grain look', emoji: '📼' },
        { id: 'neon_futuristic', name: 'Neon Futuristic', description: 'Cyberpunk, glowing aesthetics', emoji: '🌃' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const goNext = () => {
    if (currentStepIdx < STEP_CONFIG.length - 1) setCurrentStepIdx(currentStepIdx + 1)
  }

  const goBack = () => {
    if (currentStepIdx > 0) setCurrentStepIdx(currentStepIdx - 1)
  }

  const canProceed = () => {
    switch (currentStep.id) {
      case 'niche': return nicheTab === 'custom' ? customNiche.trim().length > 0 : !!selectedNiche
      case 'language': return !!selectedLanguage
      case 'voice': return !!selectedVoice
      case 'style': return !!selectedStyle
      case 'captions': return !!selectedCaptions
      case 'music': return !!selectedMusic
      case 'connect': return true // skippable
      case 'review': return true
      default: return false
    }
  }

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const res = await fetch(APIRoutes.Generate(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche: nicheTab === 'custom' ? customNiche : selectedNiche,
          style: selectedStyle,
          language: selectedLanguage,
          voice: selectedVoice,
          captions: selectedCaptions,
          music: selectedMusic,
          user_id: currentUser?.id || 'anonymous',
        })
      })
      if (res.ok) {
        toast.success('Series created! Generating your first video...')
        router.push('/series')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create series')
      }
    } catch {
      toast.error('Failed to connect to backend')
    } finally {
      setIsCreating(false)
    }
  }

  const handleConnectYouTube = () => {
    const backendUrl = process.env.NEXT_PUBLIC_OS_URL || 'http://localhost:8000'
    window.location.href = `${backendUrl}/auth/youtube`
  }

  const handleVoicePreview = (e: React.MouseEvent, voice: typeof VOICES[0]) => {
    e.stopPropagation()
    if (playingVoiceId === voice.id) {
      window.speechSynthesis?.cancel()
      setPlayingVoiceId(null)
      return
    }
    window.speechSynthesis?.cancel()
    const utter = new SpeechSynthesisUtterance(
      'Welcome to Facelessly. This is how I sound generating your viral videos.'
    )
    utter.pitch = voice.pitch
    utter.rate = voice.rate
    utter.volume = 1
    const isFemale = voice.category === 'Female'
    const available = window.speechSynthesis?.getVoices() ?? []
    const english = available.filter(v => v.lang.startsWith('en'))
    const match = english.find(v =>
      isFemale
        ? v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('karen')
        : v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('alex')
    ) ?? english[0]
    if (match) utter.voice = match
    utter.onstart = () => setPlayingVoiceId(voice.id)
    utter.onend = () => setPlayingVoiceId(null)
    utter.onerror = () => setPlayingVoiceId(null)
    window.speechSynthesis?.speak(utter)
    setPlayingVoiceId(voice.id)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const nicheDisplay = nicheTab === 'custom' ? customNiche : niches.find(n => n.id === selectedNiche)?.name
  const styleDisplay = styles.find(s => s.id === selectedStyle)?.name

  return (
    <div className="flex h-full flex-col">
      {/* ── Breadcrumb ────────────────────────────── */}
      <div className="border-b border-base-300 px-8 py-3">
        <div className="flex items-center gap-2 text-sm text-base-content/50">
          <button onClick={() => router.push('/series')} className="hover:text-base-content transition">Series</button>
          <span>›</span>
          <span className="text-base-content font-medium">Create New Series</span>
        </div>
      </div>

      {/* ── Progress Bar ──────────────────────────── */}
      <div className="px-8 pt-6 pb-2">
        <div className="flex gap-1.5">
          {STEP_CONFIG.map((step, i) => (
            <div
              key={step.id}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i <= currentStepIdx ? 'gradient-brand' : 'bg-base-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Step Content ──────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl">
          {/* Step Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold font-display">{getStepTitle(currentStep.id)}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Step {currentStepIdx + 1} of {STEP_CONFIG.length}
              </span>
              <span className="text-sm text-base-content/50">{getStepSubtitle(currentStep.id)}</span>
            </div>
          </div>

          {/* ── Step 1: Niche ──────────────────────── */}
          {currentStep.id === 'niche' && (
            <div>
              <div className="mb-6 flex gap-1 rounded-xl bg-base-200 p-1">
                <button
                  onClick={() => setNicheTab('presets')}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    nicheTab === 'presets' ? 'bg-base-100 shadow-sm text-base-content' : 'text-base-content/50 hover:text-base-content'
                  }`}
                >
                  <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
                  Presets
                </button>
                <button
                  onClick={() => setNicheTab('custom')}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    nicheTab === 'custom' ? 'bg-base-100 shadow-sm text-base-content' : 'text-base-content/50 hover:text-base-content'
                  }`}
                >
                  <Palette className="mr-1.5 inline h-3.5 w-3.5" />
                  Custom
                </button>
              </div>

              {nicheTab === 'presets' ? (
                <div className="space-y-2">
                  {niches.map(niche => (
                    <button
                      key={niche.id}
                      onClick={() => setSelectedNiche(niche.id)}
                      className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                        selectedNiche === niche.id
                          ? 'border-primary bg-primary/5'
                          : 'border-base-300 hover:border-primary/30'
                      }`}
                    >
                      <span className="text-2xl">{niche.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{niche.name}</h3>
                        <p className="text-sm text-base-content/50 truncate">{niche.description}</p>
                      </div>
                      {selectedNiche === niche.id && (
                        <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    value={customNiche}
                    onChange={(e) => setCustomNiche(e.target.value)}
                    placeholder="Describe your niche... e.g. 'Unsolved mysteries from the 1990s with a dark, cinematic vibe'"
                    className="w-full rounded-xl border-2 border-base-300 bg-base-100 p-4 text-sm placeholder:text-base-content/30 focus:border-primary focus:outline-none min-h-[120px] resize-none"
                  />
                  <p className="text-xs text-base-content/40">Be as specific as possible for better AI-generated content.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Language ───────────────────── */}
          {currentStep.id === 'language' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLanguage(lang.id)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                    selectedLanguage === lang.id
                      ? 'border-primary bg-primary/5'
                      : 'border-base-300 hover:border-primary/30'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium text-sm">{lang.name}</span>
                  {selectedLanguage === lang.id && (
                    <CheckCircle className="ml-auto h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Step 3: Voice ─────────────────────── */}
          {currentStep.id === 'voice' && (
            <div className="space-y-3">
              {VOICES.map(voice => (
                <div
                  key={voice.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedVoice(voice.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedVoice(voice.id) } }}
                  className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                    selectedVoice === voice.id
                      ? 'border-primary bg-primary/5'
                      : 'border-base-300 hover:border-primary/30'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <Mic className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{voice.name}</h3>
                    <p className="text-xs text-base-content/50">{voice.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full bg-base-200 px-2 py-0.5 text-[10px] font-medium text-base-content/50">{voice.category}</span>
                    <button
                      onClick={(e) => handleVoicePreview(e, voice)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-base-200 hover:bg-primary/10 hover:text-primary transition"
                      title={`Preview ${voice.name}`}
                    >
                      {playingVoiceId === voice.id ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {selectedVoice === voice.id && <CheckCircle className="h-5 w-5 text-primary shrink-0" />}
                </div>
              ))}
            </div>
          )}

          {/* ── Step 4: Art Style ──────────────────── */}
          {currentStep.id === 'style' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {styles.map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`group relative rounded-xl border-2 p-6 text-left transition-all hover:scale-[1.02] ${
                    selectedStyle === style.id
                      ? 'border-primary bg-primary/5 shadow-glow'
                      : 'border-base-300 hover:border-primary/30'
                  }`}
                >
                  <span className="text-4xl">{style.emoji}</span>
                  <h3 className="mt-3 font-semibold">{style.name}</h3>
                  <p className="mt-1 text-sm text-base-content/50">{style.description}</p>
                  {selectedStyle === style.id && (
                    <CheckCircle className="absolute right-3 top-3 h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Step 5: Captions ───────────────────── */}
          {currentStep.id === 'captions' && (
            <div className="space-y-3">
              {CAPTION_STYLES.map(cap => (
                <button
                  key={cap.id}
                  onClick={() => setSelectedCaptions(cap.id)}
                  className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    selectedCaptions === cap.id
                      ? 'border-primary bg-primary/5'
                      : 'border-base-300 hover:border-primary/30'
                  }`}
                >
                  <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-base-200/80 text-xs font-bold text-base-content/60 shrink-0">
                    {cap.preview || '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{cap.name}</h3>
                    <p className="text-xs text-base-content/50">{cap.desc}</p>
                  </div>
                  {selectedCaptions === cap.id && (
                    <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Step 6: Music ─────────────────────── */}
          {currentStep.id === 'music' && (
            <div className="space-y-3">
              {MUSIC_TRACKS.map(track => (
                <button
                  key={track.id}
                  onClick={() => setSelectedMusic(track.id)}
                  className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                    selectedMusic === track.id
                      ? 'border-primary bg-primary/5'
                      : 'border-base-300 hover:border-primary/30'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <Music className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{track.name}</h3>
                    {track.genre && (
                      <p className="text-xs text-base-content/50">{track.genre}</p>
                    )}
                  </div>
                  {track.duration && (
                    <span className="text-xs text-base-content/40 shrink-0">{track.duration}</span>
                  )}
                  {selectedMusic === track.id && (
                    <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ── Step 7: Connect ───────────────────── */}
          {currentStep.id === 'connect' && (
            <div className="space-y-4">
              {/* YouTube */}
              <div className="flex items-center justify-between rounded-xl border-2 border-base-300 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                    <Youtube className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">YouTube Shorts</h3>
                    {currentUser ? (
                      <p className="text-sm text-green-600">Connected as {currentUser.channel_name}</p>
                    ) : (
                      <p className="text-sm text-base-content/50">Auto-post to YouTube</p>
                    )}
                  </div>
                </div>
                {currentUser ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <button onClick={handleConnectYouTube} className="rounded-lg border border-base-300 px-4 py-2 text-sm font-medium hover:bg-base-200 transition">
                    Connect
                  </button>
                )}
              </div>

              {/* TikTok */}
              <div className="flex items-center justify-between rounded-xl border-2 border-base-300/50 p-5 opacity-60">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-base-200"><span className="text-2xl">🎵</span></div>
                  <div>
                    <h3 className="font-semibold">TikTok</h3>
                    <p className="text-sm text-base-content/50">Coming soon</p>
                  </div>
                </div>
                <span className="rounded-full bg-base-200 px-3 py-1 text-xs text-base-content/40">Soon</span>
              </div>

              {/* Instagram */}
              <div className="flex items-center justify-between rounded-xl border-2 border-base-300/50 p-5 opacity-60">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500/5"><span className="text-2xl">📸</span></div>
                  <div>
                    <h3 className="font-semibold">Instagram Reels</h3>
                    <p className="text-sm text-base-content/50">Coming soon</p>
                  </div>
                </div>
                <span className="rounded-full bg-base-200 px-3 py-1 text-xs text-base-content/40">Soon</span>
              </div>

              <p className="text-center text-sm text-base-content/40 mt-4">
                You can skip this step and connect later from Settings.
              </p>
            </div>
          )}

          {/* ── Step 8: Review ────────────────────── */}
          {currentStep.id === 'review' && (
            <div className="space-y-6">
              <div className="rounded-2xl border-2 border-base-300 divide-y divide-base-300">
                <ReviewRow label="Niche" value={nicheDisplay || 'Not selected'} />
                <ReviewRow label="Language" value={LANGUAGES.find(l => l.id === selectedLanguage)?.name || 'English'} />
                <ReviewRow label="Voice" value={VOICES.find(v => v.id === selectedVoice)?.name || 'Not selected'} />
                <ReviewRow label="Art Style" value={styleDisplay || 'Not selected'} />
                <ReviewRow label="Captions" value={CAPTION_STYLES.find(c => c.id === selectedCaptions)?.name || 'None'} />
                <ReviewRow label="Music" value={MUSIC_TRACKS.find(m => m.id === selectedMusic)?.name || 'None'} />
                <ReviewRow label="Platforms" value={currentUser ? '🔴 YouTube' : 'None connected'} />
              </div>

              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full rounded-xl gradient-brand py-4 text-center font-bold text-white transition-all hover:shadow-glow-lg disabled:opacity-50"
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Creating Series...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Create Series
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation Footer ─────────────────────── */}
      {currentStep.id !== 'review' && (
        <div className="flex items-center justify-between border-t border-base-300 px-8 py-4">
          <button
            onClick={goBack}
            disabled={currentStepIdx === 0}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-base-content/60 transition hover:text-base-content disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className="flex items-center gap-2 rounded-xl gradient-brand px-6 py-2.5 text-sm font-bold text-white transition-all hover:shadow-glow disabled:opacity-30"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Helpers ──────────────────────────────────── */
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-sm text-base-content/50">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function getStepTitle(id: StepId) {
  const map: Record<StepId, string> = {
    niche: 'Choose your niche',
    language: 'Pick your language',
    voice: 'Choose AI voice',
    style: 'Select art style',
    captions: 'Caption style',
    music: 'Background music',
    connect: 'Connect social accounts',
    review: 'Review & create',
  }
  return map[id]
}

function getStepSubtitle(id: StepId) {
  const map: Record<StepId, string> = {
    niche: 'Select a preset or describe your own niche',
    language: 'Choose the language for your videos',
    voice: 'Choose voice and captions for your videos',
    style: 'Pick visual aesthetics for your content',
    captions: 'How text appears in your videos',
    music: 'Select background music for your videos',
    connect: 'Link your social media accounts for auto-publishing',
    review: 'Confirm your selections and create the series',
  }
  return map[id]
}
