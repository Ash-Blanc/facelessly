'use client'

import { useEffect, useState } from 'react'
import { X, Play, Volume2, ImageIcon, Download, ExternalLink, RefreshCw, Loader2 } from 'lucide-react'

import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { generateMediaAPI } from '@/api/projects'
import { getProjectAPI } from '@/api/projects'
import type { Asset, Project } from '@/types/os'

const statusBadgeClass: Record<string, string> = {
  ready: 'badge badge-success badge-sm',
  pending: 'badge badge-warning badge-sm',
  error: 'badge badge-error badge-sm',
  processing: 'badge badge-info badge-sm',
  failed: 'badge badge-error badge-sm',
}

export function AssetPreviewPanel() {
  const { selectedProjectId, projects, setSelectedProjectId, currentUser } = useStore()
  const [project, setProject] = useState<Project | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)

  const userId = currentUser?.id || 'anonymous'

  useEffect(() => {
    if (selectedProjectId) {
      const found = projects.find((p) => p.id === selectedProjectId)
      setProject(found || null)
    } else {
      setProject(null)
    }
  }, [selectedProjectId, projects])

  if (!project) return null

  const assets = project.assets || {}

  const handleClose = () => setSelectedProjectId(null)

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  }

  const handleRegenerate = async (type: 'video' | 'audio' | 'thumbnail') => {
    setRegenerating(type)
    const updated = await generateMediaAPI(project.id, userId, [type])
    if (updated) {
      // Refresh project from store or re-fetch
      const fresh = await getProjectAPI(project.id, userId)
      if (fresh) setProject(fresh)
    }
    setRegenerating(null)
  }

  return (
    <div className="fixed right-0 top-0 z-50 h-full w-96 border-l border-base-300 bg-base-100 shadow-2xl slide-up overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-base-300 p-4">
        <div>
          <h2 className="font-semibold text-base-content">{project.title}</h2>
          <p className="text-sm capitalize text-base-content/50">{project.status}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Script Section */}
        {assets.script && (
          <div className="rounded-lg border border-base-300 bg-base-200 p-4">
            <h3 className="mb-2 font-medium text-base-content flex items-center gap-2">
              📝 Script
              <span className={statusBadgeClass[assets.script.status] ?? 'badge badge-sm'}>{assets.script.status}</span>
            </h3>
            <pre className="whitespace-pre-wrap text-sm text-base-content/70 font-mono max-h-32 overflow-y-auto">
              {assets.script.prompt}
            </pre>
          </div>
        )}

        {/* Video Asset */}
        {assets.video && (
          <AssetSection
            asset={assets.video}
            type="video"
            title="Video"
            icon={<Play className="h-4 w-4" />}
            isRegenerating={regenerating === 'video'}
            onDownload={(url) => handleDownload(url, `${project.title}-video.mp4`)}
            onRegenerate={() => handleRegenerate('video')}
          />
        )}

        {/* Audio Asset */}
        {assets.audio && (
          <AssetSection
            asset={assets.audio}
            type="audio"
            title="Voiceover"
            icon={<Volume2 className="h-4 w-4" />}
            isRegenerating={regenerating === 'audio'}
            onDownload={(url) => handleDownload(url, `${project.title}-audio.mp3`)}
            onRegenerate={() => handleRegenerate('audio')}
          />
        )}

        {/* Thumbnail Asset */}
        {assets.thumbnail && (
          <AssetSection
            asset={assets.thumbnail}
            type="image"
            title="Thumbnail"
            icon={<ImageIcon className="h-4 w-4" />}
            isRegenerating={regenerating === 'thumbnail'}
            onDownload={(url) => handleDownload(url, `${project.title}-thumbnail.jpg`)}
            onRegenerate={() => handleRegenerate('thumbnail')}
          />
        )}

        {/* No assets yet */}
        {!assets.video && !assets.audio && !assets.thumbnail && !assets.script && (
          <div className="py-8 text-center text-base-content/50">
            <p>No assets yet</p>
            <p className="mt-2 text-sm">
              Open the project to generate content step by step
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface AssetSectionProps {
  asset: Asset
  type: 'video' | 'audio' | 'image'
  title: string
  icon: React.ReactNode
  isRegenerating?: boolean
  onDownload: (url: string) => void
  onRegenerate?: () => void
}

function AssetSection({ asset, type, title, icon, isRegenerating = false, onDownload, onRegenerate }: AssetSectionProps) {
  return (
    <div className="rounded-lg border border-base-300 overflow-hidden">
      <div className="flex items-center justify-between border-b border-base-300 bg-base-200 p-3">
        <div className="flex items-center gap-2 text-base-content">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={statusBadgeClass[asset.status] ?? 'badge badge-sm'}>{asset.status}</span>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              title="Regenerate"
              className="flex h-6 w-6 items-center justify-center rounded text-base-content/40 hover:bg-base-300 hover:text-base-content transition disabled:opacity-40"
            >
              {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      <div className="p-3">
        {/* Preview */}
        {type === 'video' && asset.url && (
          <video
            src={asset.url}
            controls
            className="mb-3 w-full rounded-lg"
          />
        )}
        {type === 'audio' && asset.url && (
          <audio src={asset.url} controls className="mb-3 w-full" />
        )}
        {type === 'image' && asset.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt={title} className="mb-3 w-full rounded-lg" />
        )}

        {/* Actions */}
        {asset.url && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onDownload(asset.url!)}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(asset.url!, '_blank')}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Prompt */}
        {asset.prompt && (
          <div className="mt-3">
            <p className="text-xs text-base-content/50">Prompt:</p>
            <p className="text-sm text-base-content/80 line-clamp-2">{asset.prompt}</p>
          </div>
        )}
      </div>
    </div>
  )
}
