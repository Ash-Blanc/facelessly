'use client'

import { useEffect, useState } from 'react'
import { X, Play, Volume2, Image, Download, ExternalLink } from 'lucide-react'

import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import type { Asset, Project } from '@/types/os'

const statusBadgeClass: Record<string, string> = {
    ready: 'badge badge-success badge-sm',
    pending: 'badge badge-warning badge-sm',
    error: 'badge badge-error badge-sm',
    processing: 'badge badge-info badge-sm'
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

    const handleClose = () => {
        setSelectedProjectId(null)
    }

    const handleDownload = (url: string, filename: string) => {
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
    }

    return (
        <div className="fixed right-0 top-0 z-50 h-full w-96 border-l border-base-300 bg-base-100 shadow-2xl slide-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-base-300 p-4">
                <div>
                    <h2 className="font-semibold text-base-content">{project.title}</h2>
                    <p className="text-sm capitalize text-base-content/50">
                        {project.status}
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Content */}
            <div className="space-y-4 overflow-y-auto p-4">
                {/* Video Asset */}
                {assets.video && (
                    <AssetSection
                        asset={assets.video}
                        type="video"
                        title="Generated Video"
                        icon={<Play className="h-4 w-4" />}
                        onDownload={(url) => handleDownload(url, `${project.title}-video.mp4`)}
                    />
                )}

                {/* Audio Asset */}
                {assets.audio && (
                    <AssetSection
                        asset={assets.audio}
                        type="audio"
                        title="Voiceover"
                        icon={<Volume2 className="h-4 w-4" />}
                        onDownload={(url) => handleDownload(url, `${project.title}-audio.mp3`)}
                    />
                )}

                {/* Thumbnail Asset */}
                {assets.thumbnail && (
                    <AssetSection
                        asset={assets.thumbnail}
                        type="image"
                        title="Thumbnail"
                        icon={<Image className="h-4 w-4" />}
                        onDownload={(url) => handleDownload(url, `${project.title}-thumbnail.jpg`)}
                    />
                )}

                {/* No assets yet */}
                {!assets.video && !assets.audio && !assets.thumbnail && (
                    <div className="py-8 text-center text-base-content/50">
                        <p>No assets generated yet</p>
                        <p className="mt-2 text-sm">
                            Run the agent to generate video, audio, and thumbnail
                        </p>
                    </div>
                )}

                {/* Script Section */}
                {assets.script && (
                    <div className="rounded-lg border border-base-300 bg-base-200 p-4">
                        <h3 className="mb-2 font-medium text-base-content">Script</h3>
                        <pre className="whitespace-pre-wrap text-sm text-base-content/70 font-mono">{assets.script.prompt}</pre>
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
    const [isPlaying, setIsPlaying] = useState(false)

    return (
        <div className="rounded-lg border border-base-300 overflow-hidden">
            <div className="flex items-center justify-between border-b border-base-300 bg-base-200 p-3">
                <div className="flex items-center gap-2 text-base-content">
                    {icon}
                    <span className="font-medium">{title}</span>
                </div>
                <span className={statusBadgeClass[asset.status] || 'badge badge-sm'}>
                    {asset.status}
                </span>
            </div>

            <div className="p-3">
                {/* Preview */}
                {type === 'video' && asset.url && (
                    <video
                        src={asset.url}
                        controls
                        className="mb-3 w-full rounded-lg"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
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

                {/* Actions */}
                {asset.url && (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDownload(asset.url!)}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(asset.url!, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Prompt */}
                {asset.prompt && (
                    <div className="mt-3">
                        <p className="text-xs text-base-content/50">Prompt:</p>
                        <p className="text-sm text-base-content/80">{asset.prompt}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
