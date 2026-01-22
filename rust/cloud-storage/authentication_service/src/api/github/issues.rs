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
use model_entity::github::github_issue_id;

/// Default number of issues to return per page
const DEFAULT_ISSUES_PER_PAGE: u8 = 30;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct GetGitHubIssuesQuery {
    #[serde(default = "default_per_page")]
    pub per_page: u8,
    #[serde(default)]
    pub state: Option<String>,
    #[serde(default)]
    pub page: Option<u32>,
}

fn default_per_page() -> u8 {
    DEFAULT_ISSUES_PER_PAGE
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubIssueResponse {
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
    /// When the issue was created
    pub created_at: String,
    /// When the issue was last updated
    pub updated_at: String,
    /// Labels
    pub labels: Vec<GitHubLabelResponse>,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubLabelResponse {
    /// Label name
    pub name: String,
    /// Label color (hex)
    pub color: String,
}

/// Lists issues for a repository
#[utoipa::path(
    get,
    operation_id = "list_github_issues",
    path = "/github/repos/{owner}/{repo}/issues",
    params(
        ("owner" = String, Path, description = "Repository owner"),
        ("repo" = String, Path, description = "Repository name"),
        GetGitHubIssuesQuery
    ),
    responses(
        (status = 200, body=Vec<GitHubIssueResponse>),
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
    Query(query): Query<GetGitHubIssuesQuery>,
) -> Result<Json<Vec<GitHubIssueResponse>>, GitHubIntegrationError> {
    tracing::info!("list_github_issues called");

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

    // Fetch issues
    let issues = oauth_client
        .list_issues(
            &credentials.access_token,
            &owner,
            &repo,
            query.state.as_deref(),
            Some(query.per_page),
            query.page,
        )
        .await?;

    // Convert to response format
    let repo_full_name = format!("{}/{}", owner, repo);
    let response: Vec<GitHubIssueResponse> = issues
        .into_iter()
        .map(|issue| {
            let issue_id = github_issue_id(&owner, &repo, issue.number)
                .map(|ns_id| ns_id.to_string())
                .unwrap_or_else(|_| format!("github::issue:{}#{}", repo_full_name, issue.number));

            GitHubIssueResponse {
                id: issue_id,
                number: issue.number,
                title: issue.title,
                state: issue.state,
                url: issue.html_url,
                author: issue.user.login,
                author_avatar_url: issue.user.avatar_url,
                repo_full_name: repo_full_name.clone(),
                created_at: issue.created_at,
                updated_at: issue.updated_at,
                labels: issue
                    .labels
                    .into_iter()
                    .map(|l| GitHubLabelResponse {
                        name: l.name,
                        color: l.color,
                    })
                    .collect(),
            }
        })
        .collect();

    Ok(Json(response))
}

/// Gets a specific issue
#[utoipa::path(
    get,
    operation_id = "get_github_issue",
    path = "/github/repos/{owner}/{repo}/issues/{number}",
    params(
        ("owner" = String, Path, description = "Repository owner"),
        ("repo" = String, Path, description = "Repository name"),
        ("number" = u64, Path, description = "Issue number"),
    ),
    responses(
        (status = 200, body=GitHubIssueResponse),
        (status = 404, body=ErrorResponse, description = "Issue not found"),
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
) -> Result<Json<GitHubIssueResponse>, GitHubIntegrationError> {
    tracing::info!("get_github_issue called");

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

    // Fetch the specific issue
    let issue = oauth_client
        .get_issue(&credentials.access_token, &owner, &repo, number)
        .await?;

    let repo_full_name = format!("{}/{}", owner, repo);
    let issue_id = github_issue_id(&owner, &repo, issue.number)
        .map(|ns_id| ns_id.to_string())
        .unwrap_or_else(|_| format!("github::issue:{}#{}", repo_full_name, issue.number));

    Ok(Json(GitHubIssueResponse {
        id: issue_id,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        author: issue.user.login,
        author_avatar_url: issue.user.avatar_url,
        repo_full_name,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        labels: issue
            .labels
            .into_iter()
            .map(|l| GitHubLabelResponse {
                name: l.name,
                color: l.color,
            })
            .collect(),
    }))
}
