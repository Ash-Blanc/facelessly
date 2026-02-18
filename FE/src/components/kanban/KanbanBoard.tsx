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

const COLUMNS: { id: ProjectStatus; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'trending', title: 'Trending' },
  { id: 'scripting', title: 'Scripting' },
  { id: 'production', title: 'Production' },
  { id: 'completed', title: 'Completed' }
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
      grouped[key as ProjectStatus].sort((a, b) => a.position - b.position)
    })

    return grouped
  }, [projects])

  const handleDragStart = (event: DragStartEvent) => {
    // Could add active drag state here
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    // Handle cross-column movement during drag
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find the active project
    const activeProject = projects.find((p) => p.id === activeId)
    if (!activeProject) return

    // Determine new status and position
    let newStatus: ProjectStatus = activeProject.status
    let newPosition = activeProject.position

    // Check if dropped on a column
    const isColumn = COLUMNS.some((col) => col.id === overId)
    if (isColumn) {
      newStatus = overId as ProjectStatus
      newPosition = projectsByStatus[newStatus].length
    } else {
      // Dropped on another project - find its column
      const overProject = projects.find((p) => p.id === overId)
      if (overProject) {
        newStatus = overProject.status
        const columnProjects = projectsByStatus[newStatus]
        const overIndex = columnProjects.findIndex((p) => p.id === overId)
        newPosition = overIndex >= 0 ? overIndex : columnProjects.length
      }
    }

    // Only update if something changed
    if (newStatus !== activeProject.status || newPosition !== activeProject.position) {
      try {
        await moveProject(activeId, newStatus, newPosition)
        toast.success('Project moved')
      } catch (error) {
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
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            projects={projectsByStatus[column.id]}
            onProjectClick={handleProjectClick}
          />
        ))}
      </div>
      <DragOverlay>
        {/* Could add drag preview here */}
      </DragOverlay>
    </DndContext>
  )
}
