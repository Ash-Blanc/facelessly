'use client'

import { useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { toast } from 'sonner'

import { useStore } from '@/store'
import type { Project, ProjectStatus } from '@/types/os'
import { KanbanColumn } from './KanbanColumn'
import { ProjectCard } from './ProjectCard'

// These match the backend ProjectStatus values exactly
const COLUMNS: { id: ProjectStatus; title: string; emoji: string }[] = [
  { id: 'backlog',    title: 'Backlog',    emoji: '📋' },
  { id: 'trending',  title: 'Trending',   emoji: '🔥' },
  { id: 'scripting', title: 'Scripting',  emoji: '✍️' },
  { id: 'production',title: 'Production', emoji: '🎬' },
  { id: 'completed', title: 'Completed',  emoji: '✅' },
]

export function KanbanBoard() {
  const { projects, moveProject, setSelectedProjectId } = useStore()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Group projects by status
  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatus, Project[]> = {
      backlog: [],
      trending: [],
      scripting: [],
      production: [],
      completed: []
    }

    projects.forEach((project) => {
      const status = project.status || 'backlog'
      if (grouped[status]) {
        grouped[status].push(project)
      } else {
        grouped.backlog.push(project)
      }
    })

    // Sort by position within each column
    Object.keys(grouped).forEach((key) => {
      grouped[key as ProjectStatus].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    })

    return grouped
  }, [projects])

  const handleDragStart = (_event: DragStartEvent) => {
    // Deselect any open panel when dragging
    setSelectedProjectId(null)
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by DndKit internals
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeProject = projects.find((p) => p.id === activeId)
    if (!activeProject) return

    let newStatus: ProjectStatus = activeProject.status
    let newPosition = activeProject.position ?? 0

    // Dropped on a column header
    const isColumn = COLUMNS.some((col) => col.id === overId)
    if (isColumn) {
      newStatus = overId as ProjectStatus
      newPosition = projectsByStatus[newStatus].length
    } else {
      // Dropped on another project card – find its column
      const overProject = projects.find((p) => p.id === overId)
      if (overProject) {
        newStatus = overProject.status
        const columnProjects = projectsByStatus[newStatus]
        const overIndex = columnProjects.findIndex((p) => p.id === overId)
        newPosition = overIndex >= 0 ? overIndex : columnProjects.length
      }
    }

    if (newStatus !== activeProject.status || newPosition !== activeProject.position) {
      try {
        await moveProject(activeId, newStatus, newPosition)
        toast.success(`Moved to ${newStatus}`)
      } catch {
        toast.error('Failed to move project')
      }
    }
  }

  const handleProjectClick = (project: Project) => {
    setSelectedProjectId(project.id)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-4">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            emoji={column.emoji}
            projects={projectsByStatus[column.id]}
            onProjectClick={handleProjectClick}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {/* Transparent overlay; card itself shows dragging state */}
      </DragOverlay>
    </DndContext>
  )
}
