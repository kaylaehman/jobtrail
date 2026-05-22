import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  DiscoverResult,
  ExtractedSkills,
  InterviewRound,
  JobApplication,
  JobStatus,
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
