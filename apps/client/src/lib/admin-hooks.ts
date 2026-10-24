import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { canSeeAdminUi } from './admin-access';
import { getApiClient } from './api-access';
import { useAuth } from './auth-context';
import { adminKeys } from './query-client';

export function useAdminEnabled(): boolean {
  const auth = useAuth();
  return auth.status === 'signedIn' && canSeeAdminUi(auth.user);
}

export function useAdminUniversesQuery() {
  const enabled = useAdminEnabled();
  return useQuery({
    queryKey: adminKeys.universes(),
    queryFn: () => getApiClient().listAdminUniverses(),
    enabled,
  });
}

export function useAdminUniverseQuery(id: string | undefined) {
  const enabled = useAdminEnabled();
  return useQuery({
    queryKey: adminKeys.universe(id ?? ''),
    queryFn: () => getApiClient().getAdminUniverse(id!),
    enabled: enabled && Boolean(id),
  });
}

export function useAdminStoriesQuery() {
  const enabled = useAdminEnabled();
  return useQuery({
    queryKey: adminKeys.stories(),
    queryFn: () => getApiClient().listAdminStories(),
    enabled,
  });
}

export function useAdminStoryQuery(id: string | undefined) {
  const enabled = useAdminEnabled();
  return useQuery({
    queryKey: adminKeys.story(id ?? ''),
    queryFn: () => getApiClient().getAdminStory(id!),
    enabled: enabled && Boolean(id),
  });
}

export function useAdminEpisodesQuery() {
  const enabled = useAdminEnabled();
  return useQuery({
    queryKey: adminKeys.episodes(),
    queryFn: () => getApiClient().listAdminEpisodes(),
    enabled,
  });
}

export function useAdminEpisodeQuery(id: string | undefined) {
  const enabled = useAdminEnabled();
  return useQuery({
    queryKey: adminKeys.episode(id ?? ''),
    queryFn: () => getApiClient().getAdminEpisode(id!),
    enabled: enabled && Boolean(id),
  });
}

export function useAdminAuditQuery() {
  const enabled = useAdminEnabled();
  return useQuery({
    queryKey: adminKeys.audit(),
    queryFn: () => getApiClient().listAdminAudit(),
    enabled,
  });
}

export function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: adminKeys.all });
  };
}

export function useAdminMutation<TInput>(mutateFn: (input: TInput) => Promise<unknown>) {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: mutateFn,
    onSuccess: async () => {
      await invalidate();
    },
  });
}
