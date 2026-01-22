import type { MacroApiTokenResponse } from '@service-auth/generated/schemas/macroApiTokenResponse';
import type { ProfilePictures } from '@service-auth/generated/schemas/profilePictures';
import {
  queryOptions,
  type SolidQueryOptions,
  useQuery,
} from '@tanstack/solid-query';
import { SERVER_HOSTS } from 'core/constant/servers';
import { fetchWithToken } from 'core/util/fetchWithToken';
import { isOk } from 'core/util/maybeResult';
import { platformFetch } from 'core/util/platformFetch';
import { createMemo } from 'solid-js';
import { queryKeys } from './key';

const authHost = SERVER_HOSTS['auth-service'];

export class FetchDocumentsError extends Error {
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

export async function handleFetchResponse(
  response: Response,
  errorMessage: string
): Promise<void> {
  if (!response.ok) {
    const errorData =
      response.status === 401
        ? await response.json().catch(() => undefined)
        : undefined;
    throw new FetchDocumentsError(errorMessage, response, errorData);
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

type ApiTokenQueryOptions = SolidQueryOptions<
  string,
  Error,
  string,
  string[]
> & {
  initialData?: undefined;
};
export function createApiTokenQueryOptions(): ApiTokenQueryOptions {
  return queryOptions({
    queryKey: queryKeys.auth.apiToken,
    queryFn: fetchApiToken,
  });
}

export function createApiTokenQuery() {
  return useQuery(() => createApiTokenQueryOptions());
}

export function useUserId() {
  const authQuery = createApiTokenQuery();
  return createMemo<string | undefined>(() => {
    if (!authQuery.isSuccess) return;

    const token = authQuery.data;
    if (!token) return;

    const parts = token.split('.');
    if (parts.length !== 3) return;
    try {
      const payload = parts[1];
      if (!payload) return;

      const parsedPayload = JSON.parse(
        atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      );

      return parsedPayload.macro_user_id;
    } catch {
      return;
    }
  });
}

const fetchProfilePictures = async (
  user_id_list: Array<string>,
  apiToken?: string
) => {
  const credentials: RequestInit = apiToken
    ? {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    : {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      };
  const response = await platformFetch(`${authHost}/user/profile_pictures`, {
    method: 'POST',
    body: JSON.stringify({ user_id_list }),
    ...credentials,
  });

  await handleFetchResponse(response, 'Failed to fetch profile picture');

  const { pictures }: ProfilePictures = await response.json();
  if (pictures.length === 0)
    throw new Error(`No profile picture found for ${user_id_list}`);

  return pictures;
};

export function createProfilePictureQuery(id: string) {
  const authQuery = createApiTokenQuery();
  return useQuery(() => ({
    queryKey: queryKeys.auth.profilePicture({ id }),
    queryFn: () =>
      withApiTokenRetry(authQuery, (apiToken) =>
        fetchProfilePictures([id], apiToken)
      ),
    select: (pictures) => pictures.at(0),
    enabled: authQuery.isSuccess,
    retry: 1,
    retryOnMount: false,
  }));
}

export interface GitHubRepoEntity {
  id: string; // github::repo:owner/name
  name: string;
  fullName: string;
  owner: string;
  avatarUrl: string;
  description: string | null;
  private: boolean;
  url: string;
  updatedAt: string;
}

export interface GitHubPullRequestEntity {
  id: string; // github::pr:owner/repo#number
  number: number;
  title: string;
  state: string;
  draft: boolean;
  merged: boolean;
  url: string;
  author: string;
  authorAvatarUrl: string;
  repoFullName: string;
  createdAt: string;
  updatedAt: string;
  headBranch: string;
  baseBranch: string;
}

export interface GitHubIssueEntity {
  id: string; // github::issue:owner/repo#number
  number: number;
  title: string;
  state: string;
  url: string;
  author: string;
  authorAvatarUrl: string;
  repoFullName: string;
  createdAt: string;
  updatedAt: string;
  labels: Array<{ name: string; color: string }>;
}

export interface GitHubCommitEntity {
  id: string; // github::commit:owner/repo@sha
  sha: string;
  shortSha: string;
  message: string;
  url: string;
  authorName: string;
  authorEmail: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  repoFullName: string;
  date: string;
}

export interface GitHubBranchEntity {
  id: string; // github::branch:owner/repo:branch
  name: string;
  sha: string;
  shortSha: string;
  protected: boolean;
  repoFullName: string;
  url: string;
}

export interface GitHubReleaseEntity {
  id: string; // github::release:owner/repo@tag
  tagName: string;
  name: string | null;
  draft: boolean;
  prerelease: boolean;
  url: string;
  author: string;
  authorAvatarUrl: string;
  repoFullName: string;
  createdAt: string;
  publishedAt: string | null;
}

const fetchGitHubRepos = async (perPage?: number) => {
  const params = new URLSearchParams();
  if (perPage) {
    params.set('per_page', perPage.toString());
  }

  const url = `${authHost}/github/repos${params.toString() ? `?${params}` : ''}`;
  const response = await platformFetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('GITHUB_NOT_LINKED');
    }
    throw new Error(`Failed to fetch GitHub repos: ${response.statusText}`);
  }

  const repos: GitHubRepoEntity[] = await response.json();
  return repos;
};

export function createGitHubReposQuery() {
  return useQuery(() => ({
    queryKey: queryKeys.auth.githubRepos,
    queryFn: () => fetchGitHubRepos(50),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry if not linked
      if (error instanceof Error && error.message === 'GITHUB_NOT_LINKED') {
        return false;
      }
      return failureCount < 2;
    },
  }));
}

const fetchGitHubRepo = async (
  owner: string,
  repo: string
): Promise<GitHubRepoEntity> => {
  const url = `${authHost}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const response = await platformFetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('GITHUB_NOT_LINKED');
    }
    if (response.status === 404) {
      throw new Error('REPO_NOT_FOUND');
    }
    throw new Error(`Failed to fetch GitHub repo: ${response.statusText}`);
  }

  const repoData: GitHubRepoEntity = await response.json();
  return repoData;
};

/**
 * Parses a GitHub repo ID (e.g., "github::repo:owner/name") to extract owner and repo name
 */
function parseGitHubRepoId(
  repoId: string
): { owner: string; repo: string } | null {
  const parts = repoId.split(':');
  if (parts.length < 2) return null;

  const fullName = parts[parts.length - 1];
  if (!fullName) return null;

  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) return null;

  return { owner, repo };
}

export function createGitHubRepoQuery(repoId: string) {
  const parsed = parseGitHubRepoId(repoId);

  return useQuery(() => ({
    queryKey: queryKeys.auth.githubRepo({ id: repoId }),
    queryFn: () => {
      if (!parsed) {
        throw new Error('Invalid GitHub repo ID format');
      }
      return fetchGitHubRepo(parsed.owner, parsed.repo);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!parsed,
    retry: (failureCount, error) => {
      // Don't retry if not linked or not found
      if (
        error instanceof Error &&
        (error.message === 'GITHUB_NOT_LINKED' ||
          error.message === 'REPO_NOT_FOUND')
      ) {
        return false;
      }
      return failureCount < 2;
    },
  }));
}

// ============ Pull Requests ============

const fetchGitHubPullRequests = async (
  owner: string,
  repo: string,
  state?: string
) => {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  params.set('per_page', '30');

  const url = `${authHost}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls${params.toString() ? `?${params}` : ''}`;
  const response = await platformFetch(url, { credentials: 'include' });

  if (!response.ok) {
    if (response.status === 403) throw new Error('GITHUB_NOT_LINKED');
    if (response.status === 404) throw new Error('REPO_NOT_FOUND');
    throw new Error(`Failed to fetch GitHub PRs: ${response.statusText}`);
  }

  return (await response.json()) as GitHubPullRequestEntity[];
};

const fetchGitHubPullRequest = async (
  owner: string,
  repo: string,
  number: number
): Promise<GitHubPullRequestEntity> => {
  const url = `${authHost}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`;
  const response = await platformFetch(url, { credentials: 'include' });

  if (!response.ok) {
    if (response.status === 403) throw new Error('GITHUB_NOT_LINKED');
    if (response.status === 404) throw new Error('PR_NOT_FOUND');
    throw new Error(`Failed to fetch GitHub PR: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Parses a GitHub PR ID (e.g., "github::pr:owner/repo#123")
 */
function parseGitHubPRId(
  prId: string
): { owner: string; repo: string; number: number } | null {
  const parts = prId.split(':');
  if (parts.length < 2) return null;

  const identifier = parts[parts.length - 1];
  if (!identifier) return null;

  const hashIdx = identifier.lastIndexOf('#');
  if (hashIdx === -1) return null;

  const repoPath = identifier.substring(0, hashIdx);
  const numberStr = identifier.substring(hashIdx + 1);

  const [owner, repo] = repoPath.split('/');
  if (!owner || !repo) return null;

  const number = parseInt(numberStr, 10);
  if (isNaN(number)) return null;

  return { owner, repo, number };
}

export function createGitHubPullRequestsQuery(owner: string, repo: string) {
  return useQuery(() => ({
    queryKey: queryKeys.auth.githubPulls({ owner, repo }),
    queryFn: () => fetchGitHubPullRequests(owner, repo, 'all'),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!owner && !!repo,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        (error.message === 'GITHUB_NOT_LINKED' ||
          error.message === 'REPO_NOT_FOUND')
      ) {
        return false;
      }
      return failureCount < 2;
    },
  }));
}

