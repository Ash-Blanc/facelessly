'use client'

import { Suspense } from 'react'
import Sidebar from '@/components/chat/Sidebar/Sidebar'
import { ChatArea } from '@/components/chat/ChatArea'

function ChatPageContent() {
    const hasEnvToken = !!process.env.NEXT_PUBLIC_OS_SECURITY_KEY
    const envToken = process.env.NEXT_PUBLIC_OS_SECURITY_KEY || ''

    return (
        <div className="flex h-screen bg-base-100">
            <Sidebar hasEnvToken={hasEnvToken} envToken={envToken} />
            <ChatArea />
        </div>
    )
}

export default function ChatPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center bg-base-100">
                    <span className="loading loading-ring loading-lg text-primary"></span>
                </div>
            }
        >
            <ChatPageContent />
        </Suspense>
    )
}
