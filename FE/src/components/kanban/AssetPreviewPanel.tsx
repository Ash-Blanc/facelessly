'use client'

import { useEffect, useState } from 'react'
import { X, Play, Volume2, Image, Download, ExternalLink } from 'lucide-react'

import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import type { Asset, Project } from '@/types/os'

const statusBadgeClass: Record<string, string> = {
    ready: 'bg-success/10 text-success',
    pending: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
    processing: 'bg-info/10 text-info'
}

export function AssetPreviewPanel() {
    const { selectedProjectId, projects, setSelectedProjectId } = useStore()
    const [project, setProject] = useState<Project | null>(null)

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

    return (
        <div className="fixed right-0 top-0 z-50 h-full w-96 border-l border-white/[0.07] bg-base-100/90 shadow-2xl backdrop-blur-2xl slide-up">
            {/* Top accent bar */}
            <div className="h-0.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
                <div>
                    <h2 className="font-semibold text-base-content">{project.title}</h2>
                    <p className="mt-0.5 text-xs capitalize text-base-content/40">
                        {project.status}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="h-8 w-8 rounded-lg hover:bg-white/5"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Content */}
            <div className="space-y-3 overflow-y-auto p-4">
                {assets.video && (
                    <AssetSection
                        asset={assets.video}
                        type="video"
                        title="Generated Video"
                        icon={<Play className="h-3.5 w-3.5" />}
                        onDownload={(url) => handleDownload(url, `${project.title}-video.mp4`)}
                    />
                )}

                {assets.audio && (
                    <AssetSection
                        asset={assets.audio}
                        type="audio"
                        title="Voiceover"
                        icon={<Volume2 className="h-3.5 w-3.5" />}
                        onDownload={(url) => handleDownload(url, `${project.title}-audio.mp3`)}
                    />
                )}

                {assets.thumbnail && (
                    <AssetSection
                        asset={assets.thumbnail}
                        type="image"
                        title="Thumbnail"
                        icon={<Image className="h-3.5 w-3.5" />}
                        onDownload={(url) => handleDownload(url, `${project.title}-thumbnail.jpg`)}
                    />
                )}

                {!assets.video && !assets.audio && !assets.thumbnail && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-base-300/50">
                            <Play className="h-5 w-5 text-base-content/30" />
                        </div>
                        <p className="text-sm font-medium text-base-content/50">No assets yet</p>
                        <p className="mt-1 text-xs text-base-content/30">
                            Run the agent to generate video, audio, and thumbnail
                        </p>
                    </div>
                )}

                {assets.script && (
                    <div className="rounded-xl border border-white/[0.06] bg-base-200/60 p-4">
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-base-content/40">Script</h3>
                        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-base-content/70">
                            {assets.script.prompt}
                        </pre>
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
    onDownload: (url: string) => void
}

function AssetSection({ asset, type, title, icon, onDownload }: AssetSectionProps) {
    return (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-base-200/40">
            {/* Section header */}
            <div className="flex items-center justify-between border-b border-white/[0.05] bg-base-200/60 px-3 py-2.5">
                <div className="flex items-center gap-2 text-base-content/70">
                    {icon}
                    <span className="text-xs font-medium">{title}</span>
                </div>
                <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass[asset.status] || 'bg-base-300/50 text-base-content/40'
                        }`}
                >
                    {asset.status}
                </span>
            </div>

            <div className="p-3">
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
                    <img
                        src={asset.url}
                        alt={title}
                        className="mb-3 w-full rounded-lg"
                    />
                )}

                {asset.url && (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDownload(asset.url!)}
                            className="h-7 rounded-lg border-white/10 bg-white/5 text-xs hover:bg-white/10"
                        >
                            <Download className="mr-1.5 h-3 w-3" />
                            Download
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(asset.url!, '_blank')}
                            className="h-7 w-7 rounded-lg border-white/10 bg-white/5 p-0 hover:bg-white/10"
                        >
                            <ExternalLink className="h-3 w-3" />
                        </Button>
                    </div>
                )}

                {asset.prompt && (
                    <div className="mt-3 border-t border-white/[0.05] pt-3">
                        <p className="mb-1 text-[10px] uppercase tracking-widest text-base-content/30">Prompt</p>
                        <p className="text-xs leading-relaxed text-base-content/60">{asset.prompt}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
