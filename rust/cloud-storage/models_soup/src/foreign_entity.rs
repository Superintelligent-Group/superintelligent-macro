//! Foreign entity model for soup

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A foreign entity in soup - represents external entities like GitHub Issues, PRs, etc.
///
/// Foreign entities are "shells" that reference external data via a namespaced identifier.
/// The frontend resolves the actual data (title, state, etc.) by parsing the namespaced
/// identifier and fetching from the appropriate service.
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "schema", derive(utoipa::ToSchema))]
pub struct SoupForeignEntity {
    /// Unique identifier (UUID)
    pub id: Uuid,
    /// The full namespaced identifier (e.g., "github::issue:owner/repo#123")
    pub namespaced_identifier: String,
    /// The path segments (e.g., ["github", "issue"])
    pub path: Vec<String>,
    /// The identifier portion (e.g., "owner/repo#123")
    pub identifier: String,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last update timestamp
    pub updated_at: DateTime<Utc>,
    /// When the user last viewed this entity (if tracked)
    pub viewed_at: Option<DateTime<Utc>>,
}

impl SoupForeignEntity {
    /// Returns the entity type from the path (e.g., "issue", "pr", "repo")
    pub fn entity_subtype(&self) -> Option<&str> {
        self.path.get(1).map(|s| s.as_str())
    }

    /// Returns the namespace (e.g., "github", "discord")
    pub fn namespace(&self) -> Option<&str> {
        self.path.first().map(|s| s.as_str())
    }

    /// Returns true if this is a GitHub entity
    pub fn is_github(&self) -> bool {
        self.namespace() == Some("github")
    }
}
