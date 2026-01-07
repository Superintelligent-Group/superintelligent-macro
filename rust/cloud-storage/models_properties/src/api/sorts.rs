//! Property Sort Types
//!
//! This module defines sorting structures for ordering entities by their property values.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Sort configuration for property-based ordering.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(utoipa::ToSchema, schemars::JsonSchema))]
pub struct PropertySort {
    /// ID of the property definition to sort by
    pub property_id: Uuid,
    /// Sort direction
    pub direction: SortDirection,
}

/// Sort direction for property ordering.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
#[cfg_attr(feature = "schema", derive(utoipa::ToSchema, schemars::JsonSchema))]
pub enum SortDirection {
    /// Ascending order (smallest first)
    Asc,
    /// Descending order (largest first)
    Desc,
}
