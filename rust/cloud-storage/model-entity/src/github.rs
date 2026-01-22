//! GitHub-related constants and utilities for foreign entities

use crate::NamespacedIdentifier;

/// GitHub namespace prefix
pub const GITHUB_NAMESPACE: &str = "github";

/// GitHub repository type
pub const GITHUB_REPO_TYPE: &str = "repo";

/// GitHub pull request type
pub const GITHUB_PR_TYPE: &str = "pr";

/// GitHub issue type
pub const GITHUB_ISSUE_TYPE: &str = "issue";

/// GitHub commit type
pub const GITHUB_COMMIT_TYPE: &str = "commit";

/// GitHub branch type
pub const GITHUB_BRANCH_TYPE: &str = "branch";

/// GitHub release type
pub const GITHUB_RELEASE_TYPE: &str = "release";

/// Creates a namespaced identifier for a GitHub repository
///
/// # Examples
///
/// ```
/// use model_entity::github::github_repo_id;
///
/// let ns_id = github_repo_id("octocat", "hello-world").unwrap();
/// assert_eq!(ns_id.to_string(), "github::repo:octocat/hello-world");
/// ```
pub fn github_repo_id(owner: &str, repo: &str) -> Result<NamespacedIdentifier, crate::NamespacedIdentifierError> {
    NamespacedIdentifier::new(
        vec![GITHUB_NAMESPACE.to_string(), GITHUB_REPO_TYPE.to_string()],
        format!("{}/{}", owner, repo),
    )
}

/// Parses a GitHub repository full name from a namespaced identifier
///
/// Returns (owner, repo) if the identifier is a valid GitHub repo ID
///
/// # Examples
///
/// ```
/// use model_entity::NamespacedIdentifier;
/// use model_entity::github::parse_github_repo_id;
///
/// let ns_id = NamespacedIdentifier::parse("github::repo:octocat/hello-world").unwrap();
/// let (owner, repo) = parse_github_repo_id(&ns_id).unwrap();
/// assert_eq!(owner, "octocat");
/// assert_eq!(repo, "hello-world");
/// ```
pub fn parse_github_repo_id(ns_id: &NamespacedIdentifier) -> Option<(String, String)> {
    let path = ns_id.path();

    // Check if it's a GitHub repo identifier
    if path.len() != 2 || path[0] != GITHUB_NAMESPACE || path[1] != GITHUB_REPO_TYPE {
        return None;
    }

    // Parse owner/repo from identifier
    let identifier = ns_id.identifier();
    let parts: Vec<&str> = identifier.splitn(2, '/').collect();

    if parts.len() != 2 {
        return None;
    }

    Some((parts[0].to_string(), parts[1].to_string()))
}

/// Creates a namespaced identifier for a GitHub pull request
///
/// # Examples
///
/// ```
/// use model_entity::github::github_pr_id;
///
/// let ns_id = github_pr_id("octocat", "hello-world", 123).unwrap();
/// assert_eq!(ns_id.to_string(), "github::pr:octocat/hello-world#123");
/// ```
pub fn github_pr_id(
    owner: &str,
    repo: &str,
    number: u64,
) -> Result<NamespacedIdentifier, crate::NamespacedIdentifierError> {
    NamespacedIdentifier::new(
        vec![GITHUB_NAMESPACE.to_string(), GITHUB_PR_TYPE.to_string()],
        format!("{}/{}#{}", owner, repo, number),
    )
}

/// Creates a namespaced identifier for a GitHub issue
///
/// # Examples
///
/// ```
/// use model_entity::github::github_issue_id;
///
/// let ns_id = github_issue_id("octocat", "hello-world", 42).unwrap();
/// assert_eq!(ns_id.to_string(), "github::issue:octocat/hello-world#42");
/// ```
pub fn github_issue_id(
    owner: &str,
    repo: &str,
    number: u64,
) -> Result<NamespacedIdentifier, crate::NamespacedIdentifierError> {
    NamespacedIdentifier::new(
        vec![GITHUB_NAMESPACE.to_string(), GITHUB_ISSUE_TYPE.to_string()],
        format!("{}/{}#{}", owner, repo, number),
    )
}

/// Creates a namespaced identifier for a GitHub commit
///
/// # Examples
///
/// ```
/// use model_entity::github::github_commit_id;
///
/// let ns_id = github_commit_id("octocat", "hello-world", "abc123def").unwrap();
/// assert_eq!(ns_id.to_string(), "github::commit:octocat/hello-world@abc123def");
/// ```
pub fn github_commit_id(
    owner: &str,
    repo: &str,
    sha: &str,
) -> Result<NamespacedIdentifier, crate::NamespacedIdentifierError> {
    NamespacedIdentifier::new(
        vec![GITHUB_NAMESPACE.to_string(), GITHUB_COMMIT_TYPE.to_string()],
        format!("{}/{}@{}", owner, repo, sha),
    )
}

/// Creates a namespaced identifier for a GitHub branch
///
/// # Examples
///
/// ```
/// use model_entity::github::github_branch_id;
///
/// let ns_id = github_branch_id("octocat", "hello-world", "main").unwrap();
/// assert_eq!(ns_id.to_string(), "github::branch:octocat/hello-world:main");
/// ```
pub fn github_branch_id(
    owner: &str,
    repo: &str,
    branch: &str,
) -> Result<NamespacedIdentifier, crate::NamespacedIdentifierError> {
    NamespacedIdentifier::new(
        vec![GITHUB_NAMESPACE.to_string(), GITHUB_BRANCH_TYPE.to_string()],
        format!("{}/{}:{}", owner, repo, branch),
    )
}

