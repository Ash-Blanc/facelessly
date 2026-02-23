'use client'

import { useState } from 'react'
import { Loader2, RefreshCw, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ScriptEditorProps {
  value: string
  onChange: (text: string) => void
  onRegenerate?: () => void
  isRegenerating?: boolean
  readOnly?: boolean
}

export function ScriptEditor({
  value,
  onChange,
  onRegenerate,
  isRegenerating = false,
  readOnly = false,
}: ScriptEditorProps) {
  const [copied, setCopied] = useState(false)

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const charCount = value.length
  // Estimate reading time: ~130 words per minute for narration
  const readingTime = Math.round((wordCount / 130) * 60)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success('Script copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col rounded-xl border border-base-300 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-base-300 bg-base-200/50 px-4 py-2">
        <div className="flex items-center gap-4 text-xs text-base-content/40">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
          <span>~{readingTime}s read</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!value}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-base-content/60 hover:bg-base-300/50 hover:text-base-content transition disabled:opacity-30"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition disabled:opacity-50"
            >
              {isRegenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder="Your script will appear here after generation..."
        className="min-h-[300px] w-full resize-none bg-base-100 p-4 text-sm leading-relaxed text-base-content placeholder:text-base-content/30 focus:outline-none font-mono"
        spellCheck
      />
    </div>
  )
}
