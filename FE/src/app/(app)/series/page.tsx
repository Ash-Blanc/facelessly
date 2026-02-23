'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Plus, Loader2, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { AssetPreviewPanel } from '@/components/kanban/AssetPreviewPanel'

export default function SeriesPage() {
  const { loadProjects, projects, isProjectsLoading, selectedProjectId } = useStore()

  useEffect(() => {
    loadProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-base-300 px-8 py-4">
        <div>
          <h1 className="text-2xl font-bold font-display">Projects</h1>
          <p className="mt-0.5 text-sm text-base-content/50">
            Drag cards across columns to advance your workflow
          </p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-bold text-white transition-all hover:shadow-glow"
        >
          <Plus className="h-4 w-4" />
          New Series
        </Link>
      </div>

      {/* Content */}
      {isProjectsLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold font-display">Create your first series</h2>
          <p className="mt-2 max-w-sm text-sm text-base-content/50">
            Set up a series with your niche, voice, and style — we&apos;ll auto-generate viral videos for you.
          </p>
          <Link
            href="/create"
            className="mt-6 flex items-center gap-2 rounded-xl gradient-brand px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-glow"
          >
            <Plus className="h-4 w-4" />
            Create Series
          </Link>
        </div>
      ) : (
        /* Kanban Board */
        <div className="relative flex-1 overflow-hidden">
          <KanbanBoard />
        </div>
      )}

      {/* Slide-out Asset Preview Panel */}
      {selectedProjectId && <AssetPreviewPanel />}
    </div>
  )
}
