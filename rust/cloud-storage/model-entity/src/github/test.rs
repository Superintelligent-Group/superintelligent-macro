use super::*;

#[test]
fn test_github_repo_id() {
    let ns_id = github_repo_id("octocat", "hello-world").unwrap();
    assert_eq!(ns_id.to_string(), "github::repo:octocat/hello-world");
    assert_eq!(ns_id.namespace(), "github");
    assert_eq!(ns_id.path(), &["github", "repo"]);
    assert_eq!(ns_id.identifier(), "octocat/hello-world");
}

#[test]
fn test_github_repo_id_with_special_chars() {
    let ns_id = github_repo_id("my-org", "my-repo_123").unwrap();
    assert_eq!(ns_id.to_string(), "github::repo:my-org/my-repo_123");
}

#[test]
fn test_parse_github_repo_id() {
    let ns_id = NamespacedIdentifier::parse("github::repo:octocat/hello-world").unwrap();
    let (owner, repo) = parse_github_repo_id(&ns_id).unwrap();
    assert_eq!(owner, "octocat");
    assert_eq!(repo, "hello-world");
}

#[test]
fn test_parse_github_repo_id_invalid_namespace() {
    let ns_id = NamespacedIdentifier::parse("discord::channel:123456").unwrap();
    assert!(parse_github_repo_id(&ns_id).is_none());
}

#[test]
fn test_parse_github_repo_id_invalid_format() {
    let ns_id = NamespacedIdentifier::parse("github::repo:invalid").unwrap();
    assert!(parse_github_repo_id(&ns_id).is_none());
}

#[test]
fn test_parse_github_repo_id_with_slashes() {
    // Handle edge case where repo name might contain extra slashes (though GitHub doesn't allow this)
    let ns_id = NamespacedIdentifier::parse("github::repo:owner/repo/extra").unwrap();
    let (owner, repo) = parse_github_repo_id(&ns_id).unwrap();
    assert_eq!(owner, "owner");
    assert_eq!(repo, "repo/extra");
}

// PR tests
#[test]
fn test_github_pr_id() {
    let ns_id = github_pr_id("octocat", "hello-world", 123).unwrap();
    assert_eq!(ns_id.to_string(), "github::pr:octocat/hello-world#123");
}

#[test]
fn test_parse_github_pr_id() {
    let ns_id = NamespacedIdentifier::parse("github::pr:octocat/hello-world#123").unwrap();
    let (owner, repo, number) = parse_github_pr_id(&ns_id).unwrap();
    assert_eq!(owner, "octocat");
    assert_eq!(repo, "hello-world");
    assert_eq!(number, 123);
}

// Issue tests
#[test]
fn test_github_issue_id() {
    let ns_id = github_issue_id("octocat", "hello-world", 42).unwrap();
    assert_eq!(ns_id.to_string(), "github::issue:octocat/hello-world#42");
}

#[test]
fn test_parse_github_issue_id() {
    let ns_id = NamespacedIdentifier::parse("github::issue:octocat/hello-world#42").unwrap();
    let (owner, repo, number) = parse_github_issue_id(&ns_id).unwrap();
    assert_eq!(owner, "octocat");
    assert_eq!(repo, "hello-world");
    assert_eq!(number, 42);
}

// Commit tests
#[test]
fn test_github_commit_id() {
    let ns_id = github_commit_id("octocat", "hello-world", "abc123def").unwrap();
    assert_eq!(
        ns_id.to_string(),
        "github::commit:octocat/hello-world@abc123def"
    );
}

#[test]
fn test_parse_github_commit_id() {
    let ns_id =
        NamespacedIdentifier::parse("github::commit:octocat/hello-world@abc123def").unwrap();
    let (owner, repo, sha) = parse_github_commit_id(&ns_id).unwrap();
    assert_eq!(owner, "octocat");
    assert_eq!(repo, "hello-world");
    assert_eq!(sha, "abc123def");
}

// Branch tests
#[test]
fn test_github_branch_id() {
    let ns_id = github_branch_id("octocat", "hello-world", "main").unwrap();
    assert_eq!(ns_id.to_string(), "github::branch:octocat/hello-world:main");
}

#[test]
fn test_parse_github_branch_id() {
    let ns_id = NamespacedIdentifier::parse("github::branch:octocat/hello-world:main").unwrap();
    let (owner, repo, branch) = parse_github_branch_id(&ns_id).unwrap();
    assert_eq!(owner, "octocat");
    assert_eq!(repo, "hello-world");
    assert_eq!(branch, "main");
}

#[test]
fn test_github_branch_id_with_slashes() {
    let ns_id = github_branch_id("octocat", "hello-world", "feature/my-feature").unwrap();
    assert_eq!(
        ns_id.to_string(),
        "github::branch:octocat/hello-world:feature/my-feature"
    );
}

#[test]
fn test_parse_github_branch_id_with_slashes() {
    let ns_id =
        NamespacedIdentifier::parse("github::branch:octocat/hello-world:feature/my-feature")
            .unwrap();
    let (owner, repo, branch) = parse_github_branch_id(&ns_id).unwrap();
    assert_eq!(owner, "octocat");
    assert_eq!(repo, "hello-world");
    assert_eq!(branch, "feature/my-feature");
}

// Release tests
#[test]
fn test_github_release_id() {
    let ns_id = github_release_id("octocat", "hello-world", "v1.0.0").unwrap();
    assert_eq!(
        ns_id.to_string(),
        "github::release:octocat/hello-world@v1.0.0"
    );
}

#[test]
fn test_parse_github_release_id() {
    let ns_id = NamespacedIdentifier::parse("github::release:octocat/hello-world@v1.0.0").unwrap();
    let (owner, repo, tag) = parse_github_release_id(&ns_id).unwrap();
    assert_eq!(owner, "octocat");
    assert_eq!(repo, "hello-world");
    assert_eq!(tag, "v1.0.0");
}
