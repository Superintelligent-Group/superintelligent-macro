//! Property Filter Types for API Requests
//!
//! This module defines filter structures for querying entities by their property values.
//! These types are used in API requests (e.g., soup endpoint).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::shared::EntityReference;

/// Filter criteria for property values.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "schema", derive(utoipa::ToSchema, schemars::JsonSchema))]
pub struct PropertyFilter {
    /// ID of the property definition to filter by
    pub property_id: Uuid,
    /// Filter operation with embedded value(s)
    pub operation: FilterOperation,
}

/// Filter operation types with embedded values.
///
/// ## Single-select property operations
/// - `Equal`: Matches any of the provided values
/// - `NotEqual`: Does not match any of the provided values
/// - `GreaterThan`: Greater than (DATE, NUMBER, SELECT only)
/// - `GreaterThanOrEqual`: Greater than or equal (DATE, NUMBER, SELECT only)
/// - `LessThan`: Less than (DATE, NUMBER, SELECT only)
/// - `LessThanOrEqual`: Less than or equal (DATE, NUMBER, SELECT only)
///
/// ## Multi-select property operations
/// - `HasAny`: Has any of the specified values
/// - `HasAll`: Has all of the specified values
/// - `DoesNotHave`: Does not have any of the specified values
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "operation")]
#[cfg_attr(feature = "schema", derive(utoipa::ToSchema, schemars::JsonSchema))]
pub enum FilterOperation {
    // === Single-select property operations ===
    /// Matches any of the provided values
    Equal { values: FilterValues },
    /// Does not match any of the provided values
    NotEqual { values: FilterValues },
    /// Greater than the provided value (DATE, NUMBER, SELECT only)
    GreaterThan { value: FilterValue },
    /// Greater than or equal to the provided value (DATE, NUMBER, SELECT only)
    GreaterThanOrEqual { value: FilterValue },
    /// Less than the provided value (DATE, NUMBER, SELECT only)
    LessThan { value: FilterValue },
    /// Less than or equal to the provided value (DATE, NUMBER, SELECT only)
    LessThanOrEqual { value: FilterValue },

    // === Multi-select property operations ===
    /// Has any of the specified values
    HasAny { values: FilterValues },
    /// Has all of the specified values
    HasAll { values: FilterValues },
    /// Does not have any of the specified values
    DoesNotHave { values: FilterValues },
}

/// Homogeneous collection of filter values (all must be same type).
///
/// Use this for operations that accept multiple values (Equal, NotEqual, HasAny, etc.)
/// to ensure type safety at the API level.
///
/// Note: STRING and LINK property types are not filterable.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type")]
#[cfg_attr(feature = "schema", derive(utoipa::ToSchema, schemars::JsonSchema))]
pub enum FilterValues {
    /// Multiple date/time values
    Date { values: Vec<DateTime<Utc>> },
    /// Multiple numeric values
    Number { values: Vec<f64> },
    /// Multiple select option IDs (for SELECT_STRING or SELECT_NUMBER properties)
    SelectOption { option_ids: Vec<Uuid> },
    /// Multiple entity references (for ENTITY properties)
    EntityReference { references: Vec<EntityReference> },
}

/// Single filter value for comparison operations.
///
/// Use this for operations that compare against a single value (GreaterThan, LessThan, etc.)
///
/// Note: STRING and LINK property types are not filterable.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type")]
#[cfg_attr(feature = "schema", derive(utoipa::ToSchema, schemars::JsonSchema))]
pub enum FilterValue {
    /// Boolean true/false value
    Boolean { value: bool },
    /// Date and time value
    Date { value: DateTime<Utc> },
    /// Numeric value
    Number { value: f64 },
    /// Select option by ID (for SELECT_STRING or SELECT_NUMBER properties)
    SelectOption { option_id: Uuid },
    /// Entity reference (for ENTITY properties)
    EntityReference { reference: EntityReference },
}
