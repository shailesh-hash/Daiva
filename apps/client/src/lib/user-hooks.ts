import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getApiClient } from './api-access';
import { useAuth } from './auth-context';
import { userKeys } from './query-client';

export function useMeQuery() {
  const auth = useAuth();
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: () => getApiClient().getMe(),
    enabled: auth.status === 'signedIn',
  });
}

export function useFavoritesQuery() {
  const auth = useAuth();
  return useQuery({
    queryKey: userKeys.favorites(),
    queryFn: () => getApiClient().listFavorites(),
    enabled: auth.status === 'signedIn',
  });
}

export function useProgressQuery() {
  const auth = useAuth();
  return useQuery({
    queryKey: userKeys.progress(),
    queryFn: () => getApiClient().listProgress(),
    enabled: auth.status === 'signedIn',
  });
}

export function useFavoriteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { storyId: string; favorite: boolean }) => {
      if (input.favorite) {
        await getApiClient().addFavorite(input.storyId);
      } else {
        await getApiClient().removeFavorite(input.storyId);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.favorites() });
    },
  });
}

export function useProgressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { episodeId: string; positionSeconds: number; completed: boolean }) =>
      getApiClient().saveProgress(input.episodeId, {
        positionSeconds: Math.max(0, Math.floor(input.positionSeconds)),
        completed: input.completed,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.progress() });
    },
  });
}
