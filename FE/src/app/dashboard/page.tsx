'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Youtube, MessageSquare, Video, LayoutDashboard } from 'lucide-react'

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

    // Auth prompt
    if (!currentUser) {
        return (
            <div className="relative flex h-screen items-center justify-center overflow-hidden bg-base-100">
                {/* Background orb */}
                <div
                    className="animate-orb pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                        background: 'radial-gradient(circle, rgba(255,64,23,0.12) 0%, transparent 70%)',
                        filter: 'blur(60px)',
                    }}
                />
                <div className="bg-grid absolute inset-0 opacity-50" />

                <div className="relative z-10 max-w-sm text-center fade-in">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                        <Youtube className="h-7 w-7 text-primary" />
                    </div>
                    <h1 className="mb-2 text-2xl font-bold text-base-content">Connect YouTube</h1>
                    <p className="mb-6 text-sm leading-relaxed text-base-content/40">
                        Link your channel to start creating faceless shorts
                    </p>

                    {error && (
                        <div className="mb-4 rounded-xl bg-error/10 px-4 py-3 text-sm text-error border border-error/20">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleConnectYouTube}
                        className="btn btn-primary gap-2 rounded-xl shadow-glow-sm hover:shadow-glow-md transition-all duration-300"
                    >
                        <Youtube className="h-4 w-4" />
                        Connect YouTube
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen flex-col bg-base-100 bg-grid">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-white/[0.06] bg-base-100/80 px-5 py-3 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                        <Video className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h1 className="text-sm font-semibold text-base-content">Faceless Video Factory</h1>
                    <span className="text-xs text-base-content/20">•</span>
                    <span className="text-xs text-base-content/40">{currentUser.channel_name}</span>
                    {currentUser.channel_picture && (
                        <img
                            src={currentUser.channel_picture}
                            alt={currentUser.channel_name}
                            className="h-6 w-6 rounded-full ring-1 ring-white/10"
                        />
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/chat">
                        <button className="btn btn-ghost btn-sm gap-1.5 rounded-lg text-xs text-base-content/50 hover:bg-white/5 hover:text-base-content">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Chat
                        </button>
                    </Link>
                    <button
                        onClick={handleCreateProject}
                        className="btn btn-primary btn-sm gap-1.5 rounded-lg text-xs shadow-glow-sm hover:shadow-glow-md transition-all duration-300"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New Project
                    </button>
                </div>
            </header>

            {/* Kanban Board */}
            <main className="flex-1 overflow-hidden">
                {isProjectsLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <span className="loading loading-ring loading-lg text-primary"></span>
                            <p className="text-xs text-base-content/30">Loading projects…</p>
                        </div>
                    </div>
                ) : (
                    <KanbanBoard />
                )}
            </main>

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
