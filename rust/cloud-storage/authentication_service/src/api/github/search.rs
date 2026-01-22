use axum::{Extension, Json, extract::{Query, State}};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::context::ApiContext;
use github_integration::{GitHubIntegrationError, GitHubOAuthClient, get_github_credentials};
use model::response::ErrorResponse;
use model::user::UserContext;
use model_entity::github::{github_commit_id, github_issue_id, github_pr_id, github_repo_id};

/// Default number of results per category
const DEFAULT_PER_CATEGORY: u8 = 10;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct GitHubSearchQuery {
    /// The search query string
    pub q: String,
    /// Number of results per category (repos, issues, commits)
    #[serde(default = "default_per_category")]
    pub per_category: u8,
}

fn default_per_category() -> u8 {
    DEFAULT_PER_CATEGORY
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubSearchResponse {
    /// Repository results
    pub repos: Vec<GitHubSearchRepoResult>,
    /// Issue results (pure issues, not PRs)
    pub issues: Vec<GitHubSearchIssueResult>,
    /// Pull request results
    pub pull_requests: Vec<GitHubSearchPullRequestResult>,
    /// Commit results
    pub commits: Vec<GitHubSearchCommitResult>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubSearchRepoResult {
    /// Foreign entity ID: github::repo:owner/name
    pub id: String,
    /// Repository name (without owner)
    pub name: String,
    /// Full repository name (owner/repo)
    pub full_name: String,
    /// Repository owner username
    pub owner: String,
    /// Owner avatar URL
    pub avatar_url: String,
    /// Repository description
    pub description: Option<String>,
    /// Whether the repository is private
    pub private: bool,
    /// HTML URL to the repository
    pub url: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubSearchIssueResult {
    /// Foreign entity ID: github::issue:owner/repo#number
    pub id: String,
    /// Issue number
    pub number: u64,
    /// Issue title
    pub title: String,
    /// Issue state (open, closed)
    pub state: String,
    /// HTML URL to the issue
    pub url: String,
    /// Author username
    pub author: String,
    /// Author avatar URL
    pub author_avatar_url: String,
    /// Repository full name (owner/repo)
    pub repo_full_name: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubSearchPullRequestResult {
    /// Foreign entity ID: github::pr:owner/repo#number
    pub id: String,
    /// PR number
    pub number: u64,
    /// PR title
    pub title: String,
    /// PR state (open, closed)
    pub state: String,
    /// Whether the PR is a draft
    pub draft: bool,
    /// Whether the PR is merged
    pub merged: bool,
    /// HTML URL to the PR
    pub url: String,
    /// Author username
    pub author: String,
    /// Author avatar URL
    pub author_avatar_url: String,
    /// Repository full name (owner/repo)
    pub repo_full_name: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubSearchCommitResult {
    /// Foreign entity ID: github::commit:owner/repo@sha
    pub id: String,
    /// Commit SHA
    pub sha: String,
    /// Short SHA (first 7 characters)
    pub short_sha: String,
    /// Commit message (first line)
    pub message: String,
    /// HTML URL to the commit
    pub url: String,
    /// Author name
    pub author_name: String,
    /// Author GitHub username (if available)
    pub author_login: Option<String>,
    /// Author avatar URL (if available)
    pub author_avatar_url: Option<String>,
    /// Repository full name (owner/repo)
    pub repo_full_name: String,
}

/// Extracts owner/repo from a repository_url like "https://api.github.com/repos/owner/repo"
fn extract_repo_from_url(url: &str) -> Option<(String, String)> {
    let parts: Vec<&str> = url.trim_end_matches('/').split('/').collect();
    if parts.len() >= 2 {
        let repo = parts[parts.len() - 1].to_string();
        let owner = parts[parts.len() - 2].to_string();
        Some((owner, repo))
    } else {
        None
    }
}

/// Searches GitHub for repositories, issues, PRs, and commits
#[utoipa::path(
    get,
    operation_id = "search_github",
    path = "/github/search",
    params(GitHubSearchQuery),
    responses(
        (status = 200, body=GitHubSearchResponse),
        (status = 403, body=ErrorResponse, description = "GitHub account not linked"),
        (status = 401, body=ErrorResponse, description = "Not authenticated"),
        (status = 500, body=ErrorResponse, description = "Server error"),
    )
)]
#[tracing::instrument(skip(ctx, user_context), err, fields(user_id=%user_context.user_id, fusion_user_id=%user_context.fusion_user_id))]
pub async fn handler(
    State(ctx): State<ApiContext>,
    user_context: Extension<UserContext>,
    Query(query): Query<GitHubSearchQuery>,
) -> Result<Json<GitHubSearchResponse>, GitHubIntegrationError> {
    tracing::info!(query=%query.q, "search_github called");

    let fusion_user_id = Uuid::parse_str(&user_context.fusion_user_id)?;
    let oauth_client = GitHubOAuthClient::new();

    // Get credentials
    let credentials = get_github_credentials(
        &ctx.db,
        &*ctx.auth_client,
        &ctx.github_config,
        fusion_user_id,
    )
    .await?;

    // Run all searches in parallel
    let (repos_result, issues_result, commits_result) = tokio::join!(
        oauth_client.search_repositories(
            &credentials.access_token,
            &query.q,
            Some(query.per_category),
        ),
        oauth_client.search_issues(
            &credentials.access_token,
            &query.q,
            Some(query.per_category * 2), // Get more since we split into issues and PRs
        ),
        oauth_client.search_commits(
            &credentials.access_token,
            &query.q,
            Some(query.per_category),
        ),
    );

    // Process repository results
    let repos: Vec<GitHubSearchRepoResult> = repos_result
        .map(|r| {
            r.items
                .into_iter()
                .map(|repo| {
                    let repo_id = github_repo_id(&repo.owner.login, &repo.name)
                        .map(|ns_id| ns_id.to_string())
                        .unwrap_or_else(|_| format!("github::repo:{}", repo.full_name));

                    GitHubSearchRepoResult {
                        id: repo_id,
                        name: repo.name,
                        full_name: repo.full_name,
                        owner: repo.owner.login,
                        avatar_url: repo.owner.avatar_url,
                        description: repo.description,
                        private: repo.private,
                        url: repo.html_url,
                    }
                })
                .collect()
        })
        .unwrap_or_else(|e| {
            tracing::warn!(error=?e, "Failed to search repositories");
            vec![]
        });

    // Process issues/PRs results - separate them
    let (issues, pull_requests): (Vec<_>, Vec<_>) = issues_result
        .map(|r| {
            r.items.into_iter().partition(|item| item.pull_request.is_none())
        })
        .unwrap_or_else(|e| {
            tracing::warn!(error=?e, "Failed to search issues");
            (vec![], vec![])
        });

    let issues: Vec<GitHubSearchIssueResult> = issues
        .into_iter()
        .filter_map(|issue| {
            let (owner, repo) = extract_repo_from_url(&issue.repository_url)?;
            let repo_full_name = format!("{}/{}", owner, repo);

            let issue_id = github_issue_id(&owner, &repo, issue.number)
                .map(|ns_id| ns_id.to_string())
                .unwrap_or_else(|_| format!("github::issue:{}#{}", repo_full_name, issue.number));

            Some(GitHubSearchIssueResult {
                id: issue_id,
                number: issue.number,
                title: issue.title,
                state: issue.state,
                url: issue.html_url,
                author: issue.user.login,
                author_avatar_url: issue.user.avatar_url,
                repo_full_name,
            })
        })
        .collect();

    let pull_requests: Vec<GitHubSearchPullRequestResult> = pull_requests
        .into_iter()
        .filter_map(|pr| {
            let (owner, repo) = extract_repo_from_url(&pr.repository_url)?;
            let repo_full_name = format!("{}/{}", owner, repo);

            let pr_id = github_pr_id(&owner, &repo, pr.number)
                .map(|ns_id| ns_id.to_string())
                .unwrap_or_else(|_| format!("github::pr:{}#{}", repo_full_name, pr.number));

            // Check if merged by looking at merged_at in pull_request info
            let merged = pr
                .pull_request
                .as_ref()
                .and_then(|p| p.merged_at.as_ref())
                .is_some();

            Some(GitHubSearchPullRequestResult {
                id: pr_id,
                number: pr.number,
                title: pr.title,
                state: pr.state,
                draft: pr.draft,
                merged,
                url: pr.html_url,
                author: pr.user.login,
                author_avatar_url: pr.user.avatar_url,
                repo_full_name,
            })
        })
        .collect();

    // Process commit results
    let commits: Vec<GitHubSearchCommitResult> = commits_result
        .map(|r| {
            r.items
                .into_iter()
                .map(|commit| {
                    let repo_full_name = commit.repository.full_name.clone();
                    let parts: Vec<&str> = repo_full_name.split('/').collect();
                    let (owner, repo_name) = if parts.len() == 2 {
                        (parts[0], parts[1])
                    } else {
                        ("", "")
                    };

                    let commit_id = github_commit_id(owner, repo_name, &commit.sha)
                        .map(|ns_id| ns_id.to_string())
                        .unwrap_or_else(|_| {
                            format!("github::commit:{}@{}", repo_full_name, commit.sha)
                        });

                    let short_sha: String = commit.sha.chars().take(7).collect();
                    let message = commit
                        .commit
                        .message
                        .lines()
                        .next()
                        .unwrap_or("")
                        .to_string();

                    GitHubSearchCommitResult {
                        id: commit_id,
                        sha: commit.sha,
                        short_sha,
                        message,
                        url: commit.html_url,
                        author_name: commit.commit.author.name,
                        author_login: commit.author.as_ref().map(|a| a.login.clone()),
                        author_avatar_url: commit.author.map(|a| a.avatar_url),
                        repo_full_name,
                    }
                })
                .collect()
        })
        .unwrap_or_else(|e| {
            tracing::warn!(error=?e, "Failed to search commits");
            vec![]
        });

    Ok(Json(GitHubSearchResponse {
        repos,
        issues,
        pull_requests,
        commits,
    }))
}
