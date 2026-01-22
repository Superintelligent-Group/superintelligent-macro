use axum::{
    Extension, Json,
    extract::{Path, Query, State},
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::context::ApiContext;
use github_integration::{GitHubIntegrationError, GitHubOAuthClient, get_github_credentials};
use model::response::ErrorResponse;
use model::user::UserContext;
use model_entity::github::github_commit_id;

/// Default number of commits to return per page
const DEFAULT_COMMITS_PER_PAGE: u8 = 30;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct GetGitHubCommitsQuery {
    #[serde(default = "default_per_page")]
    pub per_page: u8,
    #[serde(default)]
    pub sha: Option<String>,
    #[serde(default)]
    pub page: Option<u32>,
}

fn default_per_page() -> u8 {
    DEFAULT_COMMITS_PER_PAGE
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubCommitResponse {
    /// Foreign entity ID: github::commit:owner/repo@sha
    pub id: String,
    /// Commit SHA
    pub sha: String,
    /// Short SHA (first 7 characters)
    pub short_sha: String,
    /// Commit message
    pub message: String,
    /// HTML URL to the commit
    pub url: String,
    /// Author name (from commit)
    pub author_name: String,
    /// Author email (from commit)
    pub author_email: String,
    /// Author GitHub username (if available)
    pub author_login: Option<String>,
    /// Author avatar URL (if available)
    pub author_avatar_url: Option<String>,
    /// Repository full name (owner/repo)
    pub repo_full_name: String,
    /// When the commit was made
    pub date: String,
}

/// Lists commits for a repository
#[utoipa::path(
    get,
    operation_id = "list_github_commits",
    path = "/github/repos/{owner}/{repo}/commits",
    params(
        ("owner" = String, Path, description = "Repository owner"),
        ("repo" = String, Path, description = "Repository name"),
        GetGitHubCommitsQuery
    ),
    responses(
        (status = 200, body=Vec<GitHubCommitResponse>),
        (status = 404, body=ErrorResponse, description = "Repository not found"),
        (status = 403, body=ErrorResponse, description = "GitHub account not linked"),
        (status = 401, body=ErrorResponse, description = "Not authenticated"),
        (status = 500, body=ErrorResponse, description = "Server error"),
    )
)]
#[tracing::instrument(skip(ctx, user_context), err, fields(user_id=%user_context.user_id, fusion_user_id=%user_context.fusion_user_id))]
pub async fn list_handler(
    State(ctx): State<ApiContext>,
    user_context: Extension<UserContext>,
    Path((owner, repo)): Path<(String, String)>,
    Query(query): Query<GetGitHubCommitsQuery>,
) -> Result<Json<Vec<GitHubCommitResponse>>, GitHubIntegrationError> {
    tracing::info!("list_github_commits called");

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

    // Fetch commits
    let commits = oauth_client
        .list_commits(
            &credentials.access_token,
            &owner,
            &repo,
            query.sha.as_deref(),
            Some(query.per_page),
            query.page,
        )
        .await?;

    // Convert to response format
    let repo_full_name = format!("{}/{}", owner, repo);
    let response: Vec<GitHubCommitResponse> = commits
        .into_iter()
        .map(|commit| {
            let commit_id = github_commit_id(&owner, &repo, &commit.sha)
                .map(|ns_id| ns_id.to_string())
                .unwrap_or_else(|_| format!("github::commit:{}@{}", repo_full_name, commit.sha));

            let short_sha = commit.sha.chars().take(7).collect();

            GitHubCommitResponse {
                id: commit_id,
                sha: commit.sha,
                short_sha,
                message: commit.commit.message,
                url: commit.html_url,
                author_name: commit.commit.author.name,
                author_email: commit.commit.author.email,
                author_login: commit.author.as_ref().map(|a| a.login.clone()),
                author_avatar_url: commit.author.as_ref().map(|a| a.avatar_url.clone()),
                repo_full_name: repo_full_name.clone(),
                date: commit.commit.author.date,
            }
        })
        .collect();

    Ok(Json(response))
}

/// Gets a specific commit
#[utoipa::path(
    get,
    operation_id = "get_github_commit",
    path = "/github/repos/{owner}/{repo}/commits/{sha}",
    params(
        ("owner" = String, Path, description = "Repository owner"),
        ("repo" = String, Path, description = "Repository name"),
        ("sha" = String, Path, description = "Commit SHA"),
    ),
    responses(
        (status = 200, body=GitHubCommitResponse),
        (status = 404, body=ErrorResponse, description = "Commit not found"),
        (status = 403, body=ErrorResponse, description = "GitHub account not linked"),
        (status = 401, body=ErrorResponse, description = "Not authenticated"),
        (status = 500, body=ErrorResponse, description = "Server error"),
    )
)]
#[tracing::instrument(skip(ctx, user_context), err, fields(user_id=%user_context.user_id, fusion_user_id=%user_context.fusion_user_id))]
pub async fn get_handler(
    State(ctx): State<ApiContext>,
    user_context: Extension<UserContext>,
    Path((owner, repo, sha)): Path<(String, String, String)>,
) -> Result<Json<GitHubCommitResponse>, GitHubIntegrationError> {
    tracing::info!("get_github_commit called");

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

    // Fetch the specific commit
    let commit = oauth_client
        .get_commit(&credentials.access_token, &owner, &repo, &sha)
        .await?;

    let repo_full_name = format!("{}/{}", owner, repo);
    let commit_id = github_commit_id(&owner, &repo, &commit.sha)
        .map(|ns_id| ns_id.to_string())
        .unwrap_or_else(|_| format!("github::commit:{}@{}", repo_full_name, commit.sha));

    let short_sha = commit.sha.chars().take(7).collect();

    Ok(Json(GitHubCommitResponse {
        id: commit_id,
        sha: commit.sha,
        short_sha,
        message: commit.commit.message,
        url: commit.html_url,
        author_name: commit.commit.author.name,
        author_email: commit.commit.author.email,
        author_login: commit.author.as_ref().map(|a| a.login.clone()),
        author_avatar_url: commit.author.as_ref().map(|a| a.avatar_url.clone()),
        repo_full_name,
        date: commit.commit.author.date,
    }))
}
