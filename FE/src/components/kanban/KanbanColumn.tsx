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
  projects: Project[]
  onProjectClick: (project: Project) => void
}

export function KanbanColumn({
  id,
  title,
  projects,
  onProjectClick
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[280px] flex-col rounded-lg border bg-card ${
        isOver ? 'border-primary/50 bg-primary/5' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-muted-foreground text-sm">
          {projects.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex-1 space-y-2 p-2">
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
          <div className="text-muted-foreground py-8 text-center text-sm">
            No projects
          </div>
        )}
      </div>
    </div>
  )
}
