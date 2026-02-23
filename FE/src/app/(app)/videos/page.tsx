'use client'

import { useEffect, useState } from 'react'
import { PlaySquare, Download, ExternalLink, Loader2, Film } from 'lucide-react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'

interface VideoItem {
  id: string
  title: string
  status: string
  video_url?: string
  platforms?: string
  created_at: string
  posted_at?: string
}

const STATUS_COLORS: Record<string, string> = {
  posted: 'bg-green-500/10 text-green-600',
  ready: 'bg-blue-500/10 text-blue-600',
  generating: 'bg-purple-500/10 text-purple-600',
  failed: 'bg-red-500/10 text-red-600',
  queued: 'bg-yellow-500/10 text-yellow-600',
}

export default function VideosPage() {
  const { currentUser } = useStore()
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  const fetchVideos = async () => {
    if (!currentUser?.id) { setLoading(false); return }
    try {
      const res = await fetch(APIRoutes.ListPosts(currentUser.id))
      if (res.ok) setVideos(await res.json())
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }

  const filteredVideos = filter === 'all' ? videos : videos.filter(v => v.status === filter)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Videos</h1>
          <p className="mt-1 text-sm text-base-content/50">All your generated and posted videos</p>
        </div>
        <div className="flex items-center gap-2">
          {['all', 'posted', 'ready', 'generating', 'failed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-primary/10 text-primary'
                  : 'text-base-content/40 hover:bg-base-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
            <PlaySquare className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold font-display">No videos yet</h2>
          <p className="mt-2 max-w-sm text-sm text-base-content/50">
            Create a series and we&apos;ll start generating videos for you automatically.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map(video => (
            <div
              key={video.id}
              className="group rounded-2xl border border-base-300 bg-base-100 overflow-hidden transition-all hover:border-primary/30 hover:shadow-glow"
            >
              {/* Thumbnail */}
              <div className="relative aspect-[9/16] max-h-[200px] bg-base-200 flex items-center justify-center overflow-hidden">
                {video.video_url ? (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                ) : (
                  <Film className="h-8 w-8 text-base-content/20" />
                )}
                <div className="absolute bottom-2 left-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[video.status] || STATUS_COLORS.queued}`}>
                    {video.status}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-sm truncate">{video.title || `Video ${video.id.slice(0, 8)}`}</h3>
                <p className="mt-1 text-xs text-base-content/40">
                  {new Date(video.created_at).toLocaleDateString()}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {video.video_url && (
                    <a
                      href={video.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition"
                    >
                      <ExternalLink className="h-3 w-3" /> View
                    </a>
                  )}
                  {video.video_url && (
                    <a
                      href={video.video_url}
                      download
                      className="flex items-center gap-1 rounded-lg border border-base-300 px-3 py-1.5 text-xs font-medium hover:bg-base-200 transition"
                    >
                      <Download className="h-3 w-3" /> Download
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
