//! Sync module for keeping GitHub Issues and PRs in sync with foreign entities
//!
//! This module provides functions to create and delete foreign entities when
//! GitHub issues and pull requests are created, updated, or deleted.

use foreign_entity_db_client::ForeignEntity;
use model_entity::NamespacedIdentifier;
use sqlx::PgPool;

use crate::models::{GitHubIssue, GitHubPullRequest};

/// Creates a namespaced identifier for a GitHub issue
///
/// Format: `github::issue:owner/repo#number`
pub fn issue_namespaced_id(owner: &str, repo: &str, number: u64) -> NamespacedIdentifier {
    NamespacedIdentifier::new(
        vec!["github".to_string(), "issue".to_string()],
        format!("{}/{}#{}", owner, repo, number),
    )
    .expect("valid namespaced identifier for issue")
}

/// Creates a namespaced identifier for a GitHub pull request
///
/// Format: `github::pr:owner/repo#number`
pub fn pr_namespaced_id(owner: &str, repo: &str, number: u64) -> NamespacedIdentifier {
    NamespacedIdentifier::new(
        vec!["github".to_string(), "pr".to_string()],
        format!("{}/{}#{}", owner, repo, number),
    )
    .expect("valid namespaced identifier for PR")
}

/// Syncs a GitHub issue to a foreign entity
///
/// Creates the foreign entity if it doesn't exist.
/// Returns the foreign entity (existing or newly created).
#[tracing::instrument(skip(db), err)]
pub async fn sync_issue(
    db: &PgPool,
    owner: &str,
    repo: &str,
    issue: &GitHubIssue,
) -> anyhow::Result<ForeignEntity> {
    let ns_id = issue_namespaced_id(owner, repo, issue.number);
    let entity = foreign_entity_db_client::get_or_create(db, ns_id).await?;

    tracing::info!(
        entity_id = %entity.id,
        issue_number = issue.number,
        "synced GitHub issue to foreign entity"
    );

    Ok(entity)
}

/// Syncs a GitHub pull request to a foreign entity
///
/// Creates the foreign entity if it doesn't exist.
/// Returns the foreign entity (existing or newly created).
#[tracing::instrument(skip(db), err)]
pub async fn sync_pull_request(
    db: &PgPool,
    owner: &str,
    repo: &str,
    pr: &GitHubPullRequest,
) -> anyhow::Result<ForeignEntity> {
    let ns_id = pr_namespaced_id(owner, repo, pr.number);
    let entity = foreign_entity_db_client::get_or_create(db, ns_id).await?;

    tracing::info!(
        entity_id = %entity.id,
        pr_number = pr.number,
        "synced GitHub PR to foreign entity"
    );

    Ok(entity)
}

/// Deletes the foreign entity for a GitHub issue
///
/// Returns true if the entity was deleted, false if it didn't exist.
#[tracing::instrument(skip(db), err)]
pub async fn delete_issue(db: &PgPool, owner: &str, repo: &str, number: u64) -> anyhow::Result<bool> {
    let ns_id = issue_namespaced_id(owner, repo, number);

    let entity = foreign_entity_db_client::get_by_namespaced_identifier(db, &ns_id).await?;

    if let Some(entity) = entity {
        let deleted = foreign_entity_db_client::delete(db, entity.id).await?;
        tracing::info!(
            entity_id = %entity.id,
            issue_number = number,
            "deleted foreign entity for GitHub issue"
        );
        Ok(deleted)
    } else {
        tracing::debug!(issue_number = number, "no foreign entity found for GitHub issue");
        Ok(false)
    }
}

