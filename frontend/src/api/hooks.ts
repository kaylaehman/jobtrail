import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Company,
  DiscoverResult,
  ExtractedSkills,
  InterviewRound,
  JobApplication,
  JobStatus,
  ResetSummary,
  UserSettings,
  WikidataCandidate,
} from './types';

export interface JobsQuery {
  q?: string;
  status?: JobStatus;
  company?: string;
  tag?: string;
}

export function useJobs(params: JobsQuery = {}) {
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: async () => (await api.get<JobApplication[]>('/jobs', { params })).data,
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['jobs', id],
    enabled: Boolean(id),
    queryFn: async () => (await api.get<JobApplication>(`/jobs/${id}`)).data,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<JobApplication>) =>
      (await api.post<JobApplication>('/jobs', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useUpdateJob(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<JobApplication>) =>
      (await api.patch<JobApplication>(`/jobs/${id}`, input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['jobs', id] });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/jobs/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export function useCreateRound(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<InterviewRound>) =>
      (await api.post<InterviewRound>(`/jobs/${jobId}/rounds`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs', jobId] }),
  });
}

export function useUpdateRound(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<InterviewRound> & { id: string }) =>
      (await api.patch<InterviewRound>(`/jobs/${jobId}/rounds/${id}`, patch)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs', jobId] }),
  });
}

export function useDeleteRound(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roundId: string) =>
      (await api.delete(`/jobs/${jobId}/rounds/${roundId}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs', jobId] }),
  });
}

export function useExtractSkills() {
  return useMutation({
    mutationFn: async (description: string) =>
      (await api.post<ExtractedSkills>('/skills/extract', { description })).data,
  });
}

export interface DiscoverSearchInput {
  sites: string[];
  searchTerm: string;
  location?: string;
  resultsWanted?: number;
  hoursOld?: number;
  isRemote?: boolean;
}

export function useDiscoverSearch() {
  return useMutation({
    mutationFn: async (input: DiscoverSearchInput) =>
      (
        await api.post<{ cached: boolean; count: number; results: DiscoverResult[] }>(
          '/discover/search',
          input,
        )
      ).data,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<UserSettings>('/settings')).data,
    staleTime: 60_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<UserSettings>) =>
      (await api.patch<UserSettings>('/settings', input)).data,
    onSuccess: (data) => qc.setQueryData(['settings'], data),
  });
}

// Destructive — wipes all job/company data after the backend validates the confirm phrase.
// On success, blow away the entire React Query cache so every visible page refetches from empty.
export function useResetData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { confirm: 'DELETE_ALL_DATA'; wipeEnrichmentCache?: boolean }) =>
      (await api.post<{ deleted: ResetSummary }>('/settings/reset', input)).data,
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

// Company panel data — null when the application has no companyId yet (still enriching).
export function useCompanyByApplication(appId: string | undefined) {
  return useQuery({
    queryKey: ['companies', 'by-application', appId],
    enabled: Boolean(appId),
    queryFn: async () => (await api.get<Company | null>(`/companies/by-application/${appId}`)).data,
    // Background enrichment kicks off on import; poll briefly so the panel hydrates without a refresh.
    refetchInterval: (q) => (q.state.data ? false : 3000),
  });
}

export function useRefreshCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<Company>(`/companies/${id}/refresh`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

// Picker search — debounced caller side. Min 2 chars enforced by backend; query disabled below that.
export function useCompanySearch(query: string) {
  return useQuery({
    queryKey: ['companies', 'search', query],
    enabled: query.trim().length >= 2,
    queryFn: async () =>
      (await api.get<WikidataCandidate[]>(`/companies/search`, { params: { q: query.trim() } })).data,
    staleTime: 60_000,
  });
}

// Manual link via Wikidata QID — flips the application's companyMatchStatus to 'confirmed'.
export function useLinkCompany(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (qid: string) =>
      (await api.post<JobApplication>(`/jobs/${jobId}/link-company`, { qid })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs', jobId] });
      qc.invalidateQueries({ queryKey: ['companies', 'by-application', jobId] });
    },
  });
}

export function useDiscoverImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      source: string;
      sourceJobId: string;
      company: string;
      position: string;
      jobUrl?: string;
      location?: string;
      salaryMin?: number;
      salaryMax?: number;
      salaryCurrency?: string;
      remote?: boolean;
      description?: string;
    }) => (await api.post<JobApplication>('/discover/import', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}
