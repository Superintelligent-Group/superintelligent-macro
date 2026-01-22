import {
  getDisplayTextFromGitHubId,
  getRepoFromGitHubId,
  type GitHubMentionDecoratorProps,
  type GitHubEntityType,
} from '@lexical-core';
import GitHubIcon from '@icon/regular/github-logo.svg';
import GitPullRequestIcon from '@icon/regular/git-pull-request.svg';
import IssueIcon from '@icon/regular/circle-dashed.svg';
import CommitIcon from '@icon/regular/git-commit.svg';
import BranchIcon from '@icon/regular/git-branch.svg';
import TagIcon from '@icon/regular/tag.svg';
import LoadingSpinner from '@icon/regular/spinner.svg';
import {
  createGitHubRepoQuery,
  createGitHubPullRequestQuery,
  createGitHubIssueQuery,
  createGitHubCommitQuery,
  createGitHubBranchQuery,
  createGitHubReleaseQuery,
} from '@macro-entity';
import {
  createEffect,
  createSignal,
  onCleanup,
  Show,
  Switch,
  Match,
  type ParentProps,
  type JSX,
} from 'solid-js';

type GitHubMentionProps = ParentProps<GitHubMentionDecoratorProps>;

/**
 * Gets the appropriate icon for the GitHub entity type
 */
function getEntityIcon(entityType: GitHubEntityType): JSX.Element {
  switch (entityType) {
    case 'repo':
      return <GitHubIcon class="size-full" />;
    case 'pr':
      return <GitPullRequestIcon class="size-full" />;
    case 'issue':
      return <IssueIcon class="size-full" />;
    case 'commit':
      return <CommitIcon class="size-full" />;
    case 'branch':
      return <BranchIcon class="size-full" />;
    case 'release':
      return <TagIcon class="size-full" />;
  }
}

/**
 * Builds a URL for the GitHub entity
 */
function buildEntityUrl(
  entityId: string,
  entityType: GitHubEntityType
): string {
  const repoPath = getRepoFromGitHubId(entityId, entityType);
  const displayText = getDisplayTextFromGitHubId(entityId, entityType);

  switch (entityType) {
    case 'repo':
      return `https://github.com/${repoPath}`;
    case 'pr':
      return `https://github.com/${repoPath}/pull/${displayText.replace('#', '')}`;
    case 'issue':
      return `https://github.com/${repoPath}/issues/${displayText.replace('#', '')}`;
    case 'commit':
      return `https://github.com/${repoPath}/commit/${displayText}`;
    case 'branch':
      return `https://github.com/${repoPath}/tree/${displayText}`;
    case 'release':
      return `https://github.com/${repoPath}/releases/tag/${displayText}`;
  }
}

/**
 * Hook to create the appropriate query based on entity type
 */
function useGitHubEntityQuery(entityId: string, entityType: GitHubEntityType) {
  switch (entityType) {
    case 'repo':
      return createGitHubRepoQuery(entityId);
    case 'pr':
      return createGitHubPullRequestQuery(entityId);
    case 'issue':
      return createGitHubIssueQuery(entityId);
    case 'commit':
      return createGitHubCommitQuery(entityId);
    case 'branch':
      return createGitHubBranchQuery(entityId);
    case 'release':
      return createGitHubReleaseQuery(entityId);
  }
}

/**
 * Gets the title/description from entity data based on type
 */
function getEntityTitle(
  data: unknown,
  entityType: GitHubEntityType
): string | null {
  if (!data) return null;

  switch (entityType) {
    case 'repo':
      return (data as { description?: string }).description || null;
    case 'pr':
    case 'issue':
      return (data as { title?: string }).title || null;
    case 'commit':
      return (data as { message?: string }).message || null;
    case 'branch':
      return (data as { name?: string }).name || null;
    case 'release':
      return (
        (data as { name?: string }).name ||
        (data as { tagName?: string }).tagName ||
        null
      );
  }
}

/**
 * Gets the URL from entity data based on type
 */
function getEntityUrlFromData(
  data: unknown,
  entityType: GitHubEntityType
): string | null {
  if (!data) return null;
  return (data as { url?: string }).url || null;
}

