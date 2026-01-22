use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// GitHub OAuth token exchange response
#[derive(Debug, Deserialize)]
pub struct GitHubExchangeTokenResponse {
    /// The access token for GitHub API calls
    pub access_token: String,
    /// The type of token (usually "bearer")
    pub token_type: String,
    /// The scopes granted to this token
    pub scope: String,
}

/// GitHub user information retrieved from GitHub API
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubUserInfo {
    /// GitHub user ID (numeric)
    pub id: u64,
    /// GitHub username
    pub login: String,
    /// Primary email (may be null if private)
    pub email: Option<String>,
    /// Display name
    pub name: Option<String>,
}

/// GitHub email information from /user/emails endpoint
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct GitHubEmail {
    pub email: String,
    pub primary: bool,
    pub verified: bool,
}

/// GitHub repository owner information
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubOwner {
    /// GitHub username
    pub login: String,
    /// Avatar URL
    pub avatar_url: String,
}

/// GitHub repository information from GitHub API
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubRepository {
    /// GitHub repository ID (numeric)
    pub id: i64,
    /// Repository name (without owner)
    pub name: String,
    /// Full repository name (owner/repo)
    pub full_name: String,
    /// Repository owner
    pub owner: GitHubOwner,
    /// Repository description
    pub description: Option<String>,
    /// Whether the repository is private
    pub private: bool,
    /// HTML URL to the repository
    pub html_url: String,
    /// When the repository was last updated
    pub updated_at: String,
    /// Number of stars
    pub stargazers_count: i32,
}

/// GitHub user reference (used in PRs, issues, etc.)
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubUser {
    /// GitHub username
    pub login: String,
    /// Avatar URL
    pub avatar_url: String,
}

/// GitHub label
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubLabel {
    /// Label name
    pub name: String,
    /// Label color (hex)
    pub color: String,
}

/// GitHub pull request information from GitHub API
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubPullRequest {
    /// PR number
    pub number: u64,
    /// PR title
    pub title: String,
    /// PR state (open, closed)
    pub state: String,
    /// Whether the PR is a draft
    #[serde(default)]
    pub draft: bool,
    /// Whether the PR is merged
    #[serde(default)]
    pub merged: bool,
    /// HTML URL to the PR
    pub html_url: String,
    /// PR author
    pub user: GitHubUser,
    /// When the PR was created
    pub created_at: String,
    /// When the PR was last updated
    pub updated_at: String,
    /// Labels
    #[serde(default)]
    pub labels: Vec<GitHubLabel>,
    /// Head branch ref
    pub head: GitHubPullRequestRef,
    /// Base branch ref
    pub base: GitHubPullRequestRef,
}

/// GitHub pull request ref (head/base branch info)
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubPullRequestRef {
    /// Branch name
    #[serde(rename = "ref")]
    pub ref_name: String,
    /// Commit SHA
    pub sha: String,
}

/// GitHub issue information from GitHub API
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubIssue {
    /// Issue number
    pub number: u64,
    /// Issue title
    pub title: String,
    /// Issue state (open, closed)
    pub state: String,
    /// HTML URL to the issue
    pub html_url: String,
    /// Issue author
    pub user: GitHubUser,
    /// When the issue was created
    pub created_at: String,
    /// When the issue was last updated
    pub updated_at: String,
    /// Labels
    #[serde(default)]
    pub labels: Vec<GitHubLabel>,
    /// Pull request info (if this is a PR, this will be present)
    pub pull_request: Option<serde_json::Value>,
}

/// GitHub commit information from GitHub API
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubCommit {
    /// Commit SHA
    pub sha: String,
    /// HTML URL to the commit
    pub html_url: String,
    /// Commit details
    pub commit: GitHubCommitDetails,
    /// Author user info (may be null for non-GitHub users)
    pub author: Option<GitHubUser>,
    /// Committer user info (may be null for non-GitHub users)
    pub committer: Option<GitHubUser>,
}

/// GitHub commit details
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubCommitDetails {
    /// Commit message
    pub message: String,
    /// Author info
    pub author: GitHubCommitAuthor,
    /// Committer info
    pub committer: GitHubCommitAuthor,
}

/// GitHub commit author/committer info
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubCommitAuthor {
    /// Author name
    pub name: String,
    /// Author email
    pub email: String,
    /// Date of the commit
    pub date: String,
}

/// GitHub branch information from GitHub API
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubBranch {
    /// Branch name
    pub name: String,
    /// Branch commit info
    pub commit: GitHubBranchCommit,
    /// Whether this is a protected branch
    #[serde(default)]
    pub protected: bool,
}

/// GitHub branch commit reference
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubBranchCommit {
    /// Commit SHA
    pub sha: String,
    /// URL to fetch commit details
    pub url: String,
}

