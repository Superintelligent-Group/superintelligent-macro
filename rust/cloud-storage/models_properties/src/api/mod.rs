//! API layer types - external-facing request and response types.
//!
//! These structs represent the API contract with clients.
//! They use ToSchema for OpenAPI documentation and may use camelCase serialization.

pub mod error;
pub mod filters;
pub mod query_params;
pub mod requests;
pub mod responses;
pub mod sorts;

pub use error::*;
pub use filters::{FilterOperation, FilterValue, FilterValues, PropertyFilter};
pub use query_params::*;
pub use requests::*;
pub use responses::*;
pub use sorts::{PropertySort, SortDirection};
