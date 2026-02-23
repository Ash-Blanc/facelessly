'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  CheckCircle2, XCircle, Clock, Loader2, Sparkles
} from 'lucide-react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import Link from 'next/link'

interface PostJob {
  id: string; title: string; platforms: string; status: string
  scheduled_at?: string; posted_at?: string; created_at: string
}

interface ContentJob {
  id: string; for_date: string; status: string; template_id: string
  pipeline_name?: string; platforms?: string
}

interface CalendarDay { posts: PostJob[]; content_jobs: ContentJob[] }
type CalendarData = Record<string, CalendarDay>

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  posted:    { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-green-600 bg-green-500/10', label: 'Posted' },
  queued:    { icon: <Clock className="h-3.5 w-3.5" />,        color: 'text-blue-600 bg-blue-500/10',   label: 'Queued' },
  retrying:  { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: 'text-yellow-600 bg-yellow-500/10', label: 'Retrying' },
  failed:    { icon: <XCircle className="h-3.5 w-3.5" />,      color: 'text-red-600 bg-red-500/10',     label: 'Failed' },
  partial:   { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-orange-600 bg-orange-500/10', label: 'Partial' },
  pending:   { icon: <Sparkles className="h-3.5 w-3.5" />,     color: 'text-purple-600 bg-purple-500/10', label: 'Generating' },
}

const PLATFORM_EMOJI: Record<string, string> = { youtube: '📺', tiktok: '🎵', instagram: '📸' }
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function CalendarPage() {
  const { currentUser } = useStore()
  const [calendarData, setCalendarData] = useState<CalendarData>({})
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser?.id) fetchCalendar()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  const fetchCalendar = async () => {
    try {
      const res = await fetch(APIRoutes.GetCalendar(currentUser!.id, 90))
      if (res.ok) setCalendarData(await res.json())
    } catch { /* no data */ } finally { setLoading(false) }
  }

  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear(), month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const days: { date: string; day: number; inMonth: boolean }[] = []
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d.toISOString().slice(0, 10), day: d.getDate(), inMonth: false })
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d)
      days.push({ date: date.toISOString().slice(0, 10), day: d, inMonth: true })
    }
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i)
        days.push({ date: d.toISOString().slice(0, 10), day: d.getDate(), inMonth: false })
      }
    }
    return days
  }, [currentMonth])

  const today = new Date().toISOString().slice(0, 10)
  const getDayData = (dateStr: string) => calendarData[dateStr]
  const selectedDayData = selectedDate ? getDayData(selectedDate) : null

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-3">
            <CalendarIcon className="h-7 w-7 text-primary" />
            Content Calendar
          </h1>
          <p className="mt-1 text-sm text-base-content/50">View and manage your scheduled content.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="rounded-lg p-2 hover:bg-base-200 transition">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[180px] text-center font-semibold font-display">
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="rounded-lg p-2 hover:bg-base-200 transition">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!currentUser ? (
        <div className="mt-12 text-center">
          <p className="text-base-content/50">Connect your accounts to see your content calendar.</p>
          <Link href="/create" className="mt-4 inline-block rounded-xl gradient-brand px-5 py-2.5 text-sm font-bold text-white">Get Started</Link>
        </div>
      ) : loading ? (
        <div className="mt-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 flex gap-6">
          <div className="flex-1">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(day => (
                <div key={day} className="py-2 text-center text-xs font-medium text-base-content/40 uppercase">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarGrid.map(({ date, day, inMonth }) => {
                const dayData = getDayData(date)
                const isToday = date === today
                const isSelected = date === selectedDate
                const hasPosts = dayData && (dayData.posts.length > 0 || dayData.content_jobs.length > 0)
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(isSelected ? null : date)}
                    className={`relative min-h-[80px] rounded-xl border p-1.5 text-left transition-all
                      ${inMonth ? 'bg-base-100' : 'bg-base-200/30 text-base-content/30'}
                      ${isToday ? 'border-primary/50 ring-1 ring-primary/30' : 'border-base-300'}
                      ${isSelected ? 'border-primary ring-2 ring-primary/50' : ''}
                      ${hasPosts ? 'hover:border-primary/60' : 'hover:border-base-300'}
                    `}
                  >
                    <span className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : ''}`}>{day}</span>
                    {dayData && (
                      <div className="mt-1 space-y-0.5">
                        {dayData.posts.slice(0, 2).map(post => {
                          const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.queued
                          return (
                            <div key={post.id} className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] ${cfg.color}`}>
                              {cfg.icon}
                              <span className="truncate">{post.platforms.split(',').map(p => PLATFORM_EMOJI[p.trim()] || '📋').join('')}</span>
                            </div>
                          )
                        })}
                        {dayData.content_jobs.slice(0, 1).map(cj => {
                          const cfg = STATUS_CONFIG[cj.status] || STATUS_CONFIG.pending
                          return (
                            <div key={cj.id} className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] ${cfg.color}`}>
                              {cfg.icon}<span className="truncate">{cj.template_id}</span>
                            </div>
                          )
                        })}
                        {(dayData.posts.length + dayData.content_jobs.length > 2) && (
                          <span className="text-[10px] text-base-content/40">+{dayData.posts.length + dayData.content_jobs.length - 2} more</span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-base-content/50">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={cfg.color}>{cfg.icon}</span><span>{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedDate && (
            <div className="w-72 shrink-0">
              <div className="sticky top-6 rounded-2xl border border-base-300 bg-base-100 p-4">
                <h3 className="font-semibold font-display">
                  {new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                {selectedDayData ? (
                  <div className="mt-3 space-y-3">
                    {selectedDayData.posts.map(post => {
                      const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.queued
                      return (
                        <div key={post.id} className="rounded-xl border border-base-300 p-3">
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color} rounded-md px-2 py-1 w-fit`}>{cfg.icon}{cfg.label}</div>
                          <p className="mt-2 text-sm font-medium truncate">{post.title}</p>
                          <div className="mt-1 flex gap-1.5">
                            {post.platforms.split(',').map(p => (<span key={p} className="text-sm">{PLATFORM_EMOJI[p.trim()] || '📋'}</span>))}
                          </div>
                        </div>
                      )
                    })}
                    {selectedDayData.content_jobs.map(cj => (
                      <div key={cj.id} className="rounded-xl border border-dashed border-base-300 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-purple-600 bg-purple-500/10 rounded-md px-2 py-1 w-fit">
                          <Sparkles className="h-3.5 w-3.5" />{cj.status === 'pending' ? 'Scheduled' : cj.status}
                        </div>
                        <p className="mt-2 text-sm font-medium">{cj.pipeline_name || 'Pipeline'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-base-content/50">No content scheduled for this day.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
