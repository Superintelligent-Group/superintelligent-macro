use std::time::Duration;

use crate::{
    config::GitHubConfig,
    error::{GitHubIntegrationError, Result},
    models::{
        GitHubBranch, GitHubCommit, GitHubCommitSearchResult, GitHubEmail,
        GitHubExchangeTokenResponse, GitHubIssue, GitHubIssueSearchResult, GitHubPullRequest,
        GitHubRelease, GitHubRepoSearchResult, GitHubRepository, GitHubSearchResponse,
        GitHubUserInfo,
    },
};

/// Helper to check if a response status indicates an expired/invalid token
fn check_token_expired(status: reqwest::StatusCode, error_body: &str) -> Option<GitHubIntegrationError> {
    if status.as_u16() == 401 {
        tracing::warn!(error_body=%error_body, "GitHub token expired or invalid");
        Some(GitHubIntegrationError::TokenExpired)
    } else {
        None
    }
}

/// Low-level GitHub OAuth client
pub struct GitHubOAuthClient {
    http_client: reqwest::Client,
}

impl GitHubOAuthClient {
    /// Creates a new GitHub OAuth client
    pub fn new() -> Self {
        Self {
            http_client: reqwest::Client::new(),
        }
    }

    /// Constructs a GitHub OAuth authorization URL
    ///
    /// See: <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps>
    #[tracing::instrument(skip(self, config), err)]
    pub fn construct_authorize_url<T>(
        &self,
        config: &GitHubConfig,
        redirect_uri: &str,
        state: T,
    ) -> Result<String>
    where
        T: serde::Serialize + std::fmt::Debug,
    {
        let state_str = serde_json::to_string(&state)
            .map_err(|e| GitHubIntegrationError::Generic(anyhow::anyhow!("failed to serialize state: {}", e)))?;

        let url = format!(
            "https://github.com/login/oauth/authorize?client_id={}&redirect_uri={}&scope={}&state={}",
            config.client_id,
            urlencoding::encode(redirect_uri),
            urlencoding::encode("repo user:email"),
            urlencoding::encode(&state_str)
        );

        Ok(url)
    }

    /// Exchanges an authorization code for a GitHub access token
    ///
    /// See: <https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#2-users-are-redirected-back-to-your-site-by-github>
    #[tracing::instrument(skip(self, config, code), err)]
    pub async fn exchange_code_for_tokens(
        &self,
        config: &GitHubConfig,
        redirect_uri: &str,
        code: &str,
    ) -> Result<GitHubExchangeTokenResponse> {
        #[derive(serde::Serialize)]
        struct TokenRequest<'a> {
            client_id: &'a str,
            client_secret: &'a str,
            code: &'a str,
            redirect_uri: &'a str,
        }

        let token_request = TokenRequest {
            client_id: &config.client_id,
            client_secret: &config.client_secret,
            code,
            redirect_uri,
        };