export function createGitHubPullRequestQuery(prId: string) {
  const parsed = parseGitHubPRId(prId);

  return useQuery(() => ({
    queryKey: queryKeys.auth.githubPull({ id: prId }),
    queryFn: () => {
      if (!parsed) throw new Error('Invalid GitHub PR ID format');
      return fetchGitHubPullRequest(parsed.owner, parsed.repo, parsed.number);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!parsed,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        (error.message === 'GITHUB_NOT_LINKED' || error.message === 'PR_NOT_FOUND')
      ) {
        return false;
      }
      return failureCount < 2;
    },
  }));
}

// ============ Issues ============

const fetchGitHubIssues = async (
  owner: string,
  repo: string,
  state?: string
) => {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  params.set('per_page', '30');

  const url = `${authHost}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues${params.toString() ? `?${params}` : ''}`;
  const response = await platformFetch(url, { credentials: 'include' });

  if (!response.ok) {
    if (response.status === 403) throw new Error('GITHUB_NOT_LINKED');
    if (response.status === 404) throw new Error('REPO_NOT_FOUND');
    throw new Error(`Failed to fetch GitHub issues: ${response.statusText}`);
  }

  return (await response.json()) as GitHubIssueEntity[];
};

const fetchGitHubIssue = async (
  owner: string,
  repo: string,
  number: number
): Promise<GitHubIssueEntity> => {
  const url = `${authHost}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}`;
  const response = await platformFetch(url, { credentials: 'include' });

  if (!response.ok) {
    if (response.status === 403) throw new Error('GITHUB_NOT_LINKED');
    if (response.status === 404) throw new Error('ISSUE_NOT_FOUND');
    throw new Error(`Failed to fetch GitHub issue: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Parses a GitHub Issue ID (e.g., "github::issue:owner/repo#42")
 */
function parseGitHubIssueId(
  issueId: string
): { owner: string; repo: string; number: number } | null {
  const parts = issueId.split(':');
  if (parts.length < 2) return null;

  const identifier = parts[parts.length - 1];
  if (!identifier) return null;

  const hashIdx = identifier.lastIndexOf('#');
  if (hashIdx === -1) return null;

  const repoPath = identifier.substring(0, hashIdx);
  const numberStr = identifier.substring(hashIdx + 1);

  const [owner, repo] = repoPath.split('/');
  if (!owner || !repo) return null;

  const number = parseInt(numberStr, 10);
  if (isNaN(number)) return null;

  return { owner, repo, number };
}

export function createGitHubIssuesQuery(owner: string, repo: string) {
  return useQuery(() => ({
    queryKey: queryKeys.auth.githubIssues({ owner, repo }),
    queryFn: () => fetchGitHubIssues(owner, repo, 'all'),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!owner && !!repo,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        (error.message === 'GITHUB_NOT_LINKED' ||
          error.message === 'REPO_NOT_FOUND')
      ) {
        return false;
      }
      return failureCount < 2;
    },
  }));
}

export function createGitHubIssueQuery(issueId: string) {
  const parsed = parseGitHubIssueId(issueId);

  return useQuery(() => ({
    queryKey: queryKeys.auth.githubIssue({ id: issueId }),
    queryFn: () => {
      if (!parsed) throw new Error('Invalid GitHub Issue ID format');
      return fetchGitHubIssue(parsed.owner, parsed.repo, parsed.number);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!parsed,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        (error.message === 'GITHUB_NOT_LINKED' ||
          error.message === 'ISSUE_NOT_FOUND')
      ) {
        return false;
      }
      return failureCount < 2;
    },
  }));
}

// ============ Commits ============

const fetchGitHubCommits = async (owner: string, repo: string, sha?: string) => {
  const params = new URLSearchParams();
  if (sha) params.set('sha', sha);
  params.set('per_page', '30');

  const url = `${authHost}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits${params.toString() ? `?${params}` : ''}`;
  const response = await platformFetch(url, { credentials: 'include' });

  if (!response.ok) {
    if (response.status === 403) throw new Error('GITHUB_NOT_LINKED');
    if (response.status === 404) throw new Error('REPO_NOT_FOUND');
    throw new Error(`Failed to fetch GitHub commits: ${response.statusText}`);
  }

  return (await response.json()) as GitHubCommitEntity[];
};

const fetchGitHubCommit = async (
  owner: string,
  repo: string,
  sha: string
): Promise<GitHubCommitEntity> => {
  const url = `${authHost}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}`;
  const response = await platformFetch(url, { credentials: 'include' });

  if (!response.ok) {
    if (response.status === 403) throw new Error('GITHUB_NOT_LINKED');
    if (response.status === 404) throw new Error('COMMIT_NOT_FOUND');
    throw new Error(`Failed to fetch GitHub commit: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Parses a GitHub Commit ID (e.g., "github::commit:owner/repo@sha")
 */
function parseGitHubCommitId(
  commitId: string
): { owner: string; repo: string; sha: string } | null {
  const parts = commitId.split(':');
  if (parts.length < 2) return null;

  const identifier = parts[parts.length - 1];
  if (!identifier) return null;

  const atIdx = identifier.lastIndexOf('@');
  if (atIdx === -1) return null;

  const repoPath = identifier.substring(0, atIdx);
  const sha = identifier.substring(atIdx + 1);

  const [owner, repo] = repoPath.split('/');
  if (!owner || !repo || !sha) return null;

  return { owner, repo, sha };
}

export function createGitHubCommitsQuery(owner: string, repo: string) {
  return useQuery(() => ({
    queryKey: queryKeys.auth.githubCommits({ owner, repo }),
    queryFn: () => fetchGitHubCommits(owner, repo),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!owner && !!repo,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        (error.message === 'GITHUB_NOT_LINKED' ||
          error.message === 'REPO_NOT_FOUND')
      ) {
        return false;
      }
      return failureCount < 2;
    },
  }));
}

