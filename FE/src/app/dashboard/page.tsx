'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Youtube, MessageSquare, Video } from 'lucide-react'

import { useStore } from '@/store'
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
            <div className="flex h-screen items-center justify-center bg-base-100">
                <div className="max-w-md text-center fade-in">
                    <Video className="mx-auto mb-4 h-12 w-12 text-primary" />
                    <h1 className="mb-2 text-2xl font-bold text-base-content">Connect YouTube</h1>
                    <p className="mb-6 text-sm text-base-content/50">
                        Link your channel to start creating faceless shorts
                    </p>

                    {error && (
                        <div className="mb-4 rounded-lg bg-error/10 px-4 py-2 text-sm text-error">
                            {error}
                        </div>
                    )}

                    <button onClick={handleConnectYouTube} className="btn btn-primary gap-2">
                        <Youtube className="h-4 w-4" />
                        Connect YouTube
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen flex-col bg-base-100">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-base-300 px-5 py-3">
                <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-primary" />
                    <h1 className="text-sm font-semibold text-base-content">Faceless Video Factory</h1>
                    <span className="text-xs text-base-content/40">•</span>
                    <span className="text-xs text-base-content/40">{currentUser.channel_name}</span>
                    {currentUser.channel_picture && (
                        <img
                            src={currentUser.channel_picture}
                            alt={currentUser.channel_name}
                            className="h-6 w-6 rounded-full"
                        />
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/chat">
                        <button className="btn btn-ghost btn-sm gap-1 text-base-content/60">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Chat
                        </button>
                    </Link>
                    <button onClick={handleCreateProject} className="btn btn-primary btn-sm gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        New Project
                    </button>
                </div>
            </header>

            {/* Kanban Board */}
            <main className="flex-1 overflow-hidden">
                {isProjectsLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <span className="loading loading-ring loading-lg text-primary"></span>
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

export default function DashboardPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center bg-base-100">
                    <span className="loading loading-ring loading-lg text-primary"></span>
                </div>
            }
        >
            <DashboardContent />
        </Suspense>
    )
}
