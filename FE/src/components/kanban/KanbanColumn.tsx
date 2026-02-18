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
            className={`flex min-w-[240px] flex-1 flex-col rounded-lg transition-colors duration-200 ${isOver ? 'bg-primary/5 ring-1 ring-primary/30' : 'bg-base-100/50'
                }`}
        >
            {/* Column Header */}
            <div className="flex items-center justify-between px-3 py-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/50">{title}</h3>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-base-300/50 px-1.5 text-[10px] font-medium text-base-content/40">
                    {projects.length}
                </span>
            </div>

            {/* Column Content */}
            <div className="flex-1 space-y-1.5 px-2 pb-2">
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
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-base-300/50 text-xs text-base-content/20">
                        Drop here
                    </div>
                )}
            </div>
        </div>
    )
}
