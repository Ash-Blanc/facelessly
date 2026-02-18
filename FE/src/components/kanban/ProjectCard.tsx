'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Play, Volume2, Image } from 'lucide-react'

import type { Project } from '@/types/os'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
    project: Project
    onClick: () => void
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: project.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition
    }

    const assets = project.assets || {}
    const hasVideo = !!assets.video
    const hasAudio = !!assets.audio
    const hasThumbnail = !!assets.thumbnail

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={cn(
                'group cursor-grab rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5 shadow-card',
                'transition-all duration-300',
                'hover:border-primary/25 hover:bg-white/[0.05] hover:shadow-card-hover hover:-translate-y-0.5',
                isDragging && 'opacity-50 shadow-glow-md scale-105 cursor-grabbing'
            )}
        >
            {/* Title */}
            <h4 className="mb-3 line-clamp-2 text-sm font-medium leading-snug text-base-content">
                {project.title}
            </h4>

            {/* Asset badges */}
            {(hasVideo || hasAudio || hasThumbnail) && (
                <div className="flex flex-wrap gap-1.5">
                    {hasVideo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                            <Play className="h-2.5 w-2.5" />
                            Video
                        </span>
                    )}
                    {hasAudio && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-medium text-info">
                            <Volume2 className="h-2.5 w-2.5" />
                            Audio
                        </span>
                    )}
                    {hasThumbnail && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-medium text-secondary">
                            <Image className="h-2.5 w-2.5" />
                            Thumb
                        </span>
                    )}
                </div>
            )}

            {/* Trend indicator */}
            {project.selected_trend_id && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-base-content/40">
                    <span className="h-1 w-1 rounded-full bg-warning" />
                    Trend selected
                </div>
            )}
        </div>
    )
}
