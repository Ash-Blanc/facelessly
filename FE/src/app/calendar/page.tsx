'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Video, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Youtube, CheckCircle2, XCircle, Clock, Loader2, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'

interface PostJob {
  id: string
  title: string
  platforms: string
  status: string
  scheduled_at?: string
  posted_at?: string
  created_at: string
}

interface ContentJob {
  id: string
  for_date: string
  status: string
  template_id: string
  pipeline_name?: string
  platforms?: string
}

interface CalendarDay {
  posts: PostJob[]
  content_jobs: ContentJob[]
}

type CalendarData = Record<string, CalendarDay>

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  posted: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-green-500 bg-green-500/10', label: 'Posted' },
  queued: { icon: <Clock className="h-3.5 w-3.5" />, color: 'text-blue-500 bg-blue-500/10', label: 'Queued' },
  retrying: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: 'text-yellow-500 bg-yellow-500/10', label: 'Retrying' },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />, color: 'text-red-500 bg-red-500/10', label: 'Failed' },
  partial: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-orange-500 bg-orange-500/10', label: 'Partial' },
  pending: { icon: <Sparkles className="h-3.5 w-3.5" />, color: 'text-purple-500 bg-purple-500/10', label: 'Generating' },
}

const PLATFORM_EMOJI: Record<string, string> = {
  youtube: '📺',
  tiktok: '🎵',
  instagram: '📸',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function CalendarPage() {
  const { currentUser } = useStore()
  const [calendarData, setCalendarData] = useState<CalendarData>({})
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser?.id) {
      fetchCalendar()
    } else {
      setLoading(false)
    }
  }, [currentUser?.id])

  const fetchCalendar = async () => {
    try {
      const res = await fetch(APIRoutes.GetCalendar(currentUser!.id, 90))
      if (res.ok) {
        setCalendarData(await res.json())
      }
    } catch {
      // No data
    } finally {
      setLoading(false)
    }
  }

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()

    const days: { date: string; day: number; inMonth: boolean }[] = []

    // Previous month padding
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({
        date: d.toISOString().slice(0, 10),
        day: d.getDate(),
        inMonth: false,
      })
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d)
      days.push({
        date: date.toISOString().slice(0, 10),
        day: d,
        inMonth: true,
      })
    }

    // Next month padding to complete last week
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i)
        days.push({
          date: d.toISOString().slice(0, 10),
          day: d.getDate(),
          inMonth: false,
        })
      }
    }

    return days
  }, [currentMonth])

  const today = new Date().toISOString().slice(0, 10)

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const getDayData = (dateStr: string) => calendarData[dateStr]

  const selectedDayData = selectedDate ? getDayData(selectedDate) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Faceless Factory</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/generate">
            <Button variant="ghost" size="sm">Generate</Button>
          </Link>
          <Link href="/connect">
            <Button variant="ghost" size="sm">Connect</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Dashboard</Button>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CalendarIcon className="h-8 w-8 text-primary" />
              Content Calendar
            </h1>
            <p className="mt-1 text-muted-foreground">
              View and manage your scheduled and posted content.
            </p>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="min-w-[180px] text-center text-lg font-semibold">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {!currentUser ? (
          <div className="mt-12 text-center">
            <p className="text-muted-foreground">Connect your accounts to see your content calendar.</p>
            <Link href="/connect">
              <Button className="mt-4">Connect Platforms</Button>
            </Link>
          </div>
        ) : loading ? (
          <div className="mt-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-6 flex gap-6">
            {/* Calendar Grid */}
            <div className="flex-1">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS.map(day => (
                  <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground uppercase">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar cells */}
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
                      className={`
                        relative min-h-[80px] rounded-lg border p-1.5 text-left transition-all
                        ${inMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground/50'}
                        ${isToday ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border/50'}
                        ${isSelected ? 'border-primary ring-2 ring-primary/50' : ''}
                        ${hasPosts ? 'hover:border-primary/60' : 'hover:border-border'}
                      `}
                    >
                      <span className={`text-xs font-medium ${isToday ? 'text-primary' : ''}`}>
                        {day}
                      </span>

                      {/* Status indicators */}
                      {dayData && (
                        <div className="mt-1 space-y-0.5">
                          {dayData.posts.slice(0, 2).map(post => {
                            const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.queued
                            const platforms = post.platforms.split(',')
                            return (
                              <div
                                key={post.id}
                                className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] ${cfg.color}`}
                              >
                                {cfg.icon}
                                <span className="truncate">
                                  {platforms.map(p => PLATFORM_EMOJI[p.trim()] || '📋').join('')}
                                </span>
                              </div>
                            )
                          })}
                          {dayData.content_jobs.slice(0, 2).map(cj => {
                            const cfg = STATUS_CONFIG[cj.status] || STATUS_CONFIG.pending
                            return (
                              <div
                                key={cj.id}
                                className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] ${cfg.color}`}
                              >
                                {cfg.icon}
                                <span className="truncate">{cj.template_id}</span>
                              </div>
                            )
                          })}
                          {(dayData.posts.length + dayData.content_jobs.length > 2) && (
                            <span className="text-[10px] text-muted-foreground">
                              +{dayData.posts.length + dayData.content_jobs.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className={cfg.color}>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Day Detail */}
            {selectedDate && (
              <div className="w-72 shrink-0">
                <div className="sticky top-6 rounded-xl border border-border/50 bg-card p-4">
                  <h3 className="font-semibold">
                    {new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric'
                    })}
                  </h3>

                  {selectedDayData ? (
                    <div className="mt-3 space-y-3">
                      {selectedDayData.posts.map(post => {
                        const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.queued
                        return (
                          <div key={post.id} className="rounded-lg border border-border/50 p-3">
                            <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color} rounded-md px-2 py-1 w-fit`}>
                              {cfg.icon}
                              {cfg.label}
                            </div>
                            <p className="mt-2 text-sm font-medium truncate">{post.title}</p>
                            <div className="mt-1 flex gap-1.5">
                              {post.platforms.split(',').map(p => (
                                <span key={p} className="text-sm">{PLATFORM_EMOJI[p.trim()] || '📋'}</span>
                              ))}
                            </div>
                            {post.posted_at && (
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                Posted: {new Date(post.posted_at).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        )
                      })}

                      {selectedDayData.content_jobs.map(cj => (
                        <div key={cj.id} className="rounded-lg border border-dashed border-border/50 p-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-purple-500 bg-purple-500/10 rounded-md px-2 py-1 w-fit">
                            <Sparkles className="h-3.5 w-3.5" />
                            {cj.status === 'pending' ? 'Scheduled' : cj.status}
                          </div>
                          <p className="mt-2 text-sm font-medium">
                            {cj.pipeline_name || 'Pipeline'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Template: {cj.template_id}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No content scheduled for this day.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
