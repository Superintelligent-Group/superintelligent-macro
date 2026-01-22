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
use model_entity::github::github_branch_id;

/// Default number of branches to return per page
const DEFAULT_BRANCHES_PER_PAGE: u8 = 30;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct GetGitHubBranchesQuery {
    #[serde(default = "default_per_page")]
    pub per_page: u8,
    #[serde(default)]
    pub page: Option<u32>,
}

fn default_per_page() -> u8 {
    DEFAULT_BRANCHES_PER_PAGE
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubBranchResponse {
    /// Foreign entity ID: github::branch:owner/repo:branch
    pub id: String,
    /// Branch name
    pub name: String,
    /// Latest commit SHA
    pub sha: String,
    /// Short SHA (first 7 characters)
    pub short_sha: String,
    /// Whether the branch is protected
    pub protected: bool,
    /// Repository full name (owner/repo)
    pub repo_full_name: String,
    /// HTML URL to the branch
    pub url: String,
}

/// Lists branches for a repository
#[utoipa::path(
    get,
    operation_id = "list_github_branches",
    path = "/github/repos/{owner}/{repo}/branches",
    params(
        ("owner" = String, Path, description = "Repository owner"),
        ("repo" = String, Path, description = "Repository name"),
        GetGitHubBranchesQuery
    ),
    responses(
        (status = 200, body=Vec<GitHubBranchResponse>),
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
    Query(query): Query<GetGitHubBranchesQuery>,
) -> Result<Json<Vec<GitHubBranchResponse>>, GitHubIntegrationError> {
    tracing::info!("list_github_branches called");

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

    // Fetch branches
    let branches = oauth_client
        .list_branches(
            &credentials.access_token,
            &owner,
            &repo,
            Some(query.per_page),
            query.page,
        )
        .await?;

    // Convert to response format
    let repo_full_name = format!("{}/{}", owner, repo);
    let response: Vec<GitHubBranchResponse> = branches
        .into_iter()
        .map(|branch| {
            let branch_id = github_branch_id(&owner, &repo, &branch.name)
                .map(|ns_id| ns_id.to_string())
                .unwrap_or_else(|_| format!("github::branch:{}:{}", repo_full_name, branch.name));

            let short_sha = branch.commit.sha.chars().take(7).collect();
            let url = format!(
                "https://github.com/{}/tree/{}",
                repo_full_name, branch.name
            );

            GitHubBranchResponse {
                id: branch_id,
                name: branch.name,
                sha: branch.commit.sha,
                short_sha,
                protected: branch.protected,
                repo_full_name: repo_full_name.clone(),
                url,
            }
        })
        .collect();

    Ok(Json(response))
}

/// Gets a specific branch
#[utoipa::path(
    get,
    operation_id = "get_github_branch",
    path = "/github/repos/{owner}/{repo}/branches/{branch}",
    params(
        ("owner" = String, Path, description = "Repository owner"),
        ("repo" = String, Path, description = "Repository name"),
        ("branch" = String, Path, description = "Branch name"),
    ),
    responses(
        (status = 200, body=GitHubBranchResponse),
        (status = 404, body=ErrorResponse, description = "Branch not found"),
        (status = 403, body=ErrorResponse, description = "GitHub account not linked"),
        (status = 401, body=ErrorResponse, description = "Not authenticated"),
        (status = 500, body=ErrorResponse, description = "Server error"),
    )
)]
#[tracing::instrument(skip(ctx, user_context), err, fields(user_id=%user_context.user_id, fusion_user_id=%user_context.fusion_user_id))]
pub async fn get_handler(
    State(ctx): State<ApiContext>,
    user_context: Extension<UserContext>,
    Path((owner, repo, branch_name)): Path<(String, String, String)>,
) -> Result<Json<GitHubBranchResponse>, GitHubIntegrationError> {
    tracing::info!("get_github_branch called");

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

    // Fetch the specific branch
    let branch = oauth_client
        .get_branch(&credentials.access_token, &owner, &repo, &branch_name)
        .await?;

    let repo_full_name = format!("{}/{}", owner, repo);
    let branch_id = github_branch_id(&owner, &repo, &branch.name)
        .map(|ns_id| ns_id.to_string())
        .unwrap_or_else(|_| format!("github::branch:{}:{}", repo_full_name, branch.name));

    let short_sha = branch.commit.sha.chars().take(7).collect();
    let url = format!(
        "https://github.com/{}/tree/{}",
        repo_full_name, branch.name
    );

    Ok(Json(GitHubBranchResponse {
        id: branch_id,
        name: branch.name,
        sha: branch.commit.sha,
        short_sha,
        protected: branch.protected,
        repo_full_name,
        url,
    }))
}
