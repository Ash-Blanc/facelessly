'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, CheckCircle, TrendingUp, FileText, Video,
  Download, RefreshCw, Play, Volume2, Image, Archive, Sparkles,
  ExternalLink, Scissors, TestTube, Plus
} from 'lucide-react'
import { toast } from 'sonner'

import { useStore } from '@/store'
import { ScriptEditor } from '@/components/ScriptEditor'
import { HookScorePanel } from '@/components/HookScorePanel'
import { APIRoutes } from '@/api/routes'
import {
  getProjectAPI, generateTrendsAPI, generateScriptAPI,
  generateMediaAPI, exportProjectAPI, updateProjectAPI, addAssetAPI
} from '@/api/projects'
import type { Project, Trend } from '@/types/os'

type WorkflowStep = 'trends' | 'script' | 'media' | 'review' | 'export'

const STEPS: { id: WorkflowStep; label: string; icon: typeof Sparkles }[] = [
  { id: 'trends',  label: 'Trends',  icon: TrendingUp },
  { id: 'script',  label: 'Script',  icon: FileText },
  { id: 'media',   label: 'Media',   icon: Video },
  { id: 'review',  label: 'Review',  icon: Play },
  { id: 'export',  label: 'Export',  icon: Download },
]

const STATUS_TO_STEP: Record<string, WorkflowStep> = {
  backlog:    'trends',
  trending:   'script',
  scripting:  'media',
  production: 'review',
  completed:  'export',
}

