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
use model_entity::github::github_pr_id;

/// Default number of PRs to return per page
const DEFAULT_PRS_PER_PAGE: u8 = 30;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct GetGitHubPullsQuery {
    #[serde(default = "default_per_page")]
    pub per_page: u8,
    #[serde(default)]
    pub state: Option<String>,
}

fn default_per_page() -> u8 {
    DEFAULT_PRS_PER_PAGE
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubPullRequestResponse {
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
    /// When the PR was created
    pub created_at: String,
    /// When the PR was last updated
    pub updated_at: String,
    /// Head branch name
    pub head_branch: String,
    /// Base branch name
    pub base_branch: String,
}

/// Lists pull requests for a repository
#[utoipa::path(
    get,
    operation_id = "list_github_pulls",
    path = "/github/repos/{owner}/{repo}/pulls",
    params(
        ("owner" = String, Path, description = "Repository owner"),
        ("repo" = String, Path, description = "Repository name"),
        GetGitHubPullsQuery
    ),
    responses(
        (status = 200, body=Vec<GitHubPullRequestResponse>),
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
    Query(query): Query<GetGitHubPullsQuery>,
) -> Result<Json<Vec<GitHubPullRequestResponse>>, GitHubIntegrationError> {
    tracing::info!("list_github_pulls called");

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

    // Fetch PRs
    let prs = oauth_client
        .list_pull_requests(
            &credentials.access_token,
            &owner,
            &repo,
            query.state.as_deref(),
            Some(query.per_page),
        )
        .await?;

    // Convert to response format
    let repo_full_name = format!("{}/{}", owner, repo);
    let response: Vec<GitHubPullRequestResponse> = prs
        .into_iter()
        .map(|pr| {
            let pr_id = github_pr_id(&owner, &repo, pr.number)
                .map(|ns_id| ns_id.to_string())
                .unwrap_or_else(|_| format!("github::pr:{}#{}", repo_full_name, pr.number));

            GitHubPullRequestResponse {
                id: pr_id,
                number: pr.number,
                title: pr.title,
                state: pr.state,
                draft: pr.draft,
                merged: pr.merged,
                url: pr.html_url,
                author: pr.user.login,
                author_avatar_url: pr.user.avatar_url,
                repo_full_name: repo_full_name.clone(),
                created_at: pr.created_at,
                updated_at: pr.updated_at,
                head_branch: pr.head.ref_name,
                base_branch: pr.base.ref_name,
            }
        })
        .collect();

    Ok(Json(response))
}

/// Gets a specific pull request
#[utoipa::path(
    get,
    operation_id = "get_github_pull",
    path = "/github/repos/{owner}/{repo}/pulls/{number}",
    params(
        ("owner" = String, Path, description = "Repository owner"),
        ("repo" = String, Path, description = "Repository name"),
        ("number" = u64, Path, description = "Pull request number"),
    ),
    responses(
        (status = 200, body=GitHubPullRequestResponse),
        (status = 404, body=ErrorResponse, description = "Pull request not found"),
        (status = 403, body=ErrorResponse, description = "GitHub account not linked"),
        (status = 401, body=ErrorResponse, description = "Not authenticated"),
        (status = 500, body=ErrorResponse, description = "Server error"),
    )
)]
#[tracing::instrument(skip(ctx, user_context), err, fields(user_id=%user_context.user_id, fusion_user_id=%user_context.fusion_user_id))]
pub async fn get_handler(
    State(ctx): State<ApiContext>,
    user_context: Extension<UserContext>,
    Path((owner, repo, number)): Path<(String, String, u64)>,
) -> Result<Json<GitHubPullRequestResponse>, GitHubIntegrationError> {
    tracing::info!("get_github_pull called");

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

    // Fetch the specific PR
    let pr = oauth_client
        .get_pull_request(&credentials.access_token, &owner, &repo, number)
        .await?;

    let repo_full_name = format!("{}/{}", owner, repo);
    let pr_id = github_pr_id(&owner, &repo, pr.number)
        .map(|ns_id| ns_id.to_string())
        .unwrap_or_else(|_| format!("github::pr:{}#{}", repo_full_name, pr.number));

    Ok(Json(GitHubPullRequestResponse {
        id: pr_id,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        draft: pr.draft,
        merged: pr.merged,
        url: pr.html_url,
        author: pr.user.login,
        author_avatar_url: pr.user.avatar_url,
        repo_full_name,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        head_branch: pr.head.ref_name,
        base_branch: pr.base.ref_name,
    }))
}
