'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

    // Get asset status indicators
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
                'cursor-grab rounded-lg border border-base-300 bg-base-100 p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
                isDragging && 'opacity-50 shadow-lg scale-105'
            )}
        >
            {/* Title */}
            <h4 className="mb-2 line-clamp-2 font-medium text-base-content">{project.title}</h4>

            {/* Status badges */}
            <div className="flex flex-wrap gap-1">
                {hasVideo && (
                    <span className="badge badge-success badge-sm gap-1">
                        Video
                    </span>
                )}
                {hasAudio && (
                    <span className="badge badge-info badge-sm gap-1">
                        Audio
                    </span>
                )}
                {hasThumbnail && (
                    <span className="badge badge-secondary badge-sm gap-1">
                        Thumbnail
                    </span>
                )}
            </div>

            {/* Selected trend indicator */}
            {project.selected_trend_id && (
                <div className="mt-2 text-xs text-base-content/50">
                    Trend selected
                </div>
            )}
        </div>
    )
}
