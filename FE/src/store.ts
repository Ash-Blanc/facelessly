import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import {
  AgentDetails,
  SessionEntry,
  TeamDetails,
  type ChatMessage,
  type Project,
  type User,
  type ProjectStatus
} from '@/types/os'
import {
  getProjectsAPI,
  createProjectAPI,
  updateProjectAPI,
  deleteProjectAPI
} from '@/api/projects'

interface Store {
  // For accessing state in actions
  get: () => Store
  hydrated: boolean
  setHydrated: () => void
  streamingErrorMessage: string
  setStreamingErrorMessage: (streamingErrorMessage: string) => void
  endpoints: {
    endpoint: string
    id__endpoint: string
  }[]
  setEndpoints: (
    endpoints: {
      endpoint: string
      id__endpoint: string
    }[]
  ) => void
  isStreaming: boolean
  setIsStreaming: (isStreaming: boolean) => void
  isEndpointActive: boolean
  setIsEndpointActive: (isActive: boolean) => void
  isEndpointLoading: boolean
  setIsEndpointLoading: (isLoading: boolean) => void
  messages: ChatMessage[]
  setMessages: (
    messages: ChatMessage[] | ((prevMessages: ChatMessage[]) => ChatMessage[])
  ) => void
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>
  selectedEndpoint: string
  setSelectedEndpoint: (selectedEndpoint: string) => void
  authToken: string
  setAuthToken: (authToken: string) => void
  agents: AgentDetails[]
  setAgents: (agents: AgentDetails[]) => void
  teams: TeamDetails[]
  setTeams: (teams: TeamDetails[]) => void
  selectedModel: string
  setSelectedModel: (model: string) => void
  mode: 'agent' | 'team'
  setMode: (mode: 'agent' | 'team') => void
  sessionsData: SessionEntry[] | null
  setSessionsData: (
    sessionsData:
      | SessionEntry[]
      | ((prevSessions: SessionEntry[] | null) => SessionEntry[] | null)
  ) => void
  isSessionsLoading: boolean
  setIsSessionsLoading: (isSessionsLoading: boolean) => void

  // Project management
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  projects: Project[]
  setProjects: (projects: Project[]) => void
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
  isProjectsLoading: boolean
  setIsProjectsLoading: (loading: boolean) => void

  // Project actions
  createProject: (title: string) => Promise<Project | null>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  moveProject: (id: string, status: ProjectStatus, position: number) => Promise<void>
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Expose get for accessing state in actions
      get: () => get(),

      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      streamingErrorMessage: '',
      setStreamingErrorMessage: (streamingErrorMessage) =>
        set(() => ({ streamingErrorMessage })),
      endpoints: [],
      setEndpoints: (endpoints) => set(() => ({ endpoints })),
      isStreaming: false,
      setIsStreaming: (isStreaming) => set(() => ({ isStreaming })),
      isEndpointActive: false,
      setIsEndpointActive: (isActive) =>
        set(() => ({ isEndpointActive: isActive })),
      isEndpointLoading: true,
      setIsEndpointLoading: (isLoading) =>
        set(() => ({ isEndpointLoading: isLoading })),
      messages: [],
      setMessages: (messages) =>
        set((state) => ({
          messages:
            typeof messages === 'function' ? messages(state.messages) : messages
        })),
      chatInputRef: { current: null },
      selectedEndpoint: 'http://localhost:7777',
      setSelectedEndpoint: (selectedEndpoint) =>
        set(() => ({ selectedEndpoint })),
      authToken: '',
      setAuthToken: (authToken) => set(() => ({ authToken })),
      agents: [],
      setAgents: (agents) => set({ agents }),
      teams: [],
      setTeams: (teams) => set({ teams }),
      selectedModel: '',
      setSelectedModel: (selectedModel) => set(() => ({ selectedModel })),
      mode: 'agent',
      setMode: (mode) => set(() => ({ mode })),
      sessionsData: null,
      setSessionsData: (sessionsData) =>
        set((state) => ({
          sessionsData:
            typeof sessionsData === 'function'
              ? sessionsData(state.sessionsData)
              : sessionsData
        })),
      isSessionsLoading: false,
      setIsSessionsLoading: (isSessionsLoading) =>
        set(() => ({ isSessionsLoading })),

      // Project management
      currentUser: null,
      setCurrentUser: (user) => set(() => ({ currentUser: user })),
      projects: [],
      setProjects: (projects) => set(() => ({ projects })),
      selectedProjectId: null,
      setSelectedProjectId: (id) => set(() => ({ selectedProjectId: id })),
      isProjectsLoading: false,
      setIsProjectsLoading: (loading) => set(() => ({ isProjectsLoading: loading })),

      // Project actions
      createProject: async (title: string) => {
        const user = get().currentUser
        if (!user) return null
        const project = await createProjectAPI(user.id, title)
        if (project) {
          set((state) => ({ projects: [...state.projects, project] }))
        }
        return project
      },
      updateProject: async (id: string, updates: Partial<Project>) => {
        const user = get().currentUser
        if (!user) return
        const updated = await updateProjectAPI(id, { ...updates, user_id: user.id })
        if (updated) {
          set((state) => ({
            projects: state.projects.map((p) => (p.id === id ? updated : p))
          }))
        }
      },
      deleteProject: async (id: string) => {
        const user = get().currentUser
        if (!user) return
        const success = await deleteProjectAPI(id, user.id)
        if (success) {
          set((state) => ({
            projects: state.projects.filter((p) => p.id !== id)
          }))
        }
      },
      moveProject: async (id: string, status: ProjectStatus, position: number) => {
        const user = get().currentUser
        if (!user) return
        const updated = await updateProjectAPI(id, { status, position, user_id: user.id })
        if (updated) {
          set((state) => ({
            projects: state.projects.map((p) => (p.id === id ? updated : p))
          }))
        }
      }
    }),
    {
      name: 'endpoint-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedEndpoint: state.selectedEndpoint
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.()
      }
    }
  )
)
