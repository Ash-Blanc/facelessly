'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AppSidebar from '@/components/AppSidebar'
import OnboardingModal from '@/components/OnboardingModal'
import { useStore } from '@/store'
import { getUserAPI } from '@/api/projects'
import { toast } from 'sonner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setCurrentUser, loadProjects } = useStore()

  // Handle OAuth callback URL params (?user_id=…&channel_name=…)
  useEffect(() => {
    const userId = searchParams.get('user_id')
    const channelName = searchParams.get('channel_name')
    const error = searchParams.get('error')

    if (error) {
      toast.error(`Authentication failed: ${error}`)
      // Clean URL
      router.replace('/series')
      return
    }

    if (userId) {
      // Fetch full user data from backend
      getUserAPI(userId).then((user) => {
        if (user) {
          setCurrentUser(user)
          loadProjects()
          toast.success(`Welcome, ${user.channel_name ?? channelName ?? 'back'}! 🎉`)
        } else {
          // Fallback: create minimal user object from URL params
          if (channelName) {
            setCurrentUser({ id: userId, youtube_channel_id: '', channel_name: channelName })
          }
        }
        // Clean URL params from address bar
        router.replace('/series')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-base-100">
      <OnboardingModal />
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
