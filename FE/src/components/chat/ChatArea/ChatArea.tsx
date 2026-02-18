'use client'

import ChatInput from './ChatInput'
import MessageArea from './MessageArea'

const ChatArea = () => {
    return (
        <main className="relative m-1.5 flex flex-grow flex-col overflow-hidden rounded-2xl bg-base-100 bg-grid-sm ring-1 ring-white/[0.04]">
            <MessageArea />
            <div className="sticky bottom-0 ml-9 px-4 pb-3">
                <ChatInput />
            </div>
        </main>
    )
}

export default ChatArea
