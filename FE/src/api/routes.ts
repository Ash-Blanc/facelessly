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
  AddAsset: (projectId: string) => `${OS_URL}/projects/${projectId}/assets`
}