/// Creates a namespaced identifier for a GitHub release
///
/// # Examples
///
/// ```
/// use model_entity::github::github_release_id;
///
/// let ns_id = github_release_id("octocat", "hello-world", "v1.0.0").unwrap();
/// assert_eq!(ns_id.to_string(), "github::release:octocat/hello-world@v1.0.0");
/// ```
pub fn github_release_id(
    owner: &str,
    repo: &str,
    tag: &str,
) -> Result<NamespacedIdentifier, crate::NamespacedIdentifierError> {
    NamespacedIdentifier::new(
        vec![
            GITHUB_NAMESPACE.to_string(),
            GITHUB_RELEASE_TYPE.to_string(),
        ],
        format!("{}/{}@{}", owner, repo, tag),
    )
}

/// Parses a GitHub PR identifier
///
/// Returns (owner, repo, number) if the identifier is a valid GitHub PR ID
pub fn parse_github_pr_id(ns_id: &NamespacedIdentifier) -> Option<(String, String, u64)> {
    let path = ns_id.path();

    if path.len() != 2 || path[0] != GITHUB_NAMESPACE || path[1] != GITHUB_PR_TYPE {
        return None;
    }

    let identifier = ns_id.identifier();
    // Format: owner/repo#number
    let parts: Vec<&str> = identifier.splitn(2, '#').collect();
    if parts.len() != 2 {
        return None;
    }

    let repo_parts: Vec<&str> = parts[0].splitn(2, '/').collect();
    if repo_parts.len() != 2 {
        return None;
    }

    let number = parts[1].parse::<u64>().ok()?;
    Some((repo_parts[0].to_string(), repo_parts[1].to_string(), number))
}

/// Parses a GitHub issue identifier
///
/// Returns (owner, repo, number) if the identifier is a valid GitHub issue ID
pub fn parse_github_issue_id(ns_id: &NamespacedIdentifier) -> Option<(String, String, u64)> {
    let path = ns_id.path();

    if path.len() != 2 || path[0] != GITHUB_NAMESPACE || path[1] != GITHUB_ISSUE_TYPE {
        return None;
    }

    let identifier = ns_id.identifier();
    // Format: owner/repo#number
    let parts: Vec<&str> = identifier.splitn(2, '#').collect();
    if parts.len() != 2 {
        return None;
    }

    let repo_parts: Vec<&str> = parts[0].splitn(2, '/').collect();
    if repo_parts.len() != 2 {
        return None;
    }

    let number = parts[1].parse::<u64>().ok()?;
    Some((repo_parts[0].to_string(), repo_parts[1].to_string(), number))
}

/// Parses a GitHub commit identifier
///
/// Returns (owner, repo, sha) if the identifier is a valid GitHub commit ID
pub fn parse_github_commit_id(ns_id: &NamespacedIdentifier) -> Option<(String, String, String)> {
    let path = ns_id.path();

    if path.len() != 2 || path[0] != GITHUB_NAMESPACE || path[1] != GITHUB_COMMIT_TYPE {
        return None;
    }

    let identifier = ns_id.identifier();
    // Format: owner/repo@sha
    let parts: Vec<&str> = identifier.splitn(2, '@').collect();
    if parts.len() != 2 {
        return None;
    }

    let repo_parts: Vec<&str> = parts[0].splitn(2, '/').collect();
    if repo_parts.len() != 2 {
        return None;
    }

    Some((
        repo_parts[0].to_string(),
        repo_parts[1].to_string(),
        parts[1].to_string(),
    ))
}

/// Parses a GitHub branch identifier
///
/// Returns (owner, repo, branch) if the identifier is a valid GitHub branch ID
pub fn parse_github_branch_id(ns_id: &NamespacedIdentifier) -> Option<(String, String, String)> {
    let path = ns_id.path();

    if path.len() != 2 || path[0] != GITHUB_NAMESPACE || path[1] != GITHUB_BRANCH_TYPE {
        return None;
    }

    let identifier = ns_id.identifier();
    // Format: owner/repo:branch
    let parts: Vec<&str> = identifier.splitn(2, ':').collect();
    if parts.len() != 2 {
        return None;
    }

    let repo_parts: Vec<&str> = parts[0].splitn(2, '/').collect();
    if repo_parts.len() != 2 {
        return None;
    }

    Some((
        repo_parts[0].to_string(),
        repo_parts[1].to_string(),
        parts[1].to_string(),
    ))
}

/// Parses a GitHub release identifier
///
/// Returns (owner, repo, tag) if the identifier is a valid GitHub release ID
pub fn parse_github_release_id(ns_id: &NamespacedIdentifier) -> Option<(String, String, String)> {
    let path = ns_id.path();

    if path.len() != 2 || path[0] != GITHUB_NAMESPACE || path[1] != GITHUB_RELEASE_TYPE {
        return None;
    }

    let identifier = ns_id.identifier();
    // Format: owner/repo@tag
    let parts: Vec<&str> = identifier.splitn(2, '@').collect();
    if parts.len() != 2 {
        return None;
    }

    let repo_parts: Vec<&str> = parts[0].splitn(2, '/').collect();
    if repo_parts.len() != 2 {
        return None;
    }

    Some((
        repo_parts[0].to_string(),
        repo_parts[1].to_string(),
        parts[1].to_string(),
    ))
}

#[cfg(test)]
mod test;
