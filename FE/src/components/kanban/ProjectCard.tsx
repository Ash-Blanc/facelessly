'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { ArrowRight, FileText, Video, Volume2, Image, Trash2 } from 'lucide-react'

import type { Project } from '@/types/os'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import { toast } from 'sonner'

interface ProjectCardProps {
  project: Project
  onClick: () => void
}

const STATUS_COLORS: Record<string, string> = {
  backlog: 'text-base-content/40 bg-base-200',
  trending: 'text-blue-600 bg-blue-500/10',
  scripting: 'text-yellow-600 bg-yellow-500/10',
  production: 'text-purple-600 bg-purple-500/10',
  completed: 'text-green-600 bg-green-500/10',
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const { deleteProject } = useStore()
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
  const hasScript = !!assets.script
  const hasVideo = !!assets.video
  const hasAudio = !!assets.audio
  const hasThumbnail = !!assets.thumbnail

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    await deleteProject(project.id)
    toast.success('Project deleted')
  }

  // Determine next step label for "Continue" button
  const getNextStepLabel = () => {
    switch (project.status) {
      case 'backlog': return 'Research Trends'
      case 'trending': return 'Write Script'
      case 'scripting': return 'Generate Media'
      case 'production': return 'Review'
      case 'completed': return 'Export'
      default: return 'Open'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group cursor-grab rounded-xl border border-base-300 bg-base-100 p-3.5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20',
        isDragging && 'opacity-50 shadow-xl scale-105 rotate-1'
      )}
    >
      {/* Title */}
      <h4 className="mb-2 line-clamp-2 font-medium text-base-content text-sm leading-snug">
        {project.title}
      </h4>

      {/* Status */}
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLORS[project.status] ?? STATUS_COLORS.backlog}`}>
        {project.status}
      </span>

      {/* Asset indicator icons */}
      <div className="mt-2.5 flex gap-1.5">
        <AssetDot active={hasScript} icon={<FileText className="h-2.5 w-2.5" />} label="Script" />
        <AssetDot active={hasVideo} icon={<Video className="h-2.5 w-2.5" />} label="Video" />
        <AssetDot active={hasAudio} icon={<Volume2 className="h-2.5 w-2.5" />} label="Audio" />
        <AssetDot active={hasThumbnail} icon={<Image className="h-2.5 w-2.5" />} label="Thumb" />
      </div>

      {/* Created date */}
      {project.created_at && (
        <p className="mt-2 text-[10px] text-base-content/30">
          {new Date(project.created_at).toLocaleDateString()}
        </p>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link
          href={`/project/${project.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary/10 px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/20 transition"
        >
          {getNextStepLabel()} <ArrowRight className="h-3 w-3" />
        </Link>
        <button
          onClick={handleDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-error/10 text-base-content/30 hover:text-error transition"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

function AssetDot({ active, icon, label }: { active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <div
      title={label}
      className={cn(
        'flex h-5 w-5 items-center justify-center rounded-full transition-colors',
        active ? 'bg-primary/20 text-primary' : 'bg-base-200 text-base-content/20'
      )}
    >
      {icon}
    </div>
  )
}
