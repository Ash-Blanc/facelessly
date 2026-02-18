'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Youtube } from 'lucide-react'

import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { KanbanBoard, AssetPreviewPanel } from '@/components/kanban'
import { getProjectsAPI } from '@/api/projects'

function DashboardContent() {
  const searchParams = useSearchParams()
  const {
    currentUser,
    setCurrentUser,
    projects,
    setProjects,
    isProjectsLoading,
    setIsProjectsLoading,
    createProject,
    selectedProjectId
  } = useStore()

  const [error, setError] = useState<string | null>(null)

  // Handle OAuth redirect with user data
  useEffect(() => {
    const userId = searchParams.get('user_id')
    const channelName = searchParams.get('channel_name')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError(decodeURIComponent(errorParam))
      return
    }

    if (userId && channelName && !currentUser) {
      // Set user from OAuth redirect
      setCurrentUser({
        id: userId,
        youtube_channel_id: '',
        channel_name: decodeURIComponent(channelName)
      })
    }
  }, [searchParams, currentUser, setCurrentUser])

  // Fetch projects when user is set
  useEffect(() => {
    if (currentUser?.id) {
      fetchProjects(currentUser.id)
    }
  }, [currentUser?.id])

  const fetchProjects = async (userId: string) => {
    setIsProjectsLoading(true)
    try {
      const data = await getProjectsAPI(userId)
      setProjects(data)
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setIsProjectsLoading(false)
    }
  }

  const handleConnectYouTube = () => {
    // Redirect to backend OAuth endpoint
    const backendUrl = process.env.NEXT_PUBLIC_OS_URL || 'http://localhost:8000'
    window.location.href = `${backendUrl}/auth/youtube`
  }

  const handleCreateProject = async () => {
    const title = prompt('Enter project title:')
    if (!title) return

    await createProject(title)
  }

  // Show auth prompt if not connected
  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="mb-4 text-3xl font-bold">Faceless Video Factory</h1>
          <p className="mb-8 text-muted-foreground">
            Connect your YouTube channel to start creating viral shorts automatically
          </p>

          {error && (
            <div className="mb-4 rounded bg-red-100 p-3 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <Button onClick={handleConnectYouTube} size="lg">
            <Youtube className="mr-2 h-5 w-5" />
            Connect YouTube Channel
          </Button>
        </div>
      </div>
    )
  }

  // Show dashboard with kanban board
  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Faceless Video Factory</h1>
          {currentUser.channel_picture && (
            <img
              src={currentUser.channel_picture}
              alt={currentUser.channel_name}
              className="h-8 w-8 rounded-full"
            />
          )}
          <span className="text-muted-foreground">{currentUser.channel_name}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleCreateProject}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="flex-1 overflow-hidden">
        {isProjectsLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <KanbanBoard />
        )}
      </main>

      {/* Asset Preview Panel */}
      {selectedProjectId && <AssetPreviewPanel />}
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DashboardContent />
    </Suspense>
  )
}
