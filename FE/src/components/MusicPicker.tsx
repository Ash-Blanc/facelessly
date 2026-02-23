'use client'

import { useState, useEffect } from 'react'
import { Music, Check, Play, Pause } from 'lucide-react'
import { APIRoutes } from '@/api/routes'
import { cn } from '@/lib/utils'

interface Track {
  id: string
  name: string
  mood: string
  bpm: number
  duration: number
  url: string
}

const MOODS = ['all', 'calm', 'dramatic', 'horror', 'energetic', 'futuristic', 'nostalgic', 'motivation', 'suspense']

const MOOD_COLORS: Record<string, string> = {
  calm: 'text-blue-500',
  dramatic: 'text-orange-500',
  horror: 'text-red-500',
  energetic: 'text-yellow-500',
  futuristic: 'text-purple-500',
  nostalgic: 'text-amber-500',
  motivation: 'text-green-500',
  suspense: 'text-gray-500',
}

interface MusicPickerProps {
  selectedId?: string | null
  onSelect: (trackId: string | null) => void
}

export function MusicPicker({ selectedId, onSelect }: MusicPickerProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [mood, setMood] = useState('all')
  const [playing, setPlaying] = useState<string | null>(null)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    const url = mood === 'all' ? APIRoutes.GetMusic() : APIRoutes.GetMusic(mood)
    fetch(url)
      .then(r => r.json())
      .then(d => setTracks(d.tracks ?? []))
      .catch(() => {})
  }, [mood])

  const handlePlay = (track: Track) => {
    if (!track.url) return
    if (playing === track.id) {
      audio?.pause()
      setPlaying(null)
      return
    }
    audio?.pause()
    const a = new Audio(track.url)
    a.play().catch(() => {})
    a.onended = () => setPlaying(null)
    setAudio(a)
    setPlaying(track.id)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">Background Music</h4>
      </div>

      {/* Mood filter */}
      <div className="flex flex-wrap gap-1.5">
        {MOODS.map(m => (
          <button
            key={m}
            onClick={() => setMood(m)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition capitalize',
              mood === m ? 'border-primary bg-primary/10 text-primary' : 'border-base-300 text-base-content/50 hover:border-base-content/30'
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition',
            !selectedId ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-base-content/20'
          )}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-base-200 text-base-content/40 text-xs">✕</div>
          <span className="text-base-content/60">No music</span>
        </button>
        {tracks.map(track => (
          <div
            key={track.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3 py-2 transition cursor-pointer',
              selectedId === track.id ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-base-content/20'
            )}
            onClick={() => onSelect(track.id)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); handlePlay(track) }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-base-200 hover:bg-primary/10 hover:text-primary transition"
            >
              {playing === track.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{track.name}</p>
              <p className={`text-[10px] capitalize ${MOOD_COLORS[track.mood] ?? 'text-base-content/40'}`}>
                {track.mood} · {track.bpm} BPM · {track.duration}s
              </p>
            </div>
            {selectedId === track.id && <Check className="h-4 w-4 text-primary shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  )
}
