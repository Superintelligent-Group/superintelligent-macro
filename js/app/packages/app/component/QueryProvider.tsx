import { QueryClientProvider } from '@tanstack/solid-query';
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools';
import { LOCAL_ONLY } from '@core/constant/featureFlags';
import { Show, type ParentProps } from 'solid-js';
import { fetchApiToken, authKeys } from '@queries/auth';
import { queryClient } from '@queries/client';
import { RemoveInstructionsMdFromHistorySideEffect } from '@queries/history/history';

export function QueryProvider(props: ParentProps) {
  queryClient.setQueryDefaults(authKeys._def, {
    staleTime: 1000 * 60 * 55, // 55 minutes
    gcTime: 1000 * 60 * 60 * 24, // 1 day
  });
  queryClient.setQueryDefaults(authKeys.apiToken.queryKey, {
    staleTime: 1000 * 60 * 55, // 55 minutes
    queryFn: fetchApiToken,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <RemoveInstructionsMdFromHistorySideEffect />
      {props.children}
      <Show when={LOCAL_ONLY}>
        <SolidQueryDevtools initialIsOpen={false} />
      </Show>
    </QueryClientProvider>
  );
}
