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

const COLUMN_ACCENTS: Record<ProjectStatus, { dot: string; glow: string; label: string }> = {
    backlog: { dot: 'bg-base-content/30', glow: '', label: 'text-base-content/50' },
    trending: { dot: 'bg-warning', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.4)]', label: 'text-warning/80' },
    scripting: { dot: 'bg-info', glow: 'shadow-[0_0_8px_rgba(59,130,246,0.4)]', label: 'text-info/80' },
    production: { dot: 'bg-primary', glow: 'shadow-[0_0_8px_rgba(255,64,23,0.5)]', label: 'text-primary/80' },
    completed: { dot: 'bg-success', glow: 'shadow-[0_0_8px_rgba(34,197,94,0.4)]', label: 'text-success/80' },
}

export function KanbanColumn({
    id,
    title,
    projects,
    onProjectClick
}: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id })
    const accent = COLUMN_ACCENTS[id]

    return (
        <div
            ref={setNodeRef}
            className={`flex min-w-[240px] flex-1 flex-col rounded-2xl transition-all duration-300 ${isOver
                    ? 'bg-primary/5 ring-1 ring-primary/30 shadow-glow-sm'
                    : 'glass'
                }`}
        >
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <span
                        className={`h-2 w-2 shrink-0 rounded-full ${accent.dot} ${accent.glow}`}
                    />
                    <h3 className={`text-xs font-semibold uppercase tracking-widest ${accent.label}`}>
                        {title}
                    </h3>
                </div>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-base-300/60 px-1.5 text-[10px] font-medium text-base-content/40">
                    {projects.length}
                </span>
            </div>

            {/* Divider */}
            <div className="mx-4 h-px bg-white/5" />

            {/* Column Content */}
            <div className="flex-1 space-y-2 p-3">
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
                    <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-base-300/30 text-xs text-base-content/20">
                        Drop here
                    </div>
                )}
            </div>
        </div>
    )
}
