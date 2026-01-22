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
use model_entity::github::github_release_id;

/// Default number of releases to return per page
const DEFAULT_RELEASES_PER_PAGE: u8 = 30;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct GetGitHubReleasesQuery {
    #[serde(default = "default_per_page")]
    pub per_page: u8,
    #[serde(default)]
    pub page: Option<u32>,
}

fn default_per_page() -> u8 {
    DEFAULT_RELEASES_PER_PAGE
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubReleaseResponse {
    /// Foreign entity ID: github::release:owner/repo@tag
    pub id: String,
    /// Tag name
    pub tag_name: String,
    /// Release name/title
    pub name: Option<String>,
    /// Whether this is a draft
    pub draft: bool,
    /// Whether this is a prerelease
    pub prerelease: bool,
    /// HTML URL to the release
    pub url: String,
    /// Author username
    pub author: String,
    /// Author avatar URL
    pub author_avatar_url: String,
    /// Repository full name (owner/repo)
    pub repo_full_name: String,
    /// When the release was created
    pub created_at: String,
    /// When the release was published
    pub published_at: Option<String>,
}

/// Lists releases for a repository
#[utoipa::path(
    get,
    operation_id = "list_github_releases",
    path = "/github/repos/{owner}/{repo}/releases",
    params(
        ("owner" = String, Path, description = "Repository owner"),
        ("repo" = String, Path, description = "Repository name"),
        GetGitHubReleasesQuery
    ),
    responses(
        (status = 200, body=Vec<GitHubReleaseResponse>),
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
    Query(query): Query<GetGitHubReleasesQuery>,
) -> Result<Json<Vec<GitHubReleaseResponse>>, GitHubIntegrationError> {
    tracing::info!("list_github_releases called");

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

    // Fetch releases
    let releases = oauth_client
        .list_releases(
            &credentials.access_token,
            &owner,
            &repo,
            Some(query.per_page),
            query.page,
        )
        .await?;

    // Convert to response format
    let repo_full_name = format!("{}/{}", owner, repo);
    let response: Vec<GitHubReleaseResponse> = releases
        .into_iter()
        .map(|release| {
            let release_id = github_release_id(&owner, &repo, &release.tag_name)
                .map(|ns_id| ns_id.to_string())
                .unwrap_or_else(|_| {
                    format!("github::release:{}@{}", repo_full_name, release.tag_name)
                });

            GitHubReleaseResponse {
                id: release_id,
                tag_name: release.tag_name,
                name: release.name,
                draft: release.draft,
                prerelease: release.prerelease,
                url: release.html_url,
                author: release.author.login,
                author_avatar_url: release.author.avatar_url,
                repo_full_name: repo_full_name.clone(),
                created_at: release.created_at,
                published_at: release.published_at,
            }
        })
        .collect();

    Ok(Json(response))
}

/// Gets a specific release by tag
#[utoipa::path(
    get,
    operation_id = "get_github_release",
    path = "/github/repos/{owner}/{repo}/releases/tags/{tag}",
    params(
        ("owner" = String, Path, description = "Repository owner"),
        ("repo" = String, Path, description = "Repository name"),
        ("tag" = String, Path, description = "Tag name"),
    ),
    responses(
        (status = 200, body=GitHubReleaseResponse),
        (status = 404, body=ErrorResponse, description = "Release not found"),
        (status = 403, body=ErrorResponse, description = "GitHub account not linked"),
        (status = 401, body=ErrorResponse, description = "Not authenticated"),
        (status = 500, body=ErrorResponse, description = "Server error"),
    )
)]
#[tracing::instrument(skip(ctx, user_context), err, fields(user_id=%user_context.user_id, fusion_user_id=%user_context.fusion_user_id))]
pub async fn get_handler(
    State(ctx): State<ApiContext>,
    user_context: Extension<UserContext>,
    Path((owner, repo, tag)): Path<(String, String, String)>,
) -> Result<Json<GitHubReleaseResponse>, GitHubIntegrationError> {
    tracing::info!("get_github_release called");

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

    // Fetch the specific release
    let release = oauth_client
        .get_release_by_tag(&credentials.access_token, &owner, &repo, &tag)
        .await?;

    let repo_full_name = format!("{}/{}", owner, repo);
    let release_id = github_release_id(&owner, &repo, &release.tag_name)
        .map(|ns_id| ns_id.to_string())
        .unwrap_or_else(|_| format!("github::release:{}@{}", repo_full_name, release.tag_name));

    Ok(Json(GitHubReleaseResponse {
        id: release_id,
        tag_name: release.tag_name,
        name: release.name,
        draft: release.draft,
        prerelease: release.prerelease,
        url: release.html_url,
        author: release.author.login,
        author_avatar_url: release.author.avatar_url,
        repo_full_name,
        created_at: release.created_at,
        published_at: release.published_at,
    }))
}
