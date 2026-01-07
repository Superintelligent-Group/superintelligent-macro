//! Properties crate.
//!
//! Provides domain logic for property operations following hexagonal architecture.
//!
//! # Architecture
//!
//! This crate follows hexagonal architecture:
//! - `domain::ports` - Port definitions (traits/interfaces)
//! - `domain::service` - Service trait
//! - `domain::service_impl` - Service implementation
//! - `outbound` - Outbound adapters (e.g., PostgreSQL implementation)

pub mod domain;
pub mod outbound;

// Domain types - Filter & Sort
// Re-export from models_properties (API layer)
pub use models_properties::{
    FilterOperation, FilterValue, FilterValues, PropertyFilter, PropertySort, SortDirection,
};

// Domain types - Service
pub use domain::error::PropertiesErr;
pub use domain::ports::{NotificationService, PermissionService, PropertiesRepo};
pub use domain::service::PropertiesService;
pub use domain::service_impl::PropertiesServiceImpl;

// Outbound adapters
pub use outbound::notification_service::NotificationServiceImpl;
pub use outbound::permission_service::PermissionServiceImpl;
pub use outbound::properties_pg_repo::PropertiesPgRepo;
pub use outbound::query_builder::{build_property_filter_exists, build_property_filters};
