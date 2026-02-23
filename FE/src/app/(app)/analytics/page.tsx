'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3, TrendingUp, Eye, Clock, ThumbsUp, Users,
  Loader2, RefreshCw, AlertCircle
} from 'lucide-react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'

interface DayData {
  date: string
  views: number
  watch_minutes: number
  subscribers_gained: number
  likes: number
}

interface AnalyticsSummary {
  views: number
  watch_minutes: number
  subscribers_gained: number
  likes: number
  avg_view_duration_sec: number
}

interface AnalyticsData {
  mock: boolean
  message?: string
  summary: AnalyticsSummary
  daily: DayData[]
  top_videos?: { title: string; views: number; likes: number }[]
}

type Period = 7 | 28 | 90

const periodLabel: Record<Period, string> = { 7: '7 days', 28: '28 days', 90: '90 days' }

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
      <div className="flex items-center gap-2 text-base-content/50 text-sm">
        {icon}{label}
      </div>
      <p className="mt-2 text-3xl font-black font-display">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="mt-0.5 text-xs text-base-content/40">{sub}</p>}
    </div>
  )
}

function MiniBarChart({ data, field }: { data: DayData[]; field: keyof Omit<DayData, 'date'> }) {
  const max = Math.max(...data.map(d => d[field] as number), 1)
  return (
    <div className="flex items-end gap-0.5 h-16">
      {data.map((d, i) => (
        <div key={i} className="flex-1 min-w-0" title={`${d.date}: ${d[field]}`}>
          <div
            className="w-full rounded-sm bg-primary/60 hover:bg-primary transition-all"
            style={{ height: `${((d[field] as number) / max) * 100}%` }}
          />
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { currentUser } = useStore()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [period, setPeriod] = useState<Period>(28)
  const [isLoading, setIsLoading] = useState(true)

  const userId = currentUser?.id || 'anonymous'

  const load = async () => {
    setIsLoading(true)
    try {
      const resp = await fetch(APIRoutes.GetAnalytics(userId, period))
      if (resp.ok) {
        const json = await resp.json()
        // Guard: only use data if summary exists (backend error response won't have it)
        if (json && json.summary) {
          setData(json)
        } else if (json && !json.summary) {
          // Backend returned {error: ...} or mock without summary — synthesise a safe empty state
          setData({
            mock: true,
            message: json.message ?? json.error ?? 'Connect YouTube to see real analytics.',
            summary: { views: 0, watch_minutes: 0, subscribers_gained: 0, likes: 0, avg_view_duration_sec: 0 },
            daily: [],
            top_videos: [],
          })
        }
      }
    } catch {}
    setIsLoading(false)
  }

  useEffect(() => { load() }, [userId, period])

  return (
    <div className="mx-auto max-w-5xl px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" /> Analytics
          </h1>
          <p className="mt-1 text-base-content/50 text-sm">Your YouTube channel performance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-base-300 overflow-hidden">
            {([7, 28, 90] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium transition ${period === p ? 'bg-primary text-white' : 'hover:bg-base-200 text-base-content/60'}`}
              >
                {periodLabel[p]}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={isLoading} className="flex h-9 w-9 items-center justify-center rounded-xl border border-base-300 hover:bg-base-200 transition disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mock banner */}
      {data?.mock && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {data.message ?? 'Showing sample data — connect YouTube to see real analytics.'}
        </div>
      )}

      {isLoading && !data ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : data ? (
        <>
          {/* Summary stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Eye className="h-4 w-4" />} label="Views" value={data.summary.views} />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Watch Time" value={`${Math.round(data.summary.watch_minutes / 60)}h`} sub="hours watched" />
            <StatCard icon={<Users className="h-4 w-4" />} label="New Subscribers" value={data.summary.subscribers_gained} />
            <StatCard icon={<ThumbsUp className="h-4 w-4" />} label="Likes" value={data.summary.likes} sub={`${data.summary.avg_view_duration_sec}s avg duration`} />
          </div>

          {/* Charts */}
          {data.daily.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-base-300 p-5">
                <h3 className="mb-4 font-semibold text-sm text-base-content/70 flex items-center gap-1.5">
                  <Eye className="h-4 w-4" /> Views by Day
                </h3>
                <MiniBarChart data={data.daily} field="views" />
                <div className="mt-2 flex justify-between text-[10px] text-base-content/30">
                  <span>{data.daily[0]?.date}</span>
                  <span>{data.daily[data.daily.length - 1]?.date}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-base-300 p-5">
                <h3 className="mb-4 font-semibold text-sm text-base-content/70 flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Subscribers by Day
                </h3>
                <MiniBarChart data={data.daily} field="subscribers_gained" />
                <div className="mt-2 flex justify-between text-[10px] text-base-content/30">
                  <span>{data.daily[0]?.date}</span>
                  <span>{data.daily[data.daily.length - 1]?.date}</span>
                </div>
              </div>
            </div>
          )}

          {/* Top videos */}
          {data.top_videos && data.top_videos.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-bold font-display flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Top Videos
              </h2>
              <div className="overflow-hidden rounded-2xl border border-base-300">
                <table className="w-full text-sm">
                  <thead className="bg-base-200 text-left text-xs uppercase tracking-wider text-base-content/50">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3 text-right">Views</th>
                      <th className="px-4 py-3 text-right">Likes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-300">
                    {data.top_videos.map((v, i) => (
                      <tr key={i} className="hover:bg-base-200/40 transition">
                        <td className="px-4 py-3 font-medium">{v.title}</td>
                        <td className="px-4 py-3 text-right">{v.views.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{v.likes.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
