'use client'

import Link from 'next/link'
import { Video, MessageSquare, LayoutDashboard } from 'lucide-react'

export default function Home() {
    return (
        <div className="flex h-screen flex-col items-center justify-center bg-base-100 px-6">
            {/* Logo + Tagline */}
            <div className="mb-12 text-center fade-in">
                <div className="mb-4 flex items-center justify-center gap-3">
                    <Video className="h-10 w-10 text-primary" />
                    <h1 className="text-4xl font-bold tracking-tight text-base-content">
                        Faceless Video Factory
                    </h1>
                </div>
                <p className="text-lg text-base-content/50">
                    AI-powered viral shorts — research, script, video, voice, thumbnail.
                </p>
            </div>

            {/* Two Actions */}
            <div className="flex gap-4 slide-up">
                <Link href="/dashboard">
                    <button className="btn btn-lg btn-outline gap-2 rounded-xl border-base-300 text-base-content hover:bg-base-200 hover:border-base-300">
                        <LayoutDashboard className="h-5 w-5" />
                        Dashboard
                    </button>
                </Link>
                <Link href="/chat">
                    <button className="btn btn-lg btn-primary gap-2 rounded-xl">
                        <MessageSquare className="h-5 w-5" />
                        Open Chat
                    </button>
                </Link>
            </div>
        </div>
    )
}