/// GitHub release information from GitHub API
#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubRelease {
    /// Release ID
    pub id: i64,
    /// Tag name
    pub tag_name: String,
    /// Release name/title
    pub name: Option<String>,
    /// Whether this is a draft
    pub draft: bool,
    /// Whether this is a prerelease
    pub prerelease: bool,
    /// HTML URL to the release
    pub html_url: String,
    /// Release author
    pub author: GitHubUser,
    /// When the release was created
    pub created_at: String,
    /// When the release was published
    pub published_at: Option<String>,
}

/// Response returned when retrieving GitHub credentials
#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubCredentialsResponse {
    /// The OAuth access token
    pub access_token: String,
    /// GitHub username
    pub github_username: String,
    /// GitHub user ID
    pub github_user_id: String,
}

/// GitHub link information for listing
#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct GitHubLinkInfo {
    /// The link ID
    pub id: String,
    /// GitHub username
    pub github_username: String,
    /// GitHub user ID
    pub github_user_id: String,
    /// When the link was created
    pub created_at: DateTime<Utc>,
}

/// OAuth state passed through the authorization flow
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OAuthState {
    /// FusionAuth identity provider ID
    pub identity_provider_id: String,
    /// Link ID for tracking the OAuth flow (present for integration, absent for login)
    pub link_id: Option<String>,
    /// Original URL to redirect to after OAuth
    pub original_url: Option<String>,
    /// Whether this is a mobile OAuth flow
    pub is_mobile: Option<bool>,
}

/// A GitHub link record (as stored in the database)
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct GitHubLink {
    /// Unique ID for this link
    pub id: Uuid,
    /// Macro user ID
    pub macro_id: String,
    /// FusionAuth user ID
    pub fusionauth_user_id: Uuid,
    /// GitHub username
    pub github_username: String,
    /// GitHub user ID (as string)
    pub github_user_id: String,
    /// When the link was created
    pub created_at: DateTime<Utc>,
    /// When the link was last updated
    pub updated_at: DateTime<Utc>,
}

impl From<GitHubLink> for GitHubLinkInfo {
    fn from(link: GitHubLink) -> Self {
        GitHubLinkInfo {
            id: link.id.to_string(),
            github_username: link.github_username,
            github_user_id: link.github_user_id,
            created_at: link.created_at,
        }
    }
}

// ============ GitHub Search API Models ============

/// GitHub search response wrapper
#[derive(Debug, Deserialize)]
pub struct GitHubSearchResponse<T> {
    /// Total count of results
    pub total_count: u64,
    /// Whether the results are incomplete
    pub incomplete_results: bool,
    /// The search results
    pub items: Vec<T>,
}

/// GitHub repository search result
#[derive(Debug, Deserialize)]
pub struct GitHubRepoSearchResult {
    /// GitHub repository ID (numeric)
    pub id: i64,
    /// Repository name (without owner)
    pub name: String,
    /// Full repository name (owner/repo)
    pub full_name: String,
    /// Repository owner
    pub owner: GitHubOwner,
    /// Repository description
    pub description: Option<String>,
    /// Whether the repository is private
    pub private: bool,
    /// HTML URL to the repository
    pub html_url: String,
    /// When the repository was last updated
    pub updated_at: String,
}

/// GitHub issue/PR search result
#[derive(Debug, Deserialize)]
pub struct GitHubIssueSearchResult {
    /// Issue/PR number
    pub number: u64,
    /// Issue/PR title
    pub title: String,
    /// Issue/PR state (open, closed)
    pub state: String,
    /// HTML URL
    pub html_url: String,
    /// Author
    pub user: GitHubUser,
    /// When created
    pub created_at: String,
    /// When last updated
    pub updated_at: String,
    /// Labels
    #[serde(default)]
    pub labels: Vec<GitHubLabel>,
    /// Pull request info (present if this is a PR)
    pub pull_request: Option<GitHubPullRequestUrls>,
    /// Whether this PR is a draft (only present for PRs)
    #[serde(default)]
    pub draft: bool,
    /// Repository URL (used to extract repo info)
    pub repository_url: String,
}

/// GitHub PR URLs in search results
#[derive(Debug, Deserialize)]
pub struct GitHubPullRequestUrls {
    /// URL to the PR
    pub url: String,
    /// HTML URL
    pub html_url: String,
    /// Merged at timestamp (if merged)
    pub merged_at: Option<String>,
}

/// GitHub commit search result
#[derive(Debug, Deserialize)]
pub struct GitHubCommitSearchResult {
    /// Commit SHA
    pub sha: String,
    /// HTML URL to the commit
    pub html_url: String,
    /// Commit details
    pub commit: GitHubCommitDetails,
    /// Author user info (may be null for non-GitHub users)
    pub author: Option<GitHubUser>,
    /// Repository info
    pub repository: GitHubSearchCommitRepo,
}

/// Repository info in commit search results
#[derive(Debug, Deserialize)]
pub struct GitHubSearchCommitRepo {
    /// Full repository name (owner/repo)
    pub full_name: String,
}