        let response = self
            .http_client
            .post("https://github.com/login/oauth/access_token")
            .header("Accept", "application/json")
            .json(&token_request)
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| {
                tracing::error!(error=?e, "failed to send GitHub token request");
                GitHubIntegrationError::TokenExchangeFailed(e.to_string())
            })?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response.text().await.unwrap_or_else(|_| "unknown error".to_string());
            tracing::error!(status=?status, body=?error_body, "token exchange failed");
            return Err(GitHubIntegrationError::TokenExchangeFailed(format!(
                "status {}: {}",
                status, error_body
            )));
        }

        let token_response: GitHubExchangeTokenResponse = response.json().await.map_err(|e| {
            tracing::error!(error=?e, "failed to parse token response");
            GitHubIntegrationError::TokenExchangeFailed(e.to_string())
        })?;

        Ok(token_response)
    }

    /// Refreshes a GitHub access token using a refresh token
    ///
    /// This requires token expiration to be enabled in the GitHub App settings.
    /// See: <https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens>
    #[tracing::instrument(skip(self, config, refresh_token), err)]
    pub async fn refresh_access_token(
        &self,
        config: &GitHubConfig,
        refresh_token: &str,
    ) -> Result<GitHubExchangeTokenResponse> {
        #[derive(serde::Serialize)]
        struct RefreshRequest<'a> {
            client_id: &'a str,
            client_secret: &'a str,
            grant_type: &'a str,
            refresh_token: &'a str,
        }

        let refresh_request = RefreshRequest {
            client_id: &config.client_id,
            client_secret: &config.client_secret,
            grant_type: "refresh_token",
            refresh_token,
        };

        let response = self
            .http_client
            .post("https://github.com/login/oauth/access_token")
            .header("Accept", "application/json")
            .json(&refresh_request)
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| {
                tracing::error!(error=?e, "failed to send GitHub refresh token request");
                GitHubIntegrationError::TokenRefreshFailed(e.to_string())
            })?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response.text().await.unwrap_or_else(|_| "unknown error".to_string());
            tracing::error!(status=?status, body=?error_body, "token refresh failed");
            return Err(GitHubIntegrationError::TokenRefreshFailed(format!(
                "status {}: {}",
                status, error_body
            )));
        }

        let token_response: GitHubExchangeTokenResponse = response.json().await.map_err(|e| {
            tracing::error!(error=?e, "failed to parse refresh token response");
            GitHubIntegrationError::TokenRefreshFailed(e.to_string())
        })?;

        tracing::info!("successfully refreshed GitHub access token");

        Ok(token_response)
    }

    /// Gets user information from GitHub using an access token
    ///
    /// See: <https://docs.github.com/en/rest/users/users#get-the-authenticated-user>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn get_user_info(&self, access_token: &str) -> Result<GitHubUserInfo> {
        // Get basic user info
        let user_response = self
            .http_client
            .get("https://api.github.com/user")
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = user_response.status();

        if !status.is_success() {
            let error_body = user_response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            // Check for 401 Unauthorized - token expired or invalid
            if status.as_u16() == 401 {
                tracing::warn!(error_body=%error_body, "GitHub token expired or invalid");
                return Err(GitHubIntegrationError::TokenExpired);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to get user info: {}",
                error_body
            )));
        }

        let mut user_info: GitHubUserInfo = user_response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        // If email is not public, try to fetch from emails endpoint (optional)
        if user_info.email.is_none() {
            tracing::debug!("Email not in public profile, attempting to fetch from /user/emails");

            match self
                .http_client
                .get("https://api.github.com/user/emails")
                .header("Authorization", format!("Bearer {}", access_token))
                .header("User-Agent", "Macro-Auth-Service")
                .timeout(Duration::from_secs(30))
                .send()
                .await
            {
                Ok(emails_response) => {
                    let status = emails_response.status();
                    tracing::debug!(status=?status, "Received response from /user/emails");

                    if status.is_success() {
                        match emails_response.json::<Vec<GitHubEmail>>().await {
                            Ok(emails) => {
                                tracing::debug!(email_count=emails.len(), "Fetched emails from GitHub");

                                // Find the primary verified email
                                if let Some(primary_email) = emails
                                    .iter()
                                    .find(|e| e.primary && e.verified)
                                    .or_else(|| emails.iter().find(|e| e.verified))
                                {
                                    tracing::debug!(email=?primary_email.email, "Found verified email");
                                    user_info.email = Some(primary_email.email.clone());
                                } else {
                                    tracing::debug!("No verified email found in GitHub account");
                                }
                            }
                            Err(e) => {
                                tracing::debug!(error=?e, "Failed to parse emails response");
                            }
                        }
                    } else {
                        let error_body = emails_response.text().await.unwrap_or_default();
                        tracing::debug!(status=?status, error=?error_body, "Failed to fetch user emails from GitHub (non-critical)");
                    }
                }
                Err(e) => {
                    tracing::debug!(error=?e, "Failed to fetch user emails (non-critical)");
                }
            }
        } else {
            tracing::debug!(email=?user_info.email, "Email found in public profile");
        }

        Ok(user_info)
    }

    /// Lists repositories accessible to the authenticated user
    ///
    /// See: <https://docs.github.com/en/rest/repos/repos#list-repositories-for-the-authenticated-user>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn list_user_repositories(
        &self,
        access_token: &str,
        per_page: Option<u8>,
        sort: Option<&str>,
    ) -> Result<Vec<GitHubRepository>> {
        let mut url = "https://api.github.com/user/repos?".to_string();

        // Add query parameters
        if let Some(per_page) = per_page {
            url.push_str(&format!("per_page={}&", per_page));
        }
        if let Some(sort) = sort {
            url.push_str(&format!("sort={}&", sort));
        }

        // Remove trailing '&' or '?'
        url = url.trim_end_matches('&').trim_end_matches('?').to_string();

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            // Check for 401 Unauthorized - token expired or invalid
            if status.as_u16() == 401 {
                tracing::warn!(error_body=%error_body, "GitHub token expired or invalid");
                return Err(GitHubIntegrationError::TokenExpired);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to list repositories: {}",
                error_body
            )));
        }

        let repositories: Vec<GitHubRepository> = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(repositories)
    }

    /// Gets a specific repository by owner and name
    ///
    /// See: <https://docs.github.com/en/rest/repos/repos#get-a-repository>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn get_repository(
        &self,
        access_token: &str,
        owner: &str,
        repo: &str,
    ) -> Result<GitHubRepository> {
        let url = format!("https://api.github.com/repos/{}/{}", owner, repo);

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            // Check for 401 Unauthorized - token expired or invalid
            if status.as_u16() == 401 {
                tracing::warn!(error_body=%error_body, "GitHub token expired or invalid");
                return Err(GitHubIntegrationError::TokenExpired);
            }

            // Return specific error for 404
            if status.as_u16() == 404 {
                return Err(GitHubIntegrationError::RepositoryNotFound);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to get repository: {}",
                error_body
            )));
        }

        let repository: GitHubRepository = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(repository)
    }

    /// Lists pull requests for a repository
    ///
    /// See: <https://docs.github.com/en/rest/pulls/pulls#list-pull-requests>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn list_pull_requests(
        &self,
        access_token: &str,
        owner: &str,
        repo: &str,
        state: Option<&str>,
        per_page: Option<u8>,
        page: Option<u32>,
    ) -> Result<Vec<GitHubPullRequest>> {
        let mut url = format!(
            "https://api.github.com/repos/{}/{}/pulls?",
            owner, repo
        );

        if let Some(state) = state {
            url.push_str(&format!("state={}&", state));
        }
        if let Some(per_page) = per_page {
            url.push_str(&format!("per_page={}&", per_page));
        }
        if let Some(page) = page {
            url.push_str(&format!("page={}&", page));
        }

        url = url.trim_end_matches('&').trim_end_matches('?').to_string();

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            if status.as_u16() == 404 {
                return Err(GitHubIntegrationError::RepositoryNotFound);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to list pull requests: {}",
                error_body
            )));
        }

        let prs: Vec<GitHubPullRequest> = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(prs)
    }

    /// Gets a specific pull request
    ///
    /// See: <https://docs.github.com/en/rest/pulls/pulls#get-a-pull-request>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn get_pull_request(
        &self,
        access_token: &str,
        owner: &str,
        repo: &str,
        number: u64,
    ) -> Result<GitHubPullRequest> {
        let url = format!(
            "https://api.github.com/repos/{}/{}/pulls/{}",
            owner, repo, number
        );

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            if status.as_u16() == 404 {
                return Err(GitHubIntegrationError::PullRequestNotFound);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to get pull request: {}",
                error_body
            )));
        }

        let pr: GitHubPullRequest = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(pr)
    }

    /// Lists issues for a repository
    ///
    /// See: <https://docs.github.com/en/rest/issues/issues#list-repository-issues>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn list_issues(
        &self,
        access_token: &str,
        owner: &str,
        repo: &str,
        state: Option<&str>,
        per_page: Option<u8>,
        page: Option<u32>,
    ) -> Result<Vec<GitHubIssue>> {
        let mut url = format!(
            "https://api.github.com/repos/{}/{}/issues?",
            owner, repo
        );

        if let Some(state) = state {
            url.push_str(&format!("state={}&", state));
        }
        if let Some(per_page) = per_page {
            url.push_str(&format!("per_page={}&", per_page));
        }
        if let Some(page) = page {
            url.push_str(&format!("page={}&", page));
        }

        url = url.trim_end_matches('&').trim_end_matches('?').to_string();

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            if status.as_u16() == 404 {
                return Err(GitHubIntegrationError::RepositoryNotFound);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to list issues: {}",
                error_body
            )));
        }

        let issues: Vec<GitHubIssue> = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        // Filter out pull requests (GitHub returns PRs in the issues endpoint)
        let issues: Vec<GitHubIssue> = issues
            .into_iter()
            .filter(|i| i.pull_request.is_none())
            .collect();

        Ok(issues)
    }

    /// Gets a specific issue
    ///
    /// See: <https://docs.github.com/en/rest/issues/issues#get-an-issue>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn get_issue(
        &self,
        access_token: &str,
        owner: &str,
        repo: &str,
        number: u64,
    ) -> Result<GitHubIssue> {
        let url = format!(
            "https://api.github.com/repos/{}/{}/issues/{}",
            owner, repo, number
        );

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            if status.as_u16() == 404 {
                return Err(GitHubIntegrationError::IssueNotFound);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to get issue: {}",
                error_body
            )));
        }

        let issue: GitHubIssue = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(issue)
    }

    /// Lists commits for a repository
    ///
    /// See: <https://docs.github.com/en/rest/commits/commits#list-commits>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn list_commits(
        &self,
        access_token: &str,
        owner: &str,
        repo: &str,
        sha: Option<&str>,
        per_page: Option<u8>,
        page: Option<u32>,
    ) -> Result<Vec<GitHubCommit>> {
        let mut url = format!(
            "https://api.github.com/repos/{}/{}/commits?",
            owner, repo
        );

        if let Some(sha) = sha {
            url.push_str(&format!("sha={}&", sha));
        }
        if let Some(per_page) = per_page {
            url.push_str(&format!("per_page={}&", per_page));
        }
        if let Some(page) = page {
            url.push_str(&format!("page={}&", page));
        }

        url = url.trim_end_matches('&').trim_end_matches('?').to_string();

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            if status.as_u16() == 404 {
                return Err(GitHubIntegrationError::RepositoryNotFound);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to list commits: {}",
                error_body
            )));
        }

        let commits: Vec<GitHubCommit> = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(commits)
    }

    /// Gets a specific commit
    ///
    /// See: <https://docs.github.com/en/rest/commits/commits#get-a-commit>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn get_commit(
        &self,
        access_token: &str,
        owner: &str,
        repo: &str,
        sha: &str,
    ) -> Result<GitHubCommit> {
        let url = format!(
            "https://api.github.com/repos/{}/{}/commits/{}",
            owner, repo, sha
        );

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            if status.as_u16() == 404 {
                return Err(GitHubIntegrationError::CommitNotFound);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to get commit: {}",
                error_body
            )));
        }

        let commit: GitHubCommit = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(commit)
    }

    /// Lists branches for a repository
    ///
    /// See: <https://docs.github.com/en/rest/branches/branches#list-branches>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn list_branches(
        &self,
        access_token: &str,
        owner: &str,
        repo: &str,
        per_page: Option<u8>,
        page: Option<u32>,
    ) -> Result<Vec<GitHubBranch>> {
        let mut url = format!(
            "https://api.github.com/repos/{}/{}/branches?",
            owner, repo
        );

        if let Some(per_page) = per_page {
            url.push_str(&format!("per_page={}&", per_page));
        }
        if let Some(page) = page {
            url.push_str(&format!("page={}&", page));
        }

        url = url.trim_end_matches('&').trim_end_matches('?').to_string();

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            if status.as_u16() == 404 {
                return Err(GitHubIntegrationError::RepositoryNotFound);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to list branches: {}",
                error_body
            )));
        }

        let branches: Vec<GitHubBranch> = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(branches)
    }

    /// Gets a specific branch
    ///
    /// See: <https://docs.github.com/en/rest/branches/branches#get-a-branch>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn get_branch(
        &self,
        access_token: &str,
        owner: &str,
        repo: &str,
        branch: &str,
    ) -> Result<GitHubBranch> {
        let url = format!(
            "https://api.github.com/repos/{}/{}/branches/{}",
            owner, repo, branch
        );

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            if status.as_u16() == 404 {
                return Err(GitHubIntegrationError::BranchNotFound);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to get branch: {}",
                error_body
            )));
        }

        let branch: GitHubBranch = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(branch)
    }

    /// Lists releases for a repository
    ///
    /// See: <https://docs.github.com/en/rest/releases/releases#list-releases>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn list_releases(
        &self,
        access_token: &str,
        owner: &str,
        repo: &str,
        per_page: Option<u8>,
        page: Option<u32>,
    ) -> Result<Vec<GitHubRelease>> {
        let mut url = format!(
            "https://api.github.com/repos/{}/{}/releases?",
            owner, repo
        );

        if let Some(per_page) = per_page {
            url.push_str(&format!("per_page={}&", per_page));
        }
        if let Some(page) = page {
            url.push_str(&format!("page={}&", page));
        }

        url = url.trim_end_matches('&').trim_end_matches('?').to_string();

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            if status.as_u16() == 404 {
                return Err(GitHubIntegrationError::RepositoryNotFound);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to list releases: {}",
                error_body
            )));
        }

        let releases: Vec<GitHubRelease> = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(releases)
    }

    /// Gets a specific release by tag
    ///
    /// See: <https://docs.github.com/en/rest/releases/releases#get-a-release-by-tag-name>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn get_release_by_tag(
        &self,
        access_token: &str,
        owner: &str,
        repo: &str,
        tag: &str,
    ) -> Result<GitHubRelease> {
        let url = format!(
            "https://api.github.com/repos/{}/{}/releases/tags/{}",
            owner, repo, tag
        );

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            if status.as_u16() == 404 {
                return Err(GitHubIntegrationError::ReleaseNotFound);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to get release: {}",
                error_body
            )));
        }

        let release: GitHubRelease = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(release)
    }

    // ============ Search Methods ============

    /// Searches repositories
    ///
    /// See: <https://docs.github.com/en/rest/search/search#search-repositories>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn search_repositories(
        &self,
        access_token: &str,
        query: &str,
        per_page: Option<u8>,
    ) -> Result<GitHubSearchResponse<GitHubRepoSearchResult>> {
        let per_page = per_page.unwrap_or(30);
        let url = format!(
            "https://api.github.com/search/repositories?q={}&per_page={}",
            urlencoding::encode(query),
            per_page
        );

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to search repositories: {}",
                error_body
            )));
        }

        let results: GitHubSearchResponse<GitHubRepoSearchResult> = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(results)
    }

    /// Searches issues and pull requests
    ///
    /// See: <https://docs.github.com/en/rest/search/search#search-issues-and-pull-requests>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn search_issues(
        &self,
        access_token: &str,
        query: &str,
        per_page: Option<u8>,
    ) -> Result<GitHubSearchResponse<GitHubIssueSearchResult>> {
        let per_page = per_page.unwrap_or(30);
        let url = format!(
            "https://api.github.com/search/issues?q={}&per_page={}",
            urlencoding::encode(query),
            per_page
        );

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to search issues: {}",
                error_body
            )));
        }

        let results: GitHubSearchResponse<GitHubIssueSearchResult> = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(results)
    }

    /// Searches commits
    ///
    /// See: <https://docs.github.com/en/rest/search/search#search-commits>
    #[tracing::instrument(skip(self, access_token), err)]
    pub async fn search_commits(
        &self,
        access_token: &str,
        query: &str,
        per_page: Option<u8>,
    ) -> Result<GitHubSearchResponse<GitHubCommitSearchResult>> {
        let per_page = per_page.unwrap_or(30);
        let url = format!(
            "https://api.github.com/search/commits?q={}&per_page={}",
            urlencoding::encode(query),
            per_page
        );

        let response = self
            .http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "Macro-Auth-Service")
            // Commit search requires this preview header
            .header("Accept", "application/vnd.github.cloak-preview+json")
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        let status = response.status();

        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

            if let Some(err) = check_token_expired(status, &error_body) {
                return Err(err);
            }

            return Err(GitHubIntegrationError::UserInfoFailed(format!(
                "failed to search commits: {}",
                error_body
            )));
        }

        let results: GitHubSearchResponse<GitHubCommitSearchResult> = response
            .json()
            .await
            .map_err(|e| GitHubIntegrationError::UserInfoFailed(e.to_string()))?;

        Ok(results)
    }
}

impl Default for GitHubOAuthClient {
    fn default() -> Self {
        Self::new()
    }
}
