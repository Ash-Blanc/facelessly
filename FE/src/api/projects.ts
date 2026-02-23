import { toast } from 'sonner'

import { APIRoutes } from './routes'

import type { Project, Trend, Asset, User } from '@/types/os'

// Auth API
export const getUserAPI = async (userId: string): Promise<User | null> => {
  try {
    const response = await fetch(APIRoutes.GetUser(userId))
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
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

export const createProjectAPI = async (userId: string, title: string, extra?: Record<string, string>): Promise<Project | null> => {
  try {
    const response = await fetch(APIRoutes.CreateProject(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, title, ...extra })
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

// Generate API (step-by-step workflow)
export const generateTrendsAPI = async (projectId: string, userId: string): Promise<Project | null> => {
  try {
    const response = await fetch(APIRoutes.GenerateTrends(projectId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    })
    if (!response.ok) {
      const err = await response.json()
      toast.error(err.error || 'Failed to generate trends')
      return null
    }
    return response.json()
  } catch {
    toast.error('Error generating trends')
    return null
  }
}

export const generateScriptAPI = async (projectId: string, userId: string, prompt?: string): Promise<Project | null> => {
  try {
    const response = await fetch(APIRoutes.GenerateScript(projectId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...(prompt ? { prompt } : {}) })
    })
    if (!response.ok) {
      const err = await response.json()
      toast.error(err.error || 'Failed to generate script')
      return null
    }
    return response.json()
  } catch {
    toast.error('Error generating script')
    return null
  }
}

export const generateMediaAPI = async (
  projectId: string,
  userId: string,
  types?: string[]
): Promise<Project | null> => {
  try {
    const response = await fetch(APIRoutes.GenerateMedia(projectId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, types: types ?? ['video', 'audio', 'thumbnail'] })
    })
    if (!response.ok) {
      const err = await response.json()
      toast.error(err.error || 'Failed to generate media')
      return null
    }
    return response.json()
  } catch {
    toast.error('Error generating media')
    return null
  }
}

export const exportProjectAPI = async (projectId: string, userId: string): Promise<void> => {
  try {
    const url = new URL(APIRoutes.ExportProject(projectId))
    url.searchParams.set('user_id', userId)
    const response = await fetch(url.toString())
    if (!response.ok) {
      toast.error('Export failed')
      return
    }
    const blob = await response.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${projectId}_export.zip`
    link.click()
  } catch {
    toast.error('Error exporting project')
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

// Credits API
export const getCreditsAPI = async (userId: string): Promise<{ credits: number; tier: string } | null> => {
  try {
    const response = await fetch(APIRoutes.GetCredits(userId))
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}
