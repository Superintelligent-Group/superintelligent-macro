import type { MacroApiTokenResponse } from '@service-auth/generated/schemas/macroApiTokenResponse';
import { queryOptions, useQuery } from '@tanstack/solid-query';
import { SERVER_HOSTS } from 'core/constant/servers';
import { fetchWithToken } from 'core/util/fetchWithToken';
import { isOk } from 'core/util/maybeResult';
import { authKeys } from './keys';

const authHost = SERVER_HOSTS['auth-service'];

class FetchDocumentsError extends Error {
  constructor(
    message: string,
    public readonly response: Response,
    public readonly data?: { message?: string }
  ) {
    super(message);
    this.name = 'FetchDocumentsError';
  }

  isJwtExpired(): boolean {
    return this.response.status === 401 && this.data?.message === 'jwt expired';
  }
}

export async function withApiTokenRetry<T>(
  authQuery: ReturnType<typeof createApiTokenQuery>,
  fetchFn: (apiToken: string) => Promise<T>
): Promise<T> {
  if (!authQuery.data) throw new Error('No API token available');

  try {
    return await fetchFn(authQuery.data);
  } catch (error) {
    if (error instanceof FetchDocumentsError && error.isJwtExpired()) {
      const refetchResult = await authQuery.refetch();
      if (refetchResult.isSuccess) {
        return await fetchFn(refetchResult.data);
      }
    }
    throw error;
  }
}

export const fetchApiToken = async () => {
  const result = await fetchWithToken<MacroApiTokenResponse>(
    `${authHost}/jwt/macro_api_token`
  );

  if (!isOk(result)) {
    throw new Error('Failed to fetch API token', { cause: result[0] });
  }

  return result[1].macro_api_token;
};

export async function handleFetchResponse(
  response: Response,
  errorMessage: string
): Promise<void> {
  if (!response.ok) {
    let data: { message?: string } | undefined;
    try {
      data = await response.json();
    } catch {
      // Ignore JSON parse errors
    }
    throw new FetchDocumentsError(errorMessage, response, data);
  }
}

export function createApiTokenQueryOptions() {
  return queryOptions({
    queryKey: authKeys.apiToken.queryKey,
    queryFn: fetchApiToken,
  });
}

export function createApiTokenQuery() {
  return useQuery(() => createApiTokenQueryOptions());
}