/// Deletes the foreign entity for a GitHub pull request
///
/// Returns true if the entity was deleted, false if it didn't exist.
#[tracing::instrument(skip(db), err)]
pub async fn delete_pull_request(
    db: &PgPool,
    owner: &str,
    repo: &str,
    number: u64,
) -> anyhow::Result<bool> {
    let ns_id = pr_namespaced_id(owner, repo, number);

    let entity = foreign_entity_db_client::get_by_namespaced_identifier(db, &ns_id).await?;

    if let Some(entity) = entity {
        let deleted = foreign_entity_db_client::delete(db, entity.id).await?;
        tracing::info!(
            entity_id = %entity.id,
            pr_number = number,
            "deleted foreign entity for GitHub PR"
        );
        Ok(deleted)
    } else {
        tracing::debug!(pr_number = number, "no foreign entity found for GitHub PR");
        Ok(false)
    }
}

/// Syncs all issues from a repository to foreign entities
///
/// This fetches all issues (both open and closed) and creates foreign entities for them.
/// Useful for initial sync when a repository is first connected.
#[tracing::instrument(skip(db, oauth_client, access_token), err)]
pub async fn sync_all_issues(
    db: &PgPool,
    oauth_client: &crate::oauth_client::GitHubOAuthClient,
    access_token: &str,
    owner: &str,
    repo: &str,
) -> anyhow::Result<Vec<ForeignEntity>> {
    let mut all_entities = Vec::new();
    let mut page = 1u32;

    loop {
        let issues = oauth_client
            .list_issues(access_token, owner, repo, Some("all"), Some(100), Some(page))
            .await?;

        if issues.is_empty() {
            break;
        }

        for issue in &issues {
            let entity = sync_issue(db, owner, repo, issue).await?;
            all_entities.push(entity);
        }

        page += 1;
    }

    tracing::info!(
        count = all_entities.len(),
        owner = owner,
        repo = repo,
        "synced all issues from repository"
    );

    Ok(all_entities)
}

/// Syncs all pull requests from a repository to foreign entities
///
/// This fetches all PRs (both open and closed) and creates foreign entities for them.
/// Useful for initial sync when a repository is first connected.
#[tracing::instrument(skip(db, oauth_client, access_token), err)]
pub async fn sync_all_pull_requests(
    db: &PgPool,
    oauth_client: &crate::oauth_client::GitHubOAuthClient,
    access_token: &str,
    owner: &str,
    repo: &str,
) -> anyhow::Result<Vec<ForeignEntity>> {
    let mut all_entities = Vec::new();
    let mut page = 1u32;

    loop {
        let prs = oauth_client
            .list_pull_requests(access_token, owner, repo, Some("all"), Some(100), Some(page))
            .await?;

        if prs.is_empty() {
            break;
        }

        for pr in &prs {
            let entity = sync_pull_request(db, owner, repo, pr).await?;
            all_entities.push(entity);
        }

        page += 1;
    }

    tracing::info!(
        count = all_entities.len(),
        owner = owner,
        repo = repo,
        "synced all PRs from repository"
    );

    Ok(all_entities)
}

/// Syncs all issues and pull requests from a repository
///
/// Combines `sync_all_issues` and `sync_all_pull_requests` for convenience.
#[tracing::instrument(skip(db, oauth_client, access_token), err)]
pub async fn sync_repository(
    db: &PgPool,
    oauth_client: &crate::oauth_client::GitHubOAuthClient,
    access_token: &str,
    owner: &str,
    repo: &str,
) -> anyhow::Result<(Vec<ForeignEntity>, Vec<ForeignEntity>)> {
    let issues = sync_all_issues(db, oauth_client, access_token, owner, repo).await?;
    let prs = sync_all_pull_requests(db, oauth_client, access_token, owner, repo).await?;

    Ok((issues, prs))
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_issue_namespaced_id() {
        let ns_id = issue_namespaced_id("octocat", "hello-world", 42);
        assert_eq!(ns_id.to_string(), "github::issue:octocat/hello-world#42");
    }

    #[test]
    fn test_pr_namespaced_id() {
        let ns_id = pr_namespaced_id("octocat", "hello-world", 123);
        assert_eq!(ns_id.to_string(), "github::pr:octocat/hello-world#123");
    }
}
