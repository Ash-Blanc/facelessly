'use client'

import ChatArea from '@/components/chat/ChatArea/ChatArea'
import Sidebar from '@/components/chat/Sidebar'

export default function ChatPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-sidebar">
      <Sidebar />
      <ChatArea />
    </div>
  )
}
