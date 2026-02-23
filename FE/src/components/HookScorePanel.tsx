'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Loader2, TrendingUp, AlertCircle } from 'lucide-react'
import { APIRoutes } from '@/api/routes'

interface HookScore {
  hook: string
  score: number
  grade: string
  strengths: string[]
  improvements: string[]
  estimated_retention: string
}

interface HookScorePanelProps {
  projectId?: string
  script?: string
  userId?: string
}

const GRADE_COLOR: Record<string, string> = {
  'A+': 'text-green-600 bg-green-500/10',
  'A': 'text-green-600 bg-green-500/10',
  'A-': 'text-green-600 bg-green-500/10',
  'B+': 'text-blue-600 bg-blue-500/10',
  'B': 'text-blue-600 bg-blue-500/10',
  'B-': 'text-blue-600 bg-blue-500/10',
  'C+': 'text-yellow-600 bg-yellow-500/10',
  'C': 'text-yellow-600 bg-yellow-500/10',
  'D': 'text-orange-600 bg-orange-500/10',
  'F': 'text-red-600 bg-red-500/10',
}

const SCORE_BAR: Record<number, string> = {}
for (let i = 1; i <= 10; i++) {
  SCORE_BAR[i] = i >= 8 ? 'bg-green-500' : i >= 6 ? 'bg-blue-500' : i >= 4 ? 'bg-yellow-500' : 'bg-red-500'
}

export function HookScorePanel({ projectId, script, userId = 'anonymous' }: HookScorePanelProps) {
  const [result, setResult] = useState<HookScore | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const score = useCallback(async () => {
    if (!projectId && !script) return
    setIsLoading(true)
    setError(null)
    try {
      const resp = await fetch(APIRoutes.ScoreHook(projectId ?? 'temp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, script: script ?? '' }),
      })
      if (!resp.ok) throw new Error('Scoring failed')
      setResult(await resp.json())
    } catch (e) {
      setError('Could not score hook. Backend may not be running.')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, script, userId])

  return (
    <div className="rounded-xl border border-base-300 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Hook Strength Score</h4>
        </div>
        <button
          onClick={score}
          disabled={isLoading || (!projectId && !script)}
          className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-40"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {result ? 'Re-score' : 'Score Hook'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Score display */}
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black ${GRADE_COLOR[result.grade] ?? 'bg-base-200'}`}>
              {result.grade}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-base-content/50 mb-1">
                <span>Score: {result.score}/10</span>
                <span>{result.estimated_retention} retention est.</span>
              </div>
              <div className="h-2 w-full rounded-full bg-base-300 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${SCORE_BAR[result.score]}`}
                  style={{ width: `${(result.score / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Hook preview */}
          <div className="rounded-lg bg-base-200 p-3 text-xs italic text-base-content/70">
            &ldquo;{result.hook}&rdquo;
          </div>

          {/* Feedback */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-green-600 mb-1">✅ Strengths</p>
              <ul className="space-y-0.5 text-base-content/70">
                {result.strengths.map((s, i) => <li key={i}>· {s}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-yellow-600 mb-1">⚡ Improve</p>
              <ul className="space-y-0.5 text-base-content/70">
                {result.improvements.map((s, i) => <li key={i}>· {s}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {!result && !isLoading && (
        <p className="text-xs text-base-content/40 text-center py-2">
          Score your hook to get AI-powered retention feedback
        </p>
      )}
    </div>
  )
}