export function GitHubMention(props: GitHubMentionProps) {
  const displayText = getDisplayTextFromGitHubId(
    props.entityId,
    props.entityType
  );
  const repoPath = getRepoFromGitHubId(props.entityId);
  const query = useGitHubEntityQuery(props.entityId, props.entityType);

  // Copy query state to local signals to decouple reactivity during cleanup
  const [data, setData] = createSignal(query.data);
  const [error, setError] = createSignal(query.error);
  const [loading, setLoading] = createSignal(query.isLoading);

  let disposed = false;
  onCleanup(() => {
    disposed = true;
  });

  createEffect(() => {
    const newData = query.data;
    const newError = query.error;
    const newLoading = query.isLoading;
    if (!disposed) {
      setData(newData);
      setError(newError);
      setLoading(newLoading);
    }
  });

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url =
      getEntityUrlFromData(data(), props.entityType) ||
      buildEntityUrl(props.entityId, props.entityType);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const title = () =>
    getEntityTitle(data(), props.entityType) || `${repoPath}${displayText}`;
  const isError = () => !!error();

  const errorMessage = () => {
    const err = error();
    if (!err) return null;
    const msg = err instanceof Error ? err.message : '';
    if (
      msg === 'REPO_NOT_FOUND' ||
      msg === 'PR_NOT_FOUND' ||
      msg === 'ISSUE_NOT_FOUND' ||
      msg === 'COMMIT_NOT_FOUND' ||
      msg === 'BRANCH_NOT_FOUND' ||
      msg === 'RELEASE_NOT_FOUND'
    ) {
      return 'Not found';
    }
    if (msg === 'GITHUB_NOT_LINKED') return 'GitHub not linked';
    return 'Error';
  };

  return (
    <span
      class="py-0.5 cursor-default rounded-xs hover:bg-hover focus:bg-active"
      onClick={!isError() ? handleClick : undefined}
      data-github-mention="true"
      data-entity-id={props.entityId}
      data-entity-type={props.entityType}
      data-mention-uuid={props.mentionUuid || ''}
      title={title()}
    >
      <span class="pointer-events-auto">
        {/* Icon */}
        <span class="relative top-[0.125em] size-[1em] inline-flex mx-1">
          <Show
            when={!loading()}
            fallback={
              <div class="animate-spin">
                <LoadingSpinner />
              </div>
            }
          >
            {getEntityIcon(props.entityType)}
          </Show>
        </span>

        {/* Text */}
        <Show
          when={!isError()}
          fallback={
            <span class="underline decoration-error/20 decoration-[max(1px,0.1em)] underline-offset-2 text-error">
              {errorMessage()}
            </span>
          }
        >
          <span
            class="underline decoration-current/20 decoration-[max(1px,0.1em)] underline-offset-2"
            data-github-mention="true"
            data-entity-id={props.entityId}
          >
            <Switch fallback={displayText}>
              <Match when={props.entityType === 'repo'}>
                <Show
                  when={data() as { fullName?: string; description?: string }}
                  fallback={displayText}
                >
                  {(repoData) => (
                    <>
                      {repoData().fullName || displayText}
                      <Show when={repoData().description}>
                        {' '}
                        <span class="text-ink-muted">
                          {repoData().description?.substring(0, 40)}
                          {(repoData().description?.length ?? 0) > 40
                            ? '...'
                            : ''}
                        </span>
                      </Show>
                    </>
                  )}
                </Show>
              </Match>
              <Match when={props.entityType === 'pr'}>
                <Show when={data() as { title?: string }} fallback={displayText}>
                  {(prData) => (
                    <>
                      {displayText}{' '}
                      <span class="text-ink-muted">
                        {prData().title?.substring(0, 40)}
                        {(prData().title?.length ?? 0) > 40 ? '...' : ''}
                      </span>
                    </>
                  )}
                </Show>
              </Match>
              <Match when={props.entityType === 'issue'}>
                <Show
                  when={data() as { title?: string }}
                  fallback={displayText}
                >
                  {(issueData) => (
                    <>
                      {displayText}{' '}
                      <span class="text-ink-muted">
                        {issueData().title?.substring(0, 40)}
                        {(issueData().title?.length ?? 0) > 40 ? '...' : ''}
                      </span>
                    </>
                  )}
                </Show>
              </Match>
              <Match when={props.entityType === 'commit'}>
                <Show
                  when={data() as { message?: string }}
                  fallback={displayText}
                >
                  {(commitData) => {
                    const firstLine =
                      commitData().message?.split('\n')[0] || '';
                    return (
                      <>
                        <code class="bg-surface-raised px-1 rounded text-[0.9em]">
                          {displayText}
                        </code>{' '}
                        <span class="text-ink-muted">
                          {firstLine.substring(0, 40)}
                          {firstLine.length > 40 ? '...' : ''}
                        </span>
                      </>
                    );
                  }}
                </Show>
              </Match>
              <Match when={props.entityType === 'branch'}>
                <code class="bg-surface-raised px-1 rounded text-[0.9em]">
                  {displayText}
                </code>
              </Match>
              <Match when={props.entityType === 'release'}>
                <Show
                  when={data() as { name?: string; tagName?: string }}
                  fallback={displayText}
                >
                  {(releaseData) => (
                    <>
                      <code class="bg-surface-raised px-1 rounded text-[0.9em]">
                        {releaseData().tagName || displayText}
                      </code>
                      <Show when={releaseData().name}>
                        {' '}
                        <span class="text-ink-muted">
                          {releaseData().name?.substring(0, 30)}
                          {(releaseData().name?.length ?? 0) > 30 ? '...' : ''}
                        </span>
                      </Show>
                    </>
                  )}
                </Show>
              </Match>
            </Switch>
          </span>
        </Show>
      </span>
    </span>
  );
}
