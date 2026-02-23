'use client'

import { useState, useEffect, Suspense } from 'react'
import { useStore } from '@/store'
import {
  User, CreditCard, Youtube, Moon, Sun, Bell, Zap,
  CheckCircle, Loader2, ChevronDown, ChevronUp,
  ExternalLink, AlertTriangle, Link2,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { APIRoutes } from '@/api/routes'
import { getCreditsAPI } from '@/api/projects'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_OS_URL || 'http://localhost:8000'

/* ── Platform card ──────────────────────────────────────── */
interface PlatformCardProps {
  icon: React.ReactNode
  name: string
  description: string
  connectedAs?: string | null
  isConfigured: boolean
  onConnect: () => void
  onDisconnect?: () => void
  isConnecting?: boolean
  setupSteps: { step: string; href?: string; code?: string }[]
  envVars: string[]
  color: string
}

function PlatformCard({
  icon, name, description, connectedAs, isConfigured,
  onConnect, onDisconnect, isConnecting, setupSteps, envVars, color
}: PlatformCardProps) {
  const [showSetup, setShowSetup] = useState(false)

  return (
    <div className={`rounded-2xl border ${connectedAs ? 'border-green-500/30 bg-green-500/5' : 'border-base-300'} p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold">{name}</h3>
            {connectedAs ? (
              <p className="flex items-center gap-1 text-sm text-green-600 font-medium">
                <CheckCircle className="h-3.5 w-3.5" /> Connected as {connectedAs}
              </p>
            ) : (
              <p className="text-sm text-base-content/50">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {connectedAs ? (
            <button
              onClick={onDisconnect}
              className="rounded-lg border border-base-300 px-4 py-2 text-sm font-medium hover:bg-base-200 transition"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="flex items-center gap-1.5 rounded-lg gradient-brand px-4 py-2 text-sm font-bold text-white transition hover:shadow-glow disabled:opacity-50"
            >
              {isConnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Link2 className="h-3.5 w-3.5" /> Connect
            </button>
          )}
        </div>
      </div>

      {/* Setup guide — always show when not connected */}
      {!connectedAs && (
        <div className="mt-4">
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="flex items-center gap-1.5 text-xs font-medium text-base-content/50 hover:text-base-content transition"
          >
            {showSetup ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSetup ? 'Hide' : 'Show'} setup instructions
          </button>

          {showSetup && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
                <div className="flex gap-2 text-amber-600 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Requires API credentials. Add these to <code className="bg-amber-500/20 px-1 rounded">BE/.env</code>:</span>
                </div>
                <div className="mt-2 font-mono text-xs text-amber-700 space-y-0.5 pl-6">
                  {envVars.map(v => <div key={v}>{v}=your_value_here</div>)}
                </div>
              </div>

              <ol className="space-y-2">
                {setupSteps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</span>
                    <span className="text-base-content/70">
                      {s.step}
                      {s.href && (
                        <a href={s.href} target="_blank" rel="noreferrer"
                          className="ml-1.5 inline-flex items-center gap-0.5 text-primary hover:underline text-xs font-medium">
                          Open <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {s.code && <code className="ml-1.5 rounded bg-base-200 px-1.5 py-0.5 text-xs">{s.code}</code>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main settings page ─────────────────────────────────── */
function SettingsPageInner() {
  const { currentUser, credits: storeCredits, tier: storeTier, setCredits } = useStore()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('account')
  const [credits, setLocalCredits] = useState(storeCredits)
  const [tier, setLocalTier] = useState(storeTier)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [tiktokUser, setTiktokUser] = useState<string | null>(null)
  const [instagramUser, setInstagramUser] = useState<string | null>(null)
  const [youtubeUser, setYoutubeUser] = useState<string | null>(currentUser?.channel_name ?? null)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Handle OAuth callback params
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)

    const platform = searchParams.get('platform')
    const error = searchParams.get('error')

    if (error === 'youtube_not_configured') {
      toast.error('YouTube not configured — see setup instructions below', { duration: 6000 })
    } else if (error === 'tiktok_not_configured') {
      toast.error('TikTok not configured — see setup instructions below', { duration: 6000 })
    } else if (error === 'instagram_not_configured') {
      toast.error('Instagram not configured — see setup instructions below', { duration: 6000 })
    } else if (error) {
      toast.error(`Connection error: ${error}`)
    }

    if (platform === 'youtube') {
      const name = searchParams.get('channel_name')
      if (name) { setYoutubeUser(name); toast.success(`YouTube connected as ${name}!`) }
    }
    if (platform === 'tiktok') {
      const u = searchParams.get('tiktok_user')
      if (u) { setTiktokUser(u); toast.success(`TikTok connected as @${u}!`) }
    }
    if (platform === 'instagram') {
      const u = searchParams.get('ig_user')
      if (u) { setInstagramUser(u); toast.success(`Instagram connected as @${u}!`) }
    }

    // Clean URL
    if (searchParams.toString()) {
      router.replace('/settings?tab=' + (tab || 'connections'))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (currentUser?.channel_name) setYoutubeUser(currentUser.channel_name)
  }, [currentUser])

  useEffect(() => {
    if (currentUser?.id) {
      getCreditsAPI(currentUser.id).then((data) => {
        if (data) {
          setCredits(data.credits, data.tier)
          setLocalCredits(data.credits)
          setLocalTier(data.tier)
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  const handleDisconnect = async (platform: string) => {
    if (!currentUser?.id) return
    setIsDisconnecting(true)
    try {
      const res = await fetch(APIRoutes.DisconnectAccount(currentUser.id, platform), { method: 'DELETE' })
      if (res.ok) {
        if (platform === 'youtube') setYoutubeUser(null)
        if (platform === 'tiktok') setTiktokUser(null)
        if (platform === 'instagram') setInstagramUser(null)
        toast.success(`${platform} disconnected`)
      }
    } catch { toast.error('Error disconnecting') }
    finally { setIsDisconnecting(false) }
  }

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'connections', label: 'Connections', icon: Link2 },
    { id: 'preferences', label: 'Preferences', icon: Bell },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold font-display">Settings</h1>
      <p className="mt-1 text-sm text-base-content/50">Manage your account and preferences</p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-base-300">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-base-content/40 hover:text-base-content'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8 max-w-2xl">

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-base-300 p-6">
              <h3 className="font-semibold font-display">Profile</h3>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
                  {(youtubeUser || currentUser?.channel_name)?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold">{youtubeUser || currentUser?.channel_name || 'Guest User'}</p>
                  <p className="text-sm text-base-content/50">{currentUser?.id || 'Not logged in'}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-base-300 p-6">
              <h3 className="font-semibold font-display text-error">Danger Zone</h3>
              <p className="mt-2 text-sm text-base-content/50">Permanently delete your account and all data.</p>
              <button className="mt-4 rounded-xl border border-error/30 px-4 py-2 text-sm font-medium text-error transition hover:bg-error/5">
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-base-300 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold font-display">Current Plan</h3>
                  <p className="mt-1 text-sm text-base-content/50">You are on the <strong className="capitalize">{tier}</strong> plan</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary capitalize">{tier}</span>
              </div>
              <div className="mt-4 flex items-center gap-6 text-sm">
                <div><span className="text-base-content/50">Credits</span><p className="font-bold text-lg">{credits}</p></div>
                <div><span className="text-base-content/50">Resets</span><p className="font-medium">Monthly</p></div>
              </div>
              {tier === 'free' && (
                <button className="mt-6 rounded-xl gradient-brand px-5 py-2.5 text-sm font-bold text-white transition-all hover:shadow-glow">
                  <Zap className="mr-1.5 inline h-4 w-4" />Upgrade to Pro
                </button>
              )}
            </div>
            <div className="rounded-2xl border border-base-300 p-6">
              <h3 className="font-semibold font-display">Transaction History</h3>
              <p className="mt-2 text-sm text-base-content/50">No transactions yet.</p>
            </div>
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="space-y-4">
            <PlatformCard
              icon={<Youtube className="h-6 w-6 text-red-500" />}
              name="YouTube"
              description="Auto-post Shorts to your YouTube channel"
              connectedAs={youtubeUser}
              isConfigured={true}
              color="bg-red-500/10"
              onConnect={() => { window.location.href = `${API_BASE}/auth/youtube` }}
              onDisconnect={() => handleDisconnect('youtube')}
              isConnecting={isDisconnecting}
              envVars={['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET']}
              setupSteps={[
                { step: 'Go to Google Cloud Console and create a new project', href: 'https://console.cloud.google.com' },
                { step: 'Enable the YouTube Data API v3 in APIs & Services → Library', href: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com' },
                { step: 'Go to Credentials → Create Credentials → OAuth 2.0 Client ID', href: 'https://console.cloud.google.com/apis/credentials' },
                { step: 'Set application type to "Web application". Add Authorized redirect URI:', code: 'http://localhost:8000/auth/callback' },
                { step: 'Copy the Client ID and Client Secret into your BE/.env file' },
                { step: 'Restart the backend, then click Connect above' },
              ]}
            />

            <PlatformCard
              icon={<span className="text-2xl">🎵</span>}
              name="TikTok"
              description="Auto-post videos to your TikTok account"
              connectedAs={tiktokUser}
              isConfigured={true}
              color="bg-base-200"
              onConnect={() => { window.location.href = `${API_BASE}/auth/tiktok` }}
              onDisconnect={() => handleDisconnect('tiktok')}
              isConnecting={isDisconnecting}
              envVars={['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']}
              setupSteps={[
                { step: 'Apply for a TikTok Developer account at the TikTok Developer Portal', href: 'https://developers.tiktok.com' },
                { step: 'Create a new app and enable the "Login Kit" and "Video Kit" products' },
                { step: 'In your app settings, add Redirect Domain:', code: 'localhost' },
                { step: 'Add Redirect URI:', code: 'http://localhost:8000/auth/tiktok/callback' },
                { step: 'Copy your Client Key and Client Secret to BE/.env' },
                { step: 'Restart backend and click Connect' },
              ]}
            />

            <PlatformCard
              icon={<span className="text-2xl">📸</span>}
              name="Instagram Reels"
              description="Auto-post Reels to your Instagram account"
              connectedAs={instagramUser}
              isConfigured={true}
              color="bg-pink-500/10"
              onConnect={() => { window.location.href = `${API_BASE}/auth/instagram` }}
              onDisconnect={() => handleDisconnect('instagram')}
              isConnecting={isDisconnecting}
              envVars={['INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET']}
              setupSteps={[
                { step: 'Create a Meta Developer app at Meta for Developers', href: 'https://developers.facebook.com' },
                { step: 'Add the "Instagram Basic Display" product to your app' },
                { step: 'Go to Instagram Basic Display → Basic Display settings' },
                { step: 'Add Valid OAuth Redirect URI:', code: 'http://localhost:8000/auth/instagram/callback' },
                { step: 'Add your Instagram account as a Test User in Roles → Roles' },
                { step: 'Copy Instagram App ID and App Secret to BE/.env as INSTAGRAM_CLIENT_ID and INSTAGRAM_CLIENT_SECRET' },
                { step: 'Restart backend and click Connect' },
              ]}
            />

            <p className="text-center text-xs text-base-content/30 pt-2">
              Credentials are stored locally in your backend .env — never shared
            </p>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-base-300 p-6">
              <h3 className="font-semibold font-display">Appearance</h3>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'facelessly' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-yellow-500" />}
                  <div>
                    <p className="font-medium text-sm">Theme</p>
                    <p className="text-xs text-base-content/50">{theme === 'facelessly' ? 'Dark mode' : 'Light mode'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setTheme(theme === 'facelessly' ? 'facelessly-light' : 'facelessly')}
                  className={`relative h-7 w-12 rounded-full transition-colors ${theme === 'facelessly' ? 'bg-primary' : 'bg-base-300'}`}
                >
                  <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${theme === 'facelessly' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-base-300 p-6">
              <h3 className="font-semibold font-display">Notifications</h3>
              <p className="mt-2 text-sm text-base-content/50">Email notifications coming soon.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <SettingsPageInner />
    </Suspense>
  )
}
