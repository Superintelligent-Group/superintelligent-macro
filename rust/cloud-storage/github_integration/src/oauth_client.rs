use std::time::Duration;

use crate::{
    config::GitHubConfig,
    error::{GitHubIntegrationError, Result},
    models::{
        GitHubBranch, GitHubCommit, GitHubEmail, GitHubExchangeTokenResponse, GitHubIssue,
        GitHubPullRequest, GitHubRelease, GitHubRepository, GitHubUserInfo,
    },
};

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

        if !user_response.status().is_success() {
            let error_body = user_response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());
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

        if !response.status().is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());
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

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

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

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

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

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

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
    ) -> Result<Vec<GitHubBranch>> {
        let mut url = format!(
            "https://api.github.com/repos/{}/{}/branches?",
            owner, repo
        );

        if let Some(per_page) = per_page {
            url.push_str(&format!("per_page={}&", per_page));
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

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

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
    ) -> Result<Vec<GitHubRelease>> {
        let mut url = format!(
            "https://api.github.com/repos/{}/{}/releases?",
            owner, repo
        );

        if let Some(per_page) = per_page {
            url.push_str(&format!("per_page={}&", per_page));
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

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "unknown error".to_string());

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
}

impl Default for GitHubOAuthClient {
    fn default() -> Self {
        Self::new()
    }
}
