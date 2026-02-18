// Backend API base URL
export const OS_URL = process.env.NEXT_PUBLIC_OS_URL || 'http://localhost:8000'

export const APIRoutes = {
  // AgentOS routes
  GetAgents: (agentOSUrl: string) => `${agentOSUrl}/agents`,
  AgentRun: (agentOSUrl: string) => `${agentOSUrl}/agents/{agent_id}/runs`,
  Status: (agentOSUrl: string) => `${agentOSUrl}/health`,
  GetSessions: (agentOSUrl: string) => `${agentOSUrl}/sessions`,
  GetSession: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/sessions/${sessionId}/runs`,

  DeleteSession: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/sessions/${sessionId}`,

  GetTeams: (agentOSUrl: string) => `${agentOSUrl}/teams`,
  TeamRun: (agentOSUrl: string, teamId: string) =>
    `${agentOSUrl}/teams/${teamId}/runs`,
  DeleteTeamSession: (agentOSUrl: string, teamId: string, sessionId: string) =>
    `${agentOSUrl}/v1//teams/${teamId}/sessions/${sessionId}`,

  // Faceless backend routes
  AuthYouTube: () => `${OS_URL}/auth/youtube`,
  AuthCallback: () => `${OS_URL}/auth/callback`,
  ListProjects: () => `${OS_URL}/projects`,
  CreateProject: () => `${OS_URL}/projects`,
  GetProject: (projectId: string) => `${OS_URL}/projects/${projectId}`,
  UpdateProject: (projectId: string) => `${OS_URL}/projects/${projectId}`,
  DeleteProject: (projectId: string) => `${OS_URL}/projects/${projectId}`,
  AddTrend: (projectId: string) => `${OS_URL}/projects/${projectId}/trends`,
  AddAsset: (projectId: string) => `${OS_URL}/projects/${projectId}/assets`,

  // Niche & Style
  GetNiches: () => `${OS_URL}/niches`,
  GetStyles: () => `${OS_URL}/styles`,

  // Content Templates
  GetTemplates: (niche?: string) => `${OS_URL}/templates${niche ? `?niche=${niche}` : ''}`,
  GetTemplate: (templateId: string) => `${OS_URL}/templates/${templateId}`,

  // Generation
  Generate: () => `${OS_URL}/generate`,

  // Pipelines
  ListPipelines: (userId: string) => `${OS_URL}/pipelines/${userId}`,
  CreatePipeline: () => `${OS_URL}/pipelines`,
  UpdatePipeline: (pipelineId: string) => `${OS_URL}/pipelines/${pipelineId}`,
  DeletePipeline: (pipelineId: string) => `${OS_URL}/pipelines/${pipelineId}`,

  // Post Jobs
  QueuePost: () => `${OS_URL}/posts/queue`,
  ListPosts: (userId: string) => `${OS_URL}/posts/${userId}`,

  // Calendar
  GetCalendar: (userId: string, days?: number) =>
    `${OS_URL}/calendar/${userId}${days ? `?days=${days}` : ''}`,

  // Connected Accounts
  GetAccounts: (userId: string) => `${OS_URL}/accounts/${userId}`,
  DisconnectAccount: (userId: string, platform: string) =>
    `${OS_URL}/accounts/${userId}/${platform}`,

  // Schedule (legacy)
  CreateSchedule: () => `${OS_URL}/schedule`,
  GetSchedule: (userId: string) => `${OS_URL}/schedule/${userId}`,
  DeleteSchedule: (userId: string) => `${OS_URL}/schedule/${userId}`,
}
