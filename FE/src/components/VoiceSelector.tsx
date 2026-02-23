'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, Check, Crown, Play, Pause } from 'lucide-react'
import { APIRoutes } from '@/api/routes'
import { cn } from '@/lib/utils'

const PREVIEW_TEXT = "Welcome to Facelessly. I will narrate your viral videos with this voice."

interface Voice {
  id: string
  name: string
  provider: string
  gender: string
  style: string
  premium?: boolean
  // Maps to Web Speech API voice name search term
  speechName?: string
}

interface VoiceSelectorProps {
  selectedId?: string | null
  onSelect: (voiceId: string) => void
  showPremium?: boolean
}

const STYLE_COLORS: Record<string, string> = {
  bright: 'text-yellow-600',
  cinematic: 'text-blue-600',
  clean: 'text-gray-500',
  retro: 'text-amber-600',
  futuristic: 'text-purple-600',
  deep: 'text-slate-600',
  conversational: 'text-green-600',
  narrator: 'text-orange-600',
  soft: 'text-pink-600',
}

// Pitch/rate settings per voice to approximate different voice styles
const VOICE_SETTINGS: Record<string, { pitch: number; rate: number }> = {
  nova:    { pitch: 1.2, rate: 1.0 },   // bright female
  alloy:   { pitch: 1.0, rate: 1.0 },   // neutral
  echo:    { pitch: 0.9, rate: 1.15 },  // energetic male
  fable:   { pitch: 0.85, rate: 0.95 }, // storyteller male
  shimmer: { pitch: 1.3, rate: 0.9 },   // soft female
  onyx:    { pitch: 0.7, rate: 0.9 },   // deep male narrator
}

function speakPreview(voiceId: string, onStart: () => void, onEnd: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd()
    return
  }

  // Cancel any current speech
  window.speechSynthesis.cancel()

  const utter = new SpeechSynthesisUtterance(PREVIEW_TEXT)
  const settings = VOICE_SETTINGS[voiceId] ?? { pitch: 1.0, rate: 1.0 }
  utter.pitch = settings.pitch
  utter.rate = settings.rate
  utter.volume = 1

  // Try to pick an appropriate browser voice based on gender
  const isFemale = ['nova', 'shimmer'].includes(voiceId)
  const isDeep = voiceId === 'onyx'
  const availableVoices = window.speechSynthesis.getVoices()
  if (availableVoices.length > 0) {
    const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'))
    const femaleVoices = englishVoices.filter(v =>
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('victoria') ||
      v.name.toLowerCase().includes('karen') ||
      v.name.toLowerCase().includes('moira') ||
      v.name.toLowerCase().includes('tessa')
    )
    const maleVoices = englishVoices.filter(v =>
      v.name.toLowerCase().includes('male') ||
      v.name.toLowerCase().includes('daniel') ||
      v.name.toLowerCase().includes('fred') ||
      v.name.toLowerCase().includes('alex') ||
      v.name.toLowerCase().includes('tom')
    )
    if (isFemale && femaleVoices.length > 0) {
      utter.voice = femaleVoices[0]
    } else if (!isFemale && maleVoices.length > 0) {
      utter.voice = maleVoices[0]
    } else if (englishVoices.length > 0) {
      utter.voice = englishVoices[0]
    }
  }

  utter.onstart = () => onStart()
  utter.onend = () => onEnd()
  utter.onerror = () => onEnd()

  window.speechSynthesis.speak(utter)
}

export function VoiceSelector({ selectedId, onSelect, showPremium = false }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [gender, setGender] = useState<string>('all')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [speechReady, setSpeechReady] = useState(false)

  useEffect(() => {
    fetch(APIRoutes.GetVoices(showPremium))
      .then(r => r.json())
      .then(d => setVoices(d.voices ?? []))
      .catch(() => {
        setVoices([
          { id: 'nova',    name: 'Nova',    provider: 'openai', gender: 'female', style: 'bright' },
          { id: 'alloy',   name: 'Alloy',   provider: 'openai', gender: 'neutral', style: 'clean' },
          { id: 'echo',    name: 'Echo',    provider: 'openai', gender: 'male', style: 'cinematic' },
          { id: 'fable',   name: 'Fable',   provider: 'openai', gender: 'male', style: 'retro' },
          { id: 'shimmer', name: 'Shimmer', provider: 'openai', gender: 'female', style: 'futuristic' },
          { id: 'onyx',    name: 'Onyx',    provider: 'openai', gender: 'male', style: 'deep' },
        ])
      })
  }, [showPremium])

  // Load speech synthesis voices (they load async in some browsers)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const load = () => setSpeechReady(true)
    if (window.speechSynthesis.getVoices().length > 0) {
      setSpeechReady(true)
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', load)
    }
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', load)
  }, [])

  // Stop speech on unmount
  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  const handlePreview = (e: React.MouseEvent, voice: Voice) => {
    e.stopPropagation()

    // Toggle off if already playing
    if (playingId === voice.id) {
      window.speechSynthesis?.cancel()
      setPlayingId(null)
      return
    }

    setPlayingId(voice.id)
    speakPreview(
      voice.id,
      () => setPlayingId(voice.id),
      () => setPlayingId(null),
    )
  }

  const GENDER_FILTER = ['all', 'male', 'female', 'neutral']
  const filtered = gender === 'all' ? voices : voices.filter(v => v.gender === gender)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mic className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">Voice</h4>
        <span className="text-[10px] text-base-content/40 ml-auto">Click ▶ to preview with browser TTS</span>
      </div>

      {/* Gender filter */}
      <div className="flex gap-1.5">
        {GENDER_FILTER.map(g => (
          <button
            key={g}
            onClick={() => setGender(g)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition capitalize',
              gender === g ? 'border-primary bg-primary/10 text-primary' : 'border-base-300 text-base-content/50 hover:border-base-content/30'
            )}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Voice grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map(voice => (
          <button
            key={voice.id}
            onClick={() => onSelect(voice.id)}
            className={cn(
              'flex items-center gap-2 rounded-xl border p-2.5 text-left transition',
              selectedId === voice.id
                ? 'border-primary bg-primary/5'
                : 'border-base-300 hover:border-primary/30'
            )}
          >
            {/* Play/pause preview button */}
            <button
              onClick={(e) => handlePreview(e, voice)}
              disabled={voice.premium}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition',
                playingId === voice.id
                  ? 'bg-primary text-white'
                  : selectedId === voice.id
                    ? 'bg-primary text-white'
                    : 'bg-base-200 text-base-content/60 hover:bg-primary/20 hover:text-primary'
              )}
              title={voice.premium ? 'Premium — connect ElevenLabs to preview' : `Preview ${voice.name}`}
            >
              {playingId === voice.id ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="truncate text-xs font-semibold">{voice.name}</p>
                {voice.premium && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
              </div>
              <p className={`text-[10px] capitalize ${STYLE_COLORS[voice.style] ?? 'text-base-content/40'}`}>
                {voice.style} · {voice.gender}
              </p>
            </div>
            {selectedId === voice.id && <Check className="h-4 w-4 text-primary shrink-0" />}
          </button>
        ))}
      </div>

      {!speechReady && (
        <p className="text-center text-[10px] text-base-content/30">Loading voice engine...</p>
      )}
    </div>
  )
}
