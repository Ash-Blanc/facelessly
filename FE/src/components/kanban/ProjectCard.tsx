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
        'cursor-grab rounded-md border bg-background p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      {/* Title */}
      <h4 className="mb-2 line-clamp-2 font-medium">{project.title}</h4>

      {/* Status badges */}
      <div className="flex flex-wrap gap-1">
        {hasVideo && (
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Video
          </span>
        )}
        {hasAudio && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Audio
          </span>
        )}
        {hasThumbnail && (
          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            Thumbnail
          </span>
        )}
      </div>

      {/* Selected trend indicator */}
      {project.selected_trend_id && (
        <div className="mt-2 text-xs text-muted-foreground">
          Trend selected
        </div>
      )}
    </div>
  )
}
