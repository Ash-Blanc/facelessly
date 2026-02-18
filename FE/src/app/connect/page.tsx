'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Video, Youtube, CheckCircle, ExternalLink, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import { toast } from 'sonner'

interface Schedule {
  id?: string
  niche?: string
  style?: string
  platforms?: string
  frequency?: string
  enabled?: number
  status?: string
}

export default function ConnectPage() {
  const { currentUser, setCurrentUser } = useStore()
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentUser?.id) {
      fetchSchedule()
    } else {
      setLoading(false)
    }
  }, [currentUser?.id])

  const fetchSchedule = async () => {
    try {
      const res = await fetch(APIRoutes.GetSchedule(currentUser!.id))
      if (res.ok) {
        const data = await res.json()
        setSchedule(data.status !== 'none' ? data : null)
      }
    } catch {
      // No schedule found
    } finally {
      setLoading(false)
    }
  }

  const handleConnectYouTube = () => {
    const backendUrl = process.env.NEXT_PUBLIC_OS_URL || 'http://localhost:8000'
    window.location.href = `${backendUrl}/auth/youtube`
  }

  const handleDisableSchedule = async () => {
    if (!currentUser) return
    try {
      await fetch(APIRoutes.DeleteSchedule(currentUser.id), { method: 'DELETE' })
      setSchedule(null)
      toast.success('Auto-posting disabled')
    } catch {
      toast.error('Failed to disable schedule')
    }
  }

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
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Dashboard</Button>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/generate" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Generator
        </Link>

        <h1 className="text-3xl font-bold">Connected Platforms</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your social media connections and auto-posting.
        </p>

        <div className="mt-8 space-y-4">
          {/* YouTube */}
          <div className="rounded-xl border-2 border-border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/10">
                  <Youtube className="h-7 w-7 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">YouTube Shorts</h3>
                  {currentUser ? (
                    <p className="text-sm text-green-500 flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Connected as {currentUser.channel_name}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Upload & auto-post YouTube Shorts
                    </p>
                  )}
                </div>
              </div>
              {currentUser ? (
                <Button variant="outline" size="sm" disabled>
                  Connected
                </Button>
              ) : (
                <Button onClick={handleConnectYouTube} size="sm">
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* TikTok */}
          <div className="rounded-xl border-2 border-border/50 p-6 opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-foreground/5">
                  <span className="text-3xl">🎵</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">TikTok</h3>
                  <p className="text-sm text-muted-foreground">Coming soon — API integration in progress</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
                Coming Soon
              </span>
            </div>
          </div>

          {/* Instagram */}
          <div className="rounded-xl border-2 border-border/50 p-6 opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-pink-500/5">
                  <span className="text-3xl">📸</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Instagram Reels</h3>
                  <p className="text-sm text-muted-foreground">Coming soon — API integration in progress</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
                Coming Soon
              </span>
            </div>
          </div>
        </div>

        {/* Schedule Status */}
        {schedule && (
          <div className="mt-8 rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
            <h3 className="text-lg font-semibold">📅 Active Schedule</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-medium">{schedule.frequency || 'Daily'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Niche</span>
                <span className="font-medium">{schedule.niche}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Style</span>
                <span className="font-medium">{schedule.style}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platforms</span>
                <span className="font-medium">{schedule.platforms}</span>
              </div>
            </div>
            <Button
              onClick={handleDisableSchedule}
              variant="destructive"
              size="sm"
              className="mt-4"
            >
              Disable Auto-Post
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