export function createGitHubCommitQuery(commitId: string) {
  const parsed = parseGitHubCommitId(commitId);

  return useQuery(() => ({
    queryKey: queryKeys.auth.githubCommit({ id: commitId }),
    queryFn: () => {
      if (!parsed) throw new Error('Invalid GitHub Commit ID format');
      return fetchGitHubCommit(parsed.owner, parsed.repo, parsed.sha);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!parsed,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        (error.message === 'GITHUB_NOT_LINKED' ||
          error.message === 'COMMIT_NOT_FOUND')
      ) {
        return false;
      }
      return failureCount < 2;
    },
  }));
}

// ============ Branches ============

const fetchGitHubBranches = async (owner: string, repo: string) => {
  const params = new URLSearchParams();
  params.set('per_page', '30');

  const url = `${authHost}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?${params}`;
  const response = await platformFetch(url, { credentials: 'include' });

  if (!response.ok) {
    if (response.status === 403) throw new Error('GITHUB_NOT_LINKED');
    if (response.status === 404) throw new Error('REPO_NOT_FOUND');
    throw new Error(`Failed to fetch GitHub branches: ${response.statusText}`);
  }

  return (await response.json()) as GitHubBranchEntity[];
};

const fetchGitHubBranch = async (
  owner: string,
  repo: string,
  branch: string
): Promise<GitHubBranchEntity> => {
  const url = `${authHost}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}`;
  const response = await platformFetch(url, { credentials: 'include' });

  if (!response.ok) {
    if (response.status === 403) throw new Error('GITHUB_NOT_LINKED');
    if (response.status === 404) throw new Error('BRANCH_NOT_FOUND');
    throw new Error(`Failed to fetch GitHub branch: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Parses a GitHub Branch ID (e.g., "github::branch:owner/repo:branch")
 */
function parseGitHubBranchId(
  branchId: string
): { owner: string; repo: string; branch: string } | null {
  const parts = branchId.split(':');
  if (parts.length < 3) return null;

  // Format: github::branch:owner/repo:branchName
  // After split: ['github', '', 'branch', 'owner/repo', 'branchName']
  const repoPath = parts[parts.length - 2];
  const branch = parts[parts.length - 1];
  if (!repoPath || !branch) return null;

  const [owner, repo] = repoPath.split('/');
  if (!owner || !repo) return null;

  return { owner, repo, branch };
}

export function createGitHubBranchesQuery(owner: string, repo: string) {
  return useQuery(() => ({
    queryKey: queryKeys.auth.githubBranches({ owner, repo }),
    queryFn: () => fetchGitHubBranches(owner, repo),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!owner && !!repo,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        (error.message === 'GITHUB_NOT_LINKED' ||
          error.message === 'REPO_NOT_FOUND')
      ) {
        return false;
      }
      return failureCount < 2;
    },
  }));
}

export function createGitHubBranchQuery(branchId: string) {
  const parsed = parseGitHubBranchId(branchId);

  return useQuery(() => ({
    queryKey: queryKeys.auth.githubBranch({ id: branchId }),
    queryFn: () => {
      if (!parsed) throw new Error('Invalid GitHub Branch ID format');
      return fetchGitHubBranch(parsed.owner, parsed.repo, parsed.branch);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!parsed,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        (error.message === 'GITHUB_NOT_LINKED' ||
          error.message === 'BRANCH_NOT_FOUND')
      ) {
        return false;
      }
      return failureCount < 2;
    },
  }));
}

// ============ Releases ============

const fetchGitHubReleases = async (owner: string, repo: string) => {
  const params = new URLSearchParams();
  params.set('per_page', '30');

  const url = `${authHost}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?${params}`;
  const response = await platformFetch(url, { credentials: 'include' });

  if (!response.ok) {
    if (response.status === 403) throw new Error('GITHUB_NOT_LINKED');
    if (response.status === 404) throw new Error('REPO_NOT_FOUND');
    throw new Error(`Failed to fetch GitHub releases: ${response.statusText}`);
  }

  return (await response.json()) as GitHubReleaseEntity[];
};

const fetchGitHubRelease = async (
  owner: string,
  repo: string,
  tag: string
): Promise<GitHubReleaseEntity> => {
  const url = `${authHost}/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/tags/${encodeURIComponent(tag)}`;
  const response = await platformFetch(url, { credentials: 'include' });

  if (!response.ok) {
    if (response.status === 403) throw new Error('GITHUB_NOT_LINKED');
    if (response.status === 404) throw new Error('RELEASE_NOT_FOUND');
    throw new Error(`Failed to fetch GitHub release: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Parses a GitHub Release ID (e.g., "github::release:owner/repo@tag")
 */
function parseGitHubReleaseId(
  releaseId: string
): { owner: string; repo: string; tag: string } | null {
  const parts = releaseId.split(':');
  if (parts.length < 2) return null;

  const identifier = parts[parts.length - 1];
  if (!identifier) return null;

  const atIdx = identifier.lastIndexOf('@');
  if (atIdx === -1) return null;

  const repoPath = identifier.substring(0, atIdx);
  const tag = identifier.substring(atIdx + 1);

  const [owner, repo] = repoPath.split('/');
  if (!owner || !repo || !tag) return null;

  return { owner, repo, tag };
}

export function createGitHubReleasesQuery(owner: string, repo: string) {
  return useQuery(() => ({
    queryKey: queryKeys.auth.githubReleases({ owner, repo }),
    queryFn: () => fetchGitHubReleases(owner, repo),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!owner && !!repo,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        (error.message === 'GITHUB_NOT_LINKED' ||
          error.message === 'REPO_NOT_FOUND')
      ) {
        return false;
      }
      return failureCount < 2;
    },
  }));
}

export function createGitHubReleaseQuery(releaseId: string) {
  const parsed = parseGitHubReleaseId(releaseId);

  return useQuery(() => ({
    queryKey: queryKeys.auth.githubRelease({ id: releaseId }),
    queryFn: () => {
      if (!parsed) throw new Error('Invalid GitHub Release ID format');
      return fetchGitHubRelease(parsed.owner, parsed.repo, parsed.tag);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!parsed,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        (error.message === 'GITHUB_NOT_LINKED' ||
          error.message === 'RELEASE_NOT_FOUND')
      ) {
        return false;
      }
      return failureCount < 2;
    },
  }));
}
