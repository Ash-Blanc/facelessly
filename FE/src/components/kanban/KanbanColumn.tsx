'use client'

import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'

import type { Project, ProjectStatus } from '@/types/os'
import { ProjectCard } from './ProjectCard'

interface KanbanColumnProps {
  id: ProjectStatus
  title: string
  emoji?: string
  projects: Project[]
  onProjectClick: (project: Project) => void
}

export function KanbanColumn({
  id,
  title,
  emoji,
  projects,
  onProjectClick
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[220px] max-w-[260px] flex-1 flex-col rounded-xl border transition-colors duration-200 ${
        isOver ? 'border-primary/40 bg-primary/5' : 'border-base-300/60 bg-base-200/30'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          {emoji && <span className="text-sm">{emoji}</span>}
          <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/60">
            {title}
          </h3>
        </div>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-base-300/50 px-1.5 text-[10px] font-medium text-base-content/40">
          {projects.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onProjectClick(project)}
            />
          ))}
        </SortableContext>

        {projects.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-base-300/50 text-xs text-base-content/20">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}
