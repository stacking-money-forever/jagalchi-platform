/**
 * TanStack Query key factory
 * 일관된 쿼리 키 관리를 위한 중앙화된 키 팩토리
 */

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },

  users: {
    all: ['users'] as const,
    detail: (name: string) => [...queryKeys.users.all, 'detail', name] as const,
    followers: (name: string) => [...queryKeys.users.all, 'followers', name] as const,
    followings: (name: string) => [...queryKeys.users.all, 'followings', name] as const,
  },

  roadmaps: {
    all: ['roadmaps'] as const,
    lists: (params?: object) => [...queryKeys.roadmaps.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.roadmaps.all, 'detail', id] as const,
    events: (id: string, since?: number) =>
      [...queryKeys.roadmaps.all, 'events', id, since] as const,
    progress: (id: string) => [...queryKeys.roadmaps.all, 'progress', id] as const,
    forkTree: (id: string) => [...queryKeys.roadmaps.all, 'fork-tree', id] as const,
    forkStatus: (id: string) => [...queryKeys.roadmaps.all, 'fork-status', id] as const,
    popular: (params?: object) => [...queryKeys.roadmaps.all, 'popular', params] as const,
  },

  projectRuns: {
    all: ['project-runs'] as const,
    lists: () => [...queryKeys.projectRuns.all, 'list'] as const,
  },

  directories: {
    all: ['directories'] as const,
    tree: () => [...queryKeys.directories.all, 'tree'] as const,
  },

  community: {
    all: ['community'] as const,
    lists: (params?: object) => [...queryKeys.community.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.community.all, 'detail', id] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    lists: (params?: object) => [...queryKeys.notifications.all, 'list', params] as const,
    settings: () => [...queryKeys.notifications.all, 'settings'] as const,
  },

  career: {
    all: ['career'] as const,
    competencies: () => [...queryKeys.career.all, 'competencies'] as const,
    targets: () => [...queryKeys.career.all, 'targets'] as const,
    diff: (targetId: string) => [...queryKeys.career.all, 'diff', targetId] as const,
    evidence: () => [...queryKeys.career.all, 'evidence'] as const,
    reviews: () => [...queryKeys.career.all, 'reviews'] as const,
    missions: (targetId: string) => [...queryKeys.career.all, 'proof-missions', targetId] as const,
    mission: (missionId: string) => [...queryKeys.career.all, 'proof-mission', missionId] as const,
    verification: (missionId: string) =>
      [...queryKeys.career.all, 'proof-verification', missionId] as const,
    proofProfile: () => [...queryKeys.career.all, 'proof-profile'] as const,
  },

  github: {
    all: ['career', 'github'] as const,
    connection: () => [...queryKeys.github.all, 'connection'] as const,
    repositories: () => [...queryKeys.github.all, 'repositories'] as const,
    pullRequests: (repositoryId: string) =>
      [...queryKeys.github.all, 'pull-requests', repositoryId] as const,
  },

  proofProfiles: {
    all: ['proof-profiles'] as const,
    public: (publicId: string) => [...queryKeys.proofProfiles.all, 'public', publicId] as const,
  },

  ai: {
    all: ['ai'] as const,
    health: () => [...queryKeys.ai.all, 'health'] as const,
    recordCoach: (params: object) => [...queryKeys.ai.all, 'record-coach', params] as const,
    learningCoach: (params: object) => [...queryKeys.ai.all, 'learning-coach', params] as const,
    learningPattern: (params: object) => [...queryKeys.ai.all, 'learning-pattern', params] as const,
    relatedRoadmaps: (roadmapId: string) =>
      [...queryKeys.ai.all, 'related-roadmaps', roadmapId] as const,
    roadmapRecommendation: (params: object) =>
      [...queryKeys.ai.all, 'roadmap-recommendation', params] as const,
    techCard: (slug: string) => [...queryKeys.ai.all, 'tech-card', slug] as const,
    techFingerprint: (params: object) => [...queryKeys.ai.all, 'tech-fingerprint', params] as const,
    commentDigest: (params: object) => [...queryKeys.ai.all, 'comment-digest', params] as const,
    commentDuplicates: (params: object) =>
      [...queryKeys.ai.all, 'comment-duplicates', params] as const,
    resourceRecommendation: (params: object) =>
      [...queryKeys.ai.all, 'resource-recommendation', params] as const,
    nodeResourceRecommendation: (params: object) =>
      [...queryKeys.ai.all, 'node-resource-recommendation', params] as const,
    webSearch: (params: object) => [...queryKeys.ai.all, 'web-search', params] as const,
    graphRag: (params: object) => [...queryKeys.ai.all, 'graph-rag', params] as const,
    initData: (roadmapId: string) => [...queryKeys.ai.all, 'init-data', roadmapId] as const,
    nodeDescription: (params: object) => [...queryKeys.ai.all, 'node-description', params] as const,
  },
} as const;
