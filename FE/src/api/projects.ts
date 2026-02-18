import { toast } from 'sonner'

import { APIRoutes } from './routes'

import type { Project, Trend, Asset, User } from '@/types/os'

// Get the backend URL
const getBackendUrl = (): string => {
  return process.env.NEXT_PUBLIC_OS_URL || 'http://localhost:8000'
}

// Auth API
export const authYouTube = async (): Promise<string> => {
  const response = await fetch(APIRoutes.AuthYouTube(), {
    method: 'GET',
    redirect: 'follow'
  })
  return response.url
}

export const getAuthCallback = async (code: string, state: string): Promise<{ user_id: string; channel_name: string } | { error: string }> => {
  const url = new URL(APIRoutes.AuthCallback())
  url.searchParams.set('code', code)
  url.searchParams.set('state', state)

  const response = await fetch(url.toString(), {
    method: 'GET'
  })

  if (!response.ok) {
    const error = await response.json()
    return { error: error.error || 'Authentication failed' }
  }

  return response.json()
}

// Projects API
export const getProjectsAPI = async (userId: string): Promise<Project[]> => {
  try {
    const url = new URL(APIRoutes.ListProjects())
    url.searchParams.set('user_id', userId)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      toast.error(`Failed to fetch projects: ${response.statusText}`)
      return []
    }

    return response.json()
  } catch {
    toast.error('Error fetching projects')
    return []
  }
}

export const createProjectAPI = async (userId: string, title: string): Promise<Project | null> => {
  try {
    const response = await fetch(APIRoutes.CreateProject(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, title })
    })

    if (!response.ok) {
      toast.error(`Failed to create project: ${response.statusText}`)
      return null
    }

    return response.json()
  } catch {
    toast.error('Error creating project')
    return null
  }
}

export const getProjectAPI = async (projectId: string, userId: string): Promise<Project | null> => {
  try {
    const url = new URL(APIRoutes.GetProject(projectId))
    url.searchParams.set('user_id', userId)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      toast.error(`Failed to fetch project: ${response.statusText}`)
      return null
    }

    return response.json()
  } catch {
    toast.error('Error fetching project')
    return null
  }
}

export const updateProjectAPI = async (
  projectId: string,
  updates: Partial<Project> & { user_id?: string }
): Promise<Project | null> => {
  try {
    const response = await fetch(APIRoutes.UpdateProject(projectId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      toast.error(`Failed to update project: ${response.statusText}`)
      return null
    }

    return response.json()
  } catch {
    toast.error('Error updating project')
    return null
  }
}

export const deleteProjectAPI = async (projectId: string, userId: string): Promise<boolean> => {
  try {
    const url = new URL(APIRoutes.DeleteProject(projectId))
    url.searchParams.set('user_id', userId)

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      toast.error(`Failed to delete project: ${response.statusText}`)
      return false
    }

    return true
  } catch {
    toast.error('Error deleting project')
    return false
  }
}

// Trends API
export const addTrendAPI = async (projectId: string, trendData: Omit<Trend, 'id' | 'project_id'>): Promise<Trend | null> => {
  try {
    const response = await fetch(APIRoutes.AddTrend(projectId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trendData)
    })

    if (!response.ok) {
      toast.error(`Failed to add trend: ${response.statusText}`)
      return null
    }

    return response.json()
  } catch {
    toast.error('Error adding trend')
    return null
  }
}

// Assets API
export const addAssetAPI = async (
  projectId: string,
  assetData: Omit<Asset, 'id' | 'project_id'>
): Promise<Asset | null> => {
  try {
    const response = await fetch(APIRoutes.AddAsset(projectId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assetData)
    })

    if (!response.ok) {
      toast.error(`Failed to add asset: ${response.statusText}`)
      return null
    }

    return response.json()
  } catch {
    toast.error('Error adding asset')
    return null
  }
}