export default function ProjectWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const { currentUser } = useStore()
  const userId = currentUser?.id || 'anonymous'

  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('trends')
  const [scriptText, setScriptText] = useState('')
  const [sseStatuses, setSseStatuses] = useState<Record<string, string>>({})
  const [sseDone, setSseDone] = useState(false)
  const [variants, setVariants] = useState<{ id: string; prompt: string; label?: string }[]>([])
  const sseRef = useRef<EventSource | null>(null)

  useEffect(() => {
    loadProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadProject = async () => {
    setIsLoading(true)
    const p = await getProjectAPI(projectId, userId)
    if (p) {
      setProject(p)
      // Set step based on project status
      setCurrentStep(STATUS_TO_STEP[p.status] ?? 'trends')
      // Load existing script if any
      const scriptAsset = p.assets?.script
      if (scriptAsset?.prompt) setScriptText(scriptAsset.prompt)
    } else {
      toast.error('Project not found')
      router.push('/series')
    }
    setIsLoading(false)
  }

  const handleSelectTrend = async (trend: Trend) => {
    if (!project) return
    const updated = await updateProjectAPI(project.id, {
      user_id: userId,
      selected_trend_id: trend.id,
    })
    if (updated) {
      setProject(updated)
      toast.success(`Trend selected: ${trend.title}`)
    }
  }

  const handleGenerateTrends = async () => {
    if (!project) return
    setIsGenerating(true)
    const updated = await generateTrendsAPI(project.id, userId)
    if (updated) {
      setProject(updated)
      toast.success('Trends researched!')
    }
    setIsGenerating(false)
  }

  const handleGenerateScript = async () => {
    if (!project) return
    setIsGenerating(true)
    const updated = await generateScriptAPI(project.id, userId)
    if (updated) {
      setProject(updated)
      const script = updated.assets?.script?.prompt ?? ''
      setScriptText(script)
      toast.success('Script generated!')
    }
    setIsGenerating(false)
  }

  const handleSaveScript = async () => {
    if (!project || !scriptText) return
    setIsGenerating(true)
    const asset = await addAssetAPI(project.id, {
      type: 'script',
      prompt: scriptText,
      status: 'ready',
      created_at: '',
      updated_at: '',
    })
    if (asset) {
      const updated = await getProjectAPI(project.id, userId)
      if (updated) setProject(updated)
      toast.success('Script saved!')
    }
    setIsGenerating(false)
  }

  const handleAdvanceToMedia = async () => {
    if (!project) return
    const updated = await updateProjectAPI(project.id, { user_id: userId, status: 'scripting' })
    if (updated) {
      setProject(updated)
      setCurrentStep('media')
    }
  }

  const startSSE = (pid: string) => {
    sseRef.current?.close()
    const es = new EventSource(`${APIRoutes.GenerationProgress(pid)}&user_id=${userId}`)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setSseStatuses(data.statuses ?? {})
        if (data.done) {
          setSseDone(true)
          es.close()
          loadProject() // Refresh project with completed assets
        }
      } catch {}
    }
    es.onerror = () => es.close()
    sseRef.current = es
  }

  const handleGenerateMedia = async () => {
    if (!project) return
    setIsGenerating(true)
    setSseDone(false)
    setSseStatuses({})
    const updated = await generateMediaAPI(project.id, userId)
    if (updated) {
      setProject(updated)
      toast.success('Media generation queued!')
      startSSE(project.id)
    }
    setIsGenerating(false)
  }

  const loadVariants = async (pid: string) => {
    try {
      const resp = await fetch(`${APIRoutes.GetVariants(pid)}?user_id=${userId}`)
      if (resp.ok) {
        const data = await resp.json()
        setVariants(data.filter((v: { id: string; prompt: string }) => v.prompt))
      }
    } catch {}
  }

  const handleCreateVariant = async () => {
    if (!project || !scriptText) return
    const variantScript = scriptText + '\n\n[Alternative hook: Consider starting with a question or shocking statement]'
    const resp = await fetch(APIRoutes.CreateVariant(project.id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, script: variantScript, label: `Variant ${variants.length + 2}` }),
    })
    if (resp.ok) {
      toast.success('A/B variant created!')
      loadVariants(project.id)
    }
  }

  const handleExportCapCut = async () => {
    if (!project) return
    const url = `${APIRoutes.ExportCapCut(project.id)}?user_id=${userId}`
    window.open(url, '_blank')
  }

  const handleExportCanva = async () => {
    if (!project) return
    const resp = await fetch(`${APIRoutes.ExportCanva(project.id)}?user_id=${userId}`)
    if (resp.ok) {
      const data = await resp.json()
      if (data.canva_url) window.open(data.canva_url, '_blank')
    }
  }

  const handleExport = async () => {
    if (!project) return
    setIsGenerating(true)
    await exportProjectAPI(project.id, userId)
    setIsGenerating(false)
  }

  // Load variants when entering script step
  useEffect(() => {
    if (currentStep === 'script' && project?.id) {
      loadVariants(project.id)
    }
    return () => {
      if (currentStep !== 'media') sseRef.current?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, project?.id])

  const handleMarkComplete = async () => {
    if (!project) return
    const updated = await updateProjectAPI(project.id, { user_id: userId, status: 'completed' })
    if (updated) {
      setProject(updated)
      setCurrentStep('export')
      toast.success('Project marked as complete! 🎉')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!project) return null

  const trends = project.trends ?? []
  const assets = project.assets ?? {}
  const selectedTrendId = project.selected_trend_id
  const selectedTrend = trends.find(t => t.id === selectedTrendId)
  const stepIdx = STEPS.findIndex(s => s.id === currentStep)

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb */}
      <div className="border-b border-base-300 px-8 py-3">
        <div className="flex items-center gap-2 text-sm text-base-content/50">
          <Link href="/series" className="hover:text-base-content transition flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Projects
          </Link>
          <span>›</span>
          <span className="text-base-content font-medium truncate max-w-[200px]">{project.title}</span>
        </div>
      </div>

      {/* Step progress */}
      <div className="border-b border-base-300 px-8 py-3">
        <div className="flex items-center gap-1">
          {STEPS.map((step, i) => {
            const done = i < stepIdx
            const active = i === stepIdx
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : done
                    ? 'text-green-600'
                    : 'text-base-content/30 hover:text-base-content/60'
                }`}
              >
                {done ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <step.icon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-3xl space-y-6">

          {/* ── TRENDS ─────────────────────────────── */}
          {currentStep === 'trends' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold font-display">Research Trends</h2>
                  <p className="mt-1 text-sm text-base-content/50">
                    Pick one of the AI-researched viral topics below
                  </p>
                </div>
                <button
                  onClick={handleGenerateTrends}
                  disabled={isGenerating}
                  className="flex items-center gap-2 rounded-xl gradient-brand px-4 py-2.5 text-sm font-bold text-white hover:shadow-glow transition disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {trends.length ? 'Regenerate' : 'Research Trends'}
                </button>
              </div>

              {trends.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <TrendingUp className="h-12 w-12 text-base-content/20 mb-4" />
                  <p className="text-sm text-base-content/50">Click &quot;Research Trends&quot; to get AI-generated viral ideas for your niche</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trends.map((trend) => (
                    <button
                      key={trend.id}
                      onClick={() => handleSelectTrend(trend)}
                      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                        selectedTrendId === trend.id
                          ? 'border-primary bg-primary/5'
                          : 'border-base-300 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm">{trend.title}</h3>
                          <p className="mt-1 text-xs text-base-content/60 line-clamp-2">{trend.description}</p>
                          {trend.why_viral && (
                            <p className="mt-1 text-xs text-green-600">🔥 {trend.why_viral}</p>
                          )}
                        </div>
                        {selectedTrendId === trend.id && (
                          <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedTrend && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setCurrentStep('script')}
                    className="rounded-xl gradient-brand px-6 py-2.5 text-sm font-bold text-white hover:shadow-glow transition"
                  >
                    Continue to Script →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── SCRIPT ─────────────────────────────── */}
          {currentStep === 'script' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold font-display">Write Script</h2>
                  <p className="mt-1 text-sm text-base-content/50">
                    {selectedTrend ? `Writing for: ${selectedTrend.title}` : 'Generate or write your video script'}
                  </p>
                </div>
                {!assets.script && (
                  <button
                    onClick={handleGenerateScript}
                    disabled={isGenerating}
                    className="flex items-center gap-2 rounded-xl gradient-brand px-4 py-2.5 text-sm font-bold text-white hover:shadow-glow transition disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate Script
                  </button>
                )}
              </div>

              <ScriptEditor
                value={scriptText}
                onChange={setScriptText}
                onRegenerate={handleGenerateScript}
                isRegenerating={isGenerating}
              />

              {/* Hook scoring */}
              <HookScorePanel
                projectId={project.id}
                script={scriptText}
                userId={userId}
              />

              {/* A/B Variants */}
              {(variants.length > 0 || scriptText) && (
                <div className="rounded-xl border border-base-300 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <TestTube className="h-4 w-4 text-purple-500" /> A/B Script Variants
                    </h4>
                    <button
                      onClick={handleCreateVariant}
                      disabled={!scriptText}
                      className="flex items-center gap-1 rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-500/20 transition disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" /> New Variant
                    </button>
                  </div>
                  {variants.length === 0 ? (
                    <p className="text-xs text-base-content/40">Create a variant to A/B test different hooks</p>
                  ) : (
                    <div className="space-y-2">
                      {variants.map((v, i) => (
                        <div key={v.id} className="rounded-lg border border-base-300 p-3">
                          <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wide mb-1">{v.label ?? `Variant ${i + 1}`}</p>
                          <p className="text-xs text-base-content/70 line-clamp-2">{v.prompt}</p>
                          <button
                            onClick={() => setScriptText(v.prompt)}
                            className="mt-2 text-[10px] font-medium text-primary hover:underline"
                          >
                            Use this variant
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={handleSaveScript}
                  disabled={isGenerating || !scriptText}
                  className="rounded-xl border border-base-300 px-4 py-2 text-sm font-medium hover:bg-base-200 transition disabled:opacity-30"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleAdvanceToMedia}
                  disabled={!scriptText}
                  className="rounded-xl gradient-brand px-6 py-2.5 text-sm font-bold text-white hover:shadow-glow transition disabled:opacity-30"
                >
                  Continue to Media →
                </button>
              </div>
            </div>
          )}

          {/* ── MEDIA ──────────────────────────────── */}
          {currentStep === 'media' && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold font-display">Generate Media</h2>
                  <p className="mt-1 text-sm text-base-content/50">
                    Generate video, voiceover, and thumbnail from your script
                  </p>
                </div>
                <button
                  onClick={handleGenerateMedia}
                  disabled={isGenerating}
                  className="flex items-center gap-2 rounded-xl gradient-brand px-4 py-2.5 text-sm font-bold text-white hover:shadow-glow transition disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {Object.keys(assets).filter(k => k !== 'script').length ? 'Regenerate All' : 'Generate All'}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <MediaCard
                  icon={<Video className="h-5 w-5" />}
                  label="Video"
                  asset={assets.video}
                  liveStatus={sseStatuses['video']}
                  color="text-purple-600 bg-purple-500/10"
                />
                <MediaCard
                  icon={<Volume2 className="h-5 w-5" />}
                  label="Voiceover"
                  asset={assets.audio}
                  liveStatus={sseStatuses['audio']}
                  color="text-blue-600 bg-blue-500/10"
                />
                <MediaCard
                  icon={<Image className="h-5 w-5" />}
                  label="Thumbnail"
                  asset={assets.thumbnail}
                  liveStatus={sseStatuses['thumbnail']}
                  color="text-green-600 bg-green-500/10"
                />
              </div>

              {/* SSE live status */}
              {!sseDone && Object.keys(sseStatuses).length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating media… watching for updates in real-time
                </div>
              )}
              {sseDone && (
                <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  All assets generated!
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setCurrentStep('review')}
                  className="rounded-xl gradient-brand px-6 py-2.5 text-sm font-bold text-white hover:shadow-glow transition"
                >
                  Continue to Review →
                </button>
              </div>
            </div>
          )}

          {/* ── REVIEW ─────────────────────────────── */}
          {currentStep === 'review' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold font-display">Review &amp; Approve</h2>
                <p className="mt-1 text-sm text-base-content/50">
                  Preview all generated assets before exporting
                </p>
              </div>

              <div className="space-y-4">
                {/* Script preview */}
                {assets.script?.prompt && (
                  <div className="rounded-xl border border-base-300 overflow-hidden">
                    <div className="border-b border-base-300 bg-base-200/50 px-4 py-2.5 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-base-content/50" />
                      <span className="text-sm font-medium">Script</span>
                    </div>
                    <pre className="p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono text-base-content/70 max-h-48 overflow-y-auto">
                      {assets.script.prompt}
                    </pre>
                  </div>
                )}

                {/* Media assets */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <MediaCard icon={<Video className="h-5 w-5" />} label="Video" asset={assets.video} color="text-purple-600 bg-purple-500/10" />
                  <MediaCard icon={<Volume2 className="h-5 w-5" />} label="Voiceover" asset={assets.audio} color="text-blue-600 bg-blue-500/10" />
                  <MediaCard icon={<Image className="h-5 w-5" />} label="Thumbnail" asset={assets.thumbnail} color="text-green-600 bg-green-500/10" />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep('media')}
                  className="rounded-xl border border-base-300 px-4 py-2 text-sm font-medium hover:bg-base-200 transition"
                >
                  ← Back to Media
                </button>
                <button
                  onClick={handleMarkComplete}
                  className="rounded-xl gradient-brand px-6 py-2.5 text-sm font-bold text-white hover:shadow-glow transition"
                >
                  Mark Complete &amp; Export →
                </button>
              </div>
            </div>
          )}

          {/* ── EXPORT ─────────────────────────────── */}
          {currentStep === 'export' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold font-display flex items-center gap-2">
                  <span>🎉</span> Ready to Export
                </h2>
                <p className="mt-1 text-sm text-base-content/50">
                  Download your video assets and share them anywhere
                </p>
              </div>

              <div className="space-y-3">
                {assets.video?.url && (
                  <ExportRow
                    icon={<Video className="h-4 w-4" />}
                    label="Video (MP4)"
                    url={assets.video.url}
                    filename={`${project.title.replace(/\s+/g, '_')}_video.mp4`}
                  />
                )}
                {assets.audio?.url && (
                  <ExportRow
                    icon={<Volume2 className="h-4 w-4" />}
                    label="Voiceover (MP3)"
                    url={assets.audio.url}
                    filename={`${project.title.replace(/\s+/g, '_')}_audio.mp3`}
                  />
                )}
                {assets.thumbnail?.url && (
                  <ExportRow
                    icon={<Image className="h-4 w-4" />}
                    label="Thumbnail (PNG)"
                    url={assets.thumbnail.url}
                    filename={`${project.title.replace(/\s+/g, '_')}_thumbnail.png`}
                  />
                )}
                {assets.script?.prompt && (
                  <ExportRow
                    icon={<FileText className="h-4 w-4" />}
                    label="Script (TXT)"
                    text={assets.script.prompt}
                    filename={`${project.title.replace(/\s+/g, '_')}_script.txt`}
                  />
                )}

                <div className="mt-4 border-t border-base-300 pt-4 space-y-3">
                  <button
                    onClick={handleExport}
                    disabled={isGenerating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl gradient-brand py-3.5 text-sm font-bold text-white hover:shadow-glow transition disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                    Download All as ZIP
                  </button>

                  {/* CapCut & Canva export */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleExportCapCut}
                      className="flex items-center justify-center gap-2 rounded-xl border border-base-300 py-3 text-sm font-semibold hover:bg-base-200 transition"
                    >
                      <Scissors className="h-4 w-4 text-black" />
                      Export to CapCut
                    </button>
                    <button
                      onClick={handleExportCanva}
                      className="flex items-center justify-center gap-2 rounded-xl border border-base-300 py-3 text-sm font-semibold hover:bg-base-200 transition"
                    >
                      <ExternalLink className="h-4 w-4 text-[#7D2AE8]" />
                      Open in Canva
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────

function MediaCard({
  icon, label, asset, liveStatus, color
}: {
  icon: React.ReactNode
  label: string
  asset?: { status: string; url?: string } | null
  liveStatus?: string
  color: string
}) {
  const status = liveStatus ?? asset?.status ?? 'pending'

  const statusLabel: Record<string, string> = {
    ready: 'Ready',
    processing: 'Generating…',
    pending: 'Not started',
    failed: 'Failed',
  }

  const statusColor: Record<string, string> = {
    ready: 'text-green-600 bg-green-500/10',
    processing: 'text-yellow-600 bg-yellow-500/10',
    pending: 'text-base-content/40 bg-base-200',
    failed: 'text-red-600 bg-red-500/10',
  }

  return (
    <div className="rounded-xl border border-base-300 p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <h4 className="mt-3 font-semibold text-sm">{label}</h4>
      <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[status] ?? statusColor.pending}`}>
        {status === 'processing' && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
        {status === 'ready' && <CheckCircle className="h-2.5 w-2.5" />}
        {statusLabel[status] ?? status}
      </span>
      {asset?.url && (
        <a
          href={asset.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-xs text-primary hover:underline"
        >
          Preview →
        </a>
      )}
    </div>
  )
}

function ExportRow({
  icon, label, url, text, filename
}: {
  icon: React.ReactNode
  label: string
  url?: string
  text?: string
  filename: string
}) {
  const handleDownload = () => {
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
    } else if (text) {
      const blob = new Blob([text], { type: 'text/plain' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
    }
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-base-300 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-base-200 text-base-content/50">
          {icon}
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <button
        onClick={handleDownload}
        className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
      >
        <Download className="h-3 w-3" />
        Download
      </button>
    </div>
  )
}
