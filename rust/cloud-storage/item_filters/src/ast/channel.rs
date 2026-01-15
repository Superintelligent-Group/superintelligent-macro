use std::str::FromStr;

use filter_ast::{ExpandFrame, Expr, FoldTree, TryExpandNode};
use macro_user_id::{cowlike::CowLike, user_id::MacroUserIdStr};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{ChannelFilters, ast::ExpandErr};

/// Channel type filter
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
#[allow(missing_docs)]
pub enum ChannelTypeFilter {
    Public,
    Organization,
    Private,
    DirectMessage,
}

impl ChannelTypeFilter {
    /// String representation
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Public => "public",
            Self::Organization => "organization",
            Self::Private => "private",
            Self::DirectMessage => "direct_message",
        }
    }
}

impl FromStr for ChannelTypeFilter {
    type Err = InvalidChannelType;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "public" => Ok(Self::Public),
            "organization" => Ok(Self::Organization),
            "private" => Ok(Self::Private),
            "direct_message" => Ok(Self::DirectMessage),
            _ => Err(InvalidChannelType(s.to_owned())),
        }
    }
}

/// Invalid channel type error
#[derive(Debug, Clone)]
pub struct InvalidChannelType(pub String);

impl std::fmt::Display for InvalidChannelType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "invalid channel type '{}'", self.0)
    }
}

impl std::error::Error for InvalidChannelType {}

/// the possible literal values in a channel filter ast
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum ChannelLiteral {
    /// the thread id in which we want to find messages
    ThreadId(Uuid),
    /// the message mentions some user x
    Mention(MacroUserIdStr<'static>),
    /// the message is in some organization
    OrganizationId(i64),
    /// the message is in some channel id
    ChannelId(Uuid),
    /// the message comes from some sender x
    Sender(MacroUserIdStr<'static>),
    /// the channel is of a specific type
    ChannelType(ChannelTypeFilter),
}

impl ExpandFrame<ChannelLiteral> for ChannelFilters {
    type Err = ExpandErr;

    fn expand_ast(
        filter_request: ChannelFilters,
    ) -> Result<Option<Expr<ChannelLiteral>>, Self::Err> {
        let ChannelFilters {
            thread_ids,
            mentions,
            org_id,
            channel_ids,
            sender_ids,
            channel_types,
        } = filter_request;

        let thread_ids = thread_ids
            .iter()
            .map(|s| Uuid::parse_str(s))
            .try_expand(|r| r.map(ChannelLiteral::ThreadId), Expr::or)?;

        let mentions = mentions
            .iter()
            .map(|s| MacroUserIdStr::parse_from_str(s).map(CowLike::into_owned))
            .try_expand(|r| r.map(ChannelLiteral::Mention), Expr::or)?;

        let organizations = org_id
            .into_iter()
            .expand(ChannelLiteral::OrganizationId, Expr::or);

        let channel_ids = channel_ids
            .iter()
            .map(|s| Uuid::parse_str(s))
            .try_expand(|r| r.map(ChannelLiteral::ChannelId), Expr::or)?;

        let sender_ids = sender_ids
            .iter()
            .map(|s| MacroUserIdStr::parse_from_str(s).map(CowLike::into_owned))
            .try_expand(|r| r.map(ChannelLiteral::Sender), Expr::or)?;

        let channel_types = channel_types
            .iter()
            .map(|s| ChannelTypeFilter::from_str(s))
            .try_expand(|r| r.map(ChannelLiteral::ChannelType), Expr::or)?;

        Ok([
            thread_ids,
            mentions,
            organizations,
            channel_ids,
            sender_ids,
            channel_types,
        ]
        .into_iter()
        .fold_with(Expr::and))
    }
}
