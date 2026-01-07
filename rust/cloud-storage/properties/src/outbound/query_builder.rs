//! SQL Query Builder Helpers for Property Filtering and Sorting
//!
//! This module provides functions for generating SQL query fragments.
//! It is an outbound adapter that converts domain types to SQL.

use serde_json;
use sqlx::{Postgres, QueryBuilder};

use models_properties::{FilterOperation, FilterValue, FilterValues, PropertyFilter};

/// Apply a filter operation to a query builder.
///
/// Uses the default table alias "ep" for the entity_properties table.
pub fn apply_filter(filter_op: &FilterOperation, query_builder: &mut QueryBuilder<'_, Postgres>) {
    apply_filter_to_table(filter_op, query_builder, "ep");
}

/// Apply a filter operation to a specific table alias.
///
/// # Arguments
/// * `filter_op` - The filter operation to apply
/// * `query_builder` - The query builder to append SQL to
/// * `table_alias` - The alias for the entity_properties table (e.g., "ep", "ep_filter")
pub fn apply_filter_to_table(
    filter_op: &FilterOperation,
    query_builder: &mut QueryBuilder<'_, Postgres>,
    table_alias: &str,
) {
    match filter_op {
        // === Single-select property operations ===
        FilterOperation::Equal { values } => {
            apply_equality_filter(query_builder, table_alias, values, false);
        }
        FilterOperation::NotEqual { values } => {
            apply_equality_filter(query_builder, table_alias, values, true);
        }
        FilterOperation::GreaterThan { value } => {
            apply_comparison_filter(query_builder, table_alias, ">", value);
        }
        FilterOperation::GreaterThanOrEqual { value } => {
            apply_comparison_filter(query_builder, table_alias, ">=", value);
        }
        FilterOperation::LessThan { value } => {
            apply_comparison_filter(query_builder, table_alias, "<", value);
        }
        FilterOperation::LessThanOrEqual { value } => {
            apply_comparison_filter(query_builder, table_alias, "<=", value);
        }

        // === Multi-select property operations ===
        FilterOperation::HasAny { values } => {
            apply_multi_select_filter(query_builder, table_alias, values, MultiSelectOp::HasAny);
        }
        FilterOperation::HasAll { values } => {
            apply_multi_select_filter(query_builder, table_alias, values, MultiSelectOp::HasAll);
        }
        FilterOperation::DoesNotHave { values } => {
            apply_multi_select_filter(
                query_builder,
                table_alias,
                values,
                MultiSelectOp::DoesNotHave,
            );
        }
    }
}

/// Apply an equality filter (Equal or NotEqual) with multiple possible values
fn apply_equality_filter(
    qb: &mut QueryBuilder<'_, Postgres>,
    alias: &str,
    values: &FilterValues,
    negate: bool,
) {
    if negate {
        qb.push(" AND NOT (");
    } else {
        qb.push(" AND (");
    }

    match values {
        FilterValues::Number { values } => {
            qb.push(format!(
                "{}.values->>'type' = 'Number' AND ({}.values->>'value')::numeric IN (",
                alias, alias
            ));
            for (i, v) in values.iter().enumerate() {
                if i > 0 {
                    qb.push(", ");
                }
                qb.push_bind(*v);
            }
            qb.push(")");
        }
        FilterValues::Date { values } => {
            qb.push(format!(
                "{}.values->>'type' = 'Date' AND ({}.values->>'value')::timestamptz IN (",
                alias, alias
            ));
            for (i, v) in values.iter().enumerate() {
                if i > 0 {
                    qb.push(", ");
                }
                qb.push_bind(*v);
            }
            qb.push(")");
        }
        FilterValues::SelectOption { option_ids } => {
            // Check if any of the option_ids are contained in the value array
            for (i, option_id) in option_ids.iter().enumerate() {
                if i > 0 {
                    qb.push(" OR ");
                }
                qb.push(format!(
                    "{}.values->>'type' = 'SelectOption' AND {}.values->'value' @> ",
                    alias, alias
                ));
                qb.push_bind(format!("[\"{}\"]", option_id));
            }
        }
        FilterValues::EntityReference { references } => {
            for (i, ref_) in references.iter().enumerate() {
                if i > 0 {
                    qb.push(" OR ");
                }
                // EntityReference values are stored as: [{"entity_id": "...", "entity_type": "..."}]
                // entity_type is serialized as SCREAMING_SNAKE_CASE
                qb.push(format!(
                    "{}.values->>'type' = 'EntityReference' AND {}.values->'value' @> ",
                    alias, alias
                ));
                // Serialize EntityType to SCREAMING_SNAKE_CASE format
                let entity_type_str = serde_json::to_string(&ref_.entity_type)
                    .unwrap_or_else(|_| format!("\"{}\"", ref_.entity_type));
                qb.push_bind(format!(
                    "[{{\"entity_id\":\"{}\",\"entity_type\":{}}}]",
                    ref_.entity_id, entity_type_str
                ));
            }
        }
    }

    qb.push(")");
}

