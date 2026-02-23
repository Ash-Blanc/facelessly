'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Film,
  PlaySquare,
  Calendar,
  Settings,
  Zap,
  BookOpen,
  ChevronUp,
  LogOut,
  User,
  BarChart3,
  CreditCard,
  MessageSquare,
} from 'lucide-react'
import { useStore } from '@/store'
import { useState } from 'react'
import { APIRoutes } from '@/api/routes'
import { toast } from 'sonner'

const NAV_ITEMS = [
  { label: 'Series', href: '/series', icon: Film },
  { label: 'Videos', href: '/videos', icon: PlaySquare },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'AI Chat', href: '/aichat', icon: MessageSquare },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Guides', href: '/guides', icon: BookOpen },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export default function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, credits, tier, setCurrentUser, setProjects } = useStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch(APIRoutes.Logout(), { method: 'POST' })
    } catch {}
    setCurrentUser(null)
    setProjects([])
    setUserMenuOpen(false)
    router.push('/')
    toast.success('Signed out')
  }

  return (
    <aside className="flex h-screen w-[240px] flex-col border-r border-base-300 bg-base-100 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
          <Film className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold font-display tracking-tight text-base-content">
          Facelessly
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-base-content/60 hover:bg-base-200 hover:text-base-content'
                }
              `}
            >
              <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-primary' : ''}`} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Credits bar */}
      {currentUser && (
        <div className="px-4 pb-2">
          <div className="flex justify-between text-[10px] text-base-content/40 mb-1">
            <span>Credits</span>
            <span>{credits} left</span>
          </div>
          <div className="h-1.5 rounded-full bg-base-300 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(2, Math.min(100, (credits / 30) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Upgrade Button */}
      <div className="px-3 pb-3">
        <Link
          href="/billing"
          className="flex w-full items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/10"
        >
          <Zap className="h-4 w-4" />
          {tier === 'free' ? 'Upgrade Plan' : `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`}
        </Link>
      </div>

      {/* User Section */}
      <div className="relative border-t border-base-300 px-3 py-3">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 transition-all hover:bg-base-200"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
            {currentUser?.channel_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-base-content truncate">
              {currentUser?.channel_name || 'Guest User'}
            </p>
          </div>
          <ChevronUp className={`h-4 w-4 text-base-content/40 transition-transform ${userMenuOpen ? '' : 'rotate-180'}`} />
        </button>

        {/* User Menu Dropdown */}
        {userMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl border border-base-300 bg-base-100 shadow-lg py-1 z-50">
            <Link
              href="/settings"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/70 hover:bg-base-200"
            >
              <User className="h-4 w-4" />
              Account Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-error hover:bg-base-200"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
