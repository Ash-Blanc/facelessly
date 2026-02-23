'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, Loader2, User, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const STARTER_PROMPTS = [
  "Give me 5 viral hook ideas for a horror YouTube Shorts channel",
  "Write a 60-second script about unsolved mysteries",
  "What niches are trending on YouTube Shorts right now?",
  "How do I increase retention on my faceless videos?",
  "Generate a content calendar for a true crime channel",
]

async function pollinate(messages: { role: string; content: string }[]) {
  const resp = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai',
      messages: [
        {
          role: 'system',
          content: 'You are an expert YouTube Shorts and Instagram Reels content strategist specializing in viral faceless video channels. You help creators with scripts, hooks, content ideas, and growth strategies. Keep responses concise, actionable, and focused on going viral. Use bullet points and markdown formatting.'
        },
        ...messages
      ],
    }),
  })
  if (!resp.ok) throw new Error('AI unavailable')
  const data = await resp.json()
  return data.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.'
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        isUser ? 'bg-primary text-white' : 'bg-base-200 text-base-content'
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-primary text-white rounded-tr-sm'
          : 'bg-base-200 text-base-content rounded-tl-sm'
      }`}>
        {/* Render markdown-ish (bold + bullets) */}
        <div className="whitespace-pre-wrap">
          {msg.content.split('\n').map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**')) {
              return <strong key={i} className="font-semibold">{line.slice(2, -2)}</strong>
            }
            if (line.startsWith('- ') || line.startsWith('• ')) {
              return <div key={i} className="flex gap-2"><span className="shrink-0">•</span><span>{line.slice(2)}</span></div>
            }
            if (line.startsWith('# ')) {
              return <h3 key={i} className="font-bold text-base mt-2 mb-1">{line.slice(2)}</h3>
            }
            return <span key={i}>{line}{i < msg.content.split('\n').length - 1 ? '\n' : ''}</span>
          })}
        </div>
        <p className={`mt-1.5 text-[10px] ${isUser ? 'text-white/60' : 'text-base-content/40'}`}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 Hi! I'm your AI content strategist. I can help you with:\n\n- **Script writing** for YouTube Shorts & Instagram Reels\n- **Viral hook ideas** for any niche\n- **Content strategy** and posting schedules\n- **Trend analysis** and content ideas\n\nWhat would you like to create today?",
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const content = text ?? input.trim()
    if (!content || isLoading) return
    setInput('')

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      // Build history for API
      const history = [...messages.filter(m => m.id !== 'welcome'), userMsg].slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }))
      const reply = await pollinate(history)
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }])
    } catch {
      toast.error('AI is currently unavailable. Try again in a moment.')
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "👋 Chat cleared! What would you like to work on?",
      timestamp: new Date(),
    }])
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold font-display">AI Content Strategist</h1>
            <p className="text-xs text-base-content/50">Powered by Pollinations AI — free, no API key needed</p>
          </div>
        </div>
        <button onClick={clearChat} className="flex items-center gap-1.5 rounded-lg border border-base-300 px-3 py-1.5 text-xs font-medium hover:bg-base-200 transition">
          <RefreshCw className="h-3 w-3" /> Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-base-200">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-base-200 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-base-content/50" />
              <span className="text-sm text-base-content/50">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starter prompts */}
      {messages.length <= 1 && (
        <div className="border-t border-base-300 px-6 py-3">
          <p className="mb-2 text-xs font-medium text-base-content/40">Try asking...</p>
          <div className="flex flex-wrap gap-2">
            {STARTER_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="flex items-center gap-1.5 rounded-full border border-base-300 px-3 py-1.5 text-xs font-medium text-base-content/70 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition"
              >
                <Sparkles className="h-3 w-3" />{p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-base-300 px-6 py-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask anything about content creation, scripts, hooks..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-base-300 bg-base-100 px-4 py-3 text-sm placeholder:text-base-content/30 focus:border-primary focus:outline-none transition disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gradient-brand text-white transition hover:shadow-glow disabled:opacity-30"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