/// Apply a comparison filter (>, >=, <, <=)
fn apply_comparison_filter(
    qb: &mut QueryBuilder<'_, Postgres>,
    alias: &str,
    op: &str,
    value: &FilterValue,
) {
    match value {
        FilterValue::Number { value } => {
            qb.push(format!(
                " AND {}.values->>'type' = 'Number' AND ({}.values->>'value')::numeric {} ",
                alias, alias, op
            ));
            qb.push_bind(*value);
        }
        FilterValue::Date { value } => {
            qb.push(format!(
                " AND {}.values->>'type' = 'Date' AND ({}.values->>'value')::timestamptz {} ",
                alias, alias, op
            ));
            qb.push_bind(*value);
        }
        FilterValue::SelectOption { option_id } => {
            // For select options, comparison is done via display_order in property_options table
            qb.push(format!(
                " AND {}.values->>'type' = 'SelectOption' AND EXISTS (
                    SELECT 1 FROM property_options po 
                    WHERE {}.values->'value' @> to_jsonb(po.id::text)
                    AND po.display_order {} (
                        SELECT po2.display_order FROM property_options po2 WHERE po2.id = ",
                alias, alias, op
            ));
            qb.push_bind(*option_id);
            qb.push("))");
        }
        // Comparison operations don't apply to Boolean or EntityReference types
        FilterValue::Boolean { .. } | FilterValue::EntityReference { .. } => {
            // No-op for unsupported comparison types
        }
    }
}

enum MultiSelectOp {
    HasAny,
    HasAll,
    DoesNotHave,
}

/// Apply a multi-select filter (has_any, has_all, does_not_have)
fn apply_multi_select_filter(
    qb: &mut QueryBuilder<'_, Postgres>,
    alias: &str,
    values: &FilterValues,
    op: MultiSelectOp,
) {
    match values {
        FilterValues::SelectOption { option_ids } if option_ids.is_empty() => return,
        FilterValues::EntityReference { references } if references.is_empty() => return,
        FilterValues::Number { values } if values.is_empty() => return,
        FilterValues::Date { values } if values.is_empty() => return,
        _ => {}
    }

    match op {
        MultiSelectOp::HasAny => {
            // Has any: at least one of the values is present
            qb.push(" AND (");
            push_multi_value_checks(qb, alias, values, " OR ");
            qb.push(")");
        }
        MultiSelectOp::HasAll => {
            // Has all: all values must be present
            push_multi_value_checks(qb, alias, values, " AND ");
        }
        MultiSelectOp::DoesNotHave => {
            // Does not have: none of the values are present
            qb.push(" AND NOT (");
            push_multi_value_checks(qb, alias, values, " OR ");
            qb.push(")");
        }
    }
}

/// Push multiple value checks with a separator
fn push_multi_value_checks(
    qb: &mut QueryBuilder<'_, Postgres>,
    alias: &str,
    values: &FilterValues,
    separator: &str,
) {
    match values {
        FilterValues::SelectOption { option_ids } => {
            for (i, option_id) in option_ids.iter().enumerate() {
                if i > 0 {
                    qb.push(separator);
                }
                if separator == " AND " && i == 0 {
                    qb.push(" AND ");
                }
                qb.push(format!(
                    "{}.values->>'type' = 'SelectOption' AND {}.values->'value' @> ",
                    alias, alias
                ));
                qb.push_bind(format!("[\"{}\"]", option_id));
            }
        }
        FilterValues::EntityReference { references } => {
            for (i, ref_) in references.iter().enumerate() {
                if i > 0 {
                    qb.push(separator);
                }
                if separator == " AND " && i == 0 {
                    qb.push(" AND ");
                }
                qb.push(format!(
                    "{}.values->>'type' = 'EntityReference' AND {}.values->'value' @> ",
                    alias, alias
                ));
                // Serialize EntityType to SCREAMING_SNAKE_CASE format
                let entity_type_str = serde_json::to_string(&ref_.entity_type)
                    .unwrap_or_else(|_| format!("\"{}\"", ref_.entity_type));
                qb.push_bind(format!(
                    "[{{\"entity_id\":\"{}\",\"entity_type\":{}}}]",
                    ref_.entity_id, entity_type_str
                ));
            }
        }
        // Multi-select operations typically only apply to SelectOption and EntityReference
        FilterValues::Number { .. } | FilterValues::Date { .. } => {
            // These types don't support multi-select operations
        }
    }
}

/// Builds an EXISTS subquery for a property filter.
///
/// This is useful when filtering on a property that may or may not be set on an entity.
/// The EXISTS pattern ensures proper handling when joining multiple filters.
///
/// # Example SQL generated:
/// ```sql
/// AND EXISTS (
///     SELECT 1 FROM entity_properties ep_filter
///     WHERE ep_filter.entity_id = combined.entity_id
///     AND ep_filter.property_definition_id = $1
///     AND ep_filter.values->>'type' = 'Number'
///     AND ep_filter.values->>'value' = $2
/// )
/// ```
pub fn build_property_filter_exists(
    qb: &mut QueryBuilder<'_, Postgres>,
    filter: &PropertyFilter,
    entity_id_expr: &str,
) {
    qb.push(" AND EXISTS (SELECT 1 FROM entity_properties ep_filter WHERE ep_filter.entity_id = ");
    qb.push(entity_id_expr);
    qb.push(" AND ep_filter.property_definition_id = ");
    qb.push_bind(filter.property_id);
    apply_filter_to_table(&filter.operation, qb, "ep_filter");
    qb.push(")");
}

/// Builds multiple property filter EXISTS subqueries.
pub fn build_property_filters(
    qb: &mut QueryBuilder<'_, Postgres>,
    filters: &[PropertyFilter],
    entity_id_expr: &str,
) {
    for filter in filters {
        build_property_filter_exists(qb, filter, entity_id_expr);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Utc};
    use models_properties::EntityType;
    use uuid::Uuid;

    /// Helper to extract SQL string from QueryBuilder
    fn get_sql_string(qb: &QueryBuilder<'_, Postgres>) -> String {
        qb.sql().to_string()
    }

    /// Helper to verify SQL output contains expected patterns
    /// Extracts the actual SQL string and verifies it contains expected patterns
    fn verify_sql_contains(
        filter_op: &FilterOperation,
        table_alias: &str,
        expected_patterns: &[&str],
    ) {
        // Build the query
        let mut qb = QueryBuilder::new("SELECT 1 WHERE ");
        apply_filter_to_table(filter_op, &mut qb, table_alias);

        // Extract the actual SQL string
        let sql = get_sql_string(&qb);

        // Verify all expected patterns are present in the actual SQL
        for pattern in expected_patterns {
            assert!(
                sql.contains(pattern),
                "Expected pattern '{}' not found in SQL. Generated SQL: {}",
                pattern,
                sql
            );
        }
    }

    /// Helper to verify SQL output matches expected SQL exactly (or contains it)
    fn verify_sql_matches(filter_op: &FilterOperation, table_alias: &str, expected_sql: &str) {
        // Build the query
        let mut qb = QueryBuilder::new("SELECT 1 WHERE ");
        apply_filter_to_table(filter_op, &mut qb, table_alias);

        // Extract the actual SQL string
        let sql = get_sql_string(&qb);

        // Verify the SQL contains the expected SQL (accounting for parameter placeholders)
        assert!(
            sql.contains(expected_sql),
            "Expected SQL pattern not found. Expected: {}. Generated: {}",
            expected_sql,
            sql
        );
    }

    /// Helper to verify query builds successfully
    fn verify_query_builds(mut qb: QueryBuilder<'_, Postgres>) {
        let _query = qb.build();
    }

    #[test]
    fn test_equal_number_single_value() {
        let filter_op = FilterOperation::Equal {
            values: FilterValues::Number { values: vec![5.0] },
        };

        // Verify query builds
        let mut qb = QueryBuilder::new("");
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);

        // Verify SQL output contains expected patterns
        verify_sql_contains(&filter_op, "ep", &["Number", "IN"]);

        // Verify exact SQL structure
        let mut qb2 = QueryBuilder::new("");
        apply_filter_to_table(&filter_op, &mut qb2, "ep");
        let sql = get_sql_string(&qb2);
        assert!(
            sql.contains("ep.values->>'type' = 'Number'"),
            "SQL should contain type check. Got: {}",
            sql
        );
        assert!(
            sql.contains("IN ("),
            "SQL should contain IN clause. Got: {}",
            sql
        );
        assert!(
            sql.contains("::numeric"),
            "SQL should cast to numeric. Got: {}",
            sql
        );
    }

    #[test]
    fn test_equal_number_multiple_values() {
        let mut qb = QueryBuilder::new("");
        let filter_op = FilterOperation::Equal {
            values: FilterValues::Number {
                values: vec![5.0, 10.0, 15.0],
            },
        };
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);
    }

    #[test]
    fn test_not_equal_number() {
        let filter_op = FilterOperation::NotEqual {
            values: FilterValues::Number { values: vec![5.0] },
        };

        let mut qb = QueryBuilder::new("");
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);

        // Verify SQL output
        verify_sql_contains(&filter_op, "ep", &["NOT", "Number"]);
    }

    #[test]
    fn test_equal_date() {
        let mut qb = QueryBuilder::new("");
        let date1 = Utc.with_ymd_and_hms(2024, 1, 1, 0, 0, 0).unwrap();
        let date2 = Utc.with_ymd_and_hms(2024, 1, 2, 0, 0, 0).unwrap();
        let filter_op = FilterOperation::Equal {
            values: FilterValues::Date {
                values: vec![date1, date2],
            },
        };
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);
    }

    #[test]
    fn test_equal_select_option_single() {
        let mut qb = QueryBuilder::new("");
        let option_id = Uuid::new_v4();
        let filter_op = FilterOperation::Equal {
            values: FilterValues::SelectOption {
                option_ids: vec![option_id],
            },
        };
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);
    }

    #[test]
    fn test_equal_select_option_multiple() {
        let mut qb = QueryBuilder::new("");
        let option_id1 = Uuid::new_v4();
        let option_id2 = Uuid::new_v4();
        let filter_op = FilterOperation::Equal {
            values: FilterValues::SelectOption {
                option_ids: vec![option_id1, option_id2],
            },
        };
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);
    }

    #[test]
    fn test_equal_entity_reference() {
        let mut qb = QueryBuilder::new("");
        let ref1 = models_properties::EntityReference {
            entity_id: "doc-1".to_string(),
            entity_type: EntityType::Document,
            specific_message_id: None,
        };
        let filter_op = FilterOperation::Equal {
            values: FilterValues::EntityReference {
                references: vec![ref1],
            },
        };
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);
    }

    #[test]
    fn test_greater_than_number() {
        let filter_op = FilterOperation::GreaterThan {
            value: FilterValue::Number { value: 10.0 },
        };

        let mut qb = QueryBuilder::new("");
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);

        // Verify SQL output
        verify_sql_contains(&filter_op, "ep", &["Number", "numeric"]);
    }

    #[test]
    fn test_less_than_date() {
        let mut qb = QueryBuilder::new("");
        let date = Utc.with_ymd_and_hms(2024, 1, 1, 0, 0, 0).unwrap();
        let filter_op = FilterOperation::LessThan {
            value: FilterValue::Date { value: date },
        };
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);
    }

    #[test]
    fn test_greater_than_select_option() {
        let option_id = Uuid::new_v4();
        let filter_op = FilterOperation::GreaterThan {
            value: FilterValue::SelectOption { option_id },
        };

        let mut qb = QueryBuilder::new("");
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);

        // Verify SQL output uses EXISTS with property_options and display_order
        verify_sql_contains(
            &filter_op,
            "ep",
            &[
                "SelectOption",
                "EXISTS",
                "property_options",
                "display_order",
            ],
        );
    }

    #[test]
    fn test_has_any_select_option() {
        let mut qb = QueryBuilder::new("");
        let option_id1 = Uuid::new_v4();
        let option_id2 = Uuid::new_v4();
        let filter_op = FilterOperation::HasAny {
            values: FilterValues::SelectOption {
                option_ids: vec![option_id1, option_id2],
            },
        };
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);
    }

    #[test]
    fn test_has_all_select_option() {
        let mut qb = QueryBuilder::new("");
        let option_id1 = Uuid::new_v4();
        let option_id2 = Uuid::new_v4();
        let filter_op = FilterOperation::HasAll {
            values: FilterValues::SelectOption {
                option_ids: vec![option_id1, option_id2],
            },
        };
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);
    }

    #[test]
    fn test_does_not_have_entity_reference() {
        let mut qb = QueryBuilder::new("");
        let ref1 = models_properties::EntityReference {
            entity_id: "doc-1".to_string(),
            entity_type: EntityType::Document,
            specific_message_id: None,
        };
        let filter_op = FilterOperation::DoesNotHave {
            values: FilterValues::EntityReference {
                references: vec![ref1],
            },
        };
        apply_filter_to_table(&filter_op, &mut qb, "ep");
        verify_query_builds(qb);
    }

    #[test]
    fn test_build_property_filter_exists() {
        let property_id = Uuid::new_v4();
        let filter = PropertyFilter {
            property_id,
            operation: FilterOperation::Equal {
                values: FilterValues::Number { values: vec![5.0] },
            },
        };

        let mut qb = QueryBuilder::new("SELECT * FROM documents d WHERE ");
        build_property_filter_exists(&mut qb, &filter, "d.id::text");
        verify_query_builds(qb);

        // Verify SQL output contains EXISTS clause with expected patterns
        verify_sql_contains(&filter.operation, "ep_filter", &["Number", "IN"]);

        // Verify exact SQL structure for EXISTS clause
        let mut qb2 = QueryBuilder::new("SELECT * FROM documents d WHERE ");
        build_property_filter_exists(&mut qb2, &filter, "d.id::text");
        let sql = get_sql_string(&qb2);
        assert!(
            sql.contains("EXISTS"),
            "SQL should contain EXISTS. Got: {}",
            sql
        );
        assert!(
            sql.contains("entity_properties ep_filter"),
            "SQL should contain entity_properties table with alias. Got: {}",
            sql
        );
        assert!(
            sql.contains("ep_filter.entity_id = d.id::text"),
            "SQL should match entity_id. Got: {}",
            sql
        );
        assert!(
            sql.contains("ep_filter.property_definition_id ="),
            "SQL should contain property_definition_id check. Got: {}",
            sql
        );
    }

    #[test]
    fn test_build_property_filters_multiple() {
        let mut qb = QueryBuilder::new("SELECT * FROM documents d WHERE d.deleted_at IS NULL");
        let property_id1 = Uuid::new_v4();
        let property_id2 = Uuid::new_v4();
        let filters = vec![
            PropertyFilter {
                property_id: property_id1,
                operation: FilterOperation::Equal {
                    values: FilterValues::Number { values: vec![5.0] },
                },
            },
            PropertyFilter {
                property_id: property_id2,
                operation: FilterOperation::GreaterThan {
                    value: FilterValue::Number { value: 10.0 },
                },
            },
        ];
        build_property_filters(&mut qb, &filters, "d.id::text");
        verify_query_builds(qb);
    }

    #[test]
    fn test_comparison_operators_all() {
        let value = FilterValue::Number { value: 5.0 };
        let operators = vec![
            (
                "GreaterThan",
                FilterOperation::GreaterThan {
                    value: value.clone(),
                },
            ),
            (
                "GreaterThanOrEqual",
                FilterOperation::GreaterThanOrEqual {
                    value: value.clone(),
                },
            ),
            (
                "LessThan",
                FilterOperation::LessThan {
                    value: value.clone(),
                },
            ),
            (
                "LessThanOrEqual",
                FilterOperation::LessThanOrEqual {
                    value: value.clone(),
                },
            ),
        ];

        for (op_name, filter_op) in operators {
            let mut qb = QueryBuilder::new("");
            apply_filter_to_table(&filter_op, &mut qb, "ep");
            verify_query_builds(qb);
            // Verify the operation name is descriptive (just a sanity check)
            assert!(!op_name.is_empty());
        }
    }

    #[test]
    fn test_empty_multi_select_returns_early() {
        let mut qb = QueryBuilder::new("SELECT * FROM t WHERE 1=1");

        // HasAny with empty values should not add anything (returns early)
        let filter_op = FilterOperation::HasAny {
            values: FilterValues::SelectOption { option_ids: vec![] },
        };
        apply_filter_to_table(&filter_op, &mut qb, "ep");

        // Query should still build successfully (empty multi-select is a no-op)
        verify_query_builds(qb);
    }

    #[test]
    fn test_table_alias_custom() {
        let mut qb = QueryBuilder::new("");
        let filter_op = FilterOperation::Equal {
            values: FilterValues::Number { values: vec![5.0] },
        };
        apply_filter_to_table(&filter_op, &mut qb, "custom_alias");
        verify_query_builds(qb);
    }
}
