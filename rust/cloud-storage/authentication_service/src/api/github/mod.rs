pub mod branches;
pub mod callback;
pub mod commits;
pub mod disconnect;
pub mod get_credentials;
pub mod get_repo;
pub mod init;
pub mod issues;
pub mod list;
pub mod pulls;
pub mod releases;
pub mod repos;

use axum::{
    Router,
    routing::{delete, get, post},
};
use macro_auth::middleware::decode_jwt::JwtValidationArgs;
use tower::ServiceBuilder;
use tower_cookies::CookieManagerLayer;

use crate::api::context::ApiContext;

pub fn router(jwt_args: JwtValidationArgs) -> Router<ApiContext> {
    Router::new()
        .route("/init", post(init::handler))
        .route("/callback", get(callback::handler))
        .route("/credentials", get(get_credentials::handler))
        .route("/links", get(list::handler))
        .route("/link", delete(disconnect::handler))
        .route("/repos", get(repos::handler))
        .route("/repos/:owner/:repo", get(get_repo::handler))
        // Pull requests
        .route("/repos/:owner/:repo/pulls", get(pulls::list_handler))
        .route(
            "/repos/:owner/:repo/pulls/:number",
            get(pulls::get_handler),
        )
        // Issues
        .route("/repos/:owner/:repo/issues", get(issues::list_handler))
        .route(
            "/repos/:owner/:repo/issues/:number",
            get(issues::get_handler),
        )
        // Commits
        .route("/repos/:owner/:repo/commits", get(commits::list_handler))
        .route(
            "/repos/:owner/:repo/commits/:sha",
            get(commits::get_handler),
        )
        // Branches
        .route("/repos/:owner/:repo/branches", get(branches::list_handler))
        .route(
            "/repos/:owner/:repo/branches/:branch",
            get(branches::get_handler),
        )
        // Releases
        .route("/repos/:owner/:repo/releases", get(releases::list_handler))
        .route(
            "/repos/:owner/:repo/releases/tags/:tag",
            get(releases::get_handler),
        )
        .layer(
            ServiceBuilder::new()
                .layer(CookieManagerLayer::new())
                .layer(axum::middleware::from_fn_with_state(
                    jwt_args,
                    macro_middleware::auth::decode_jwt::handler,
                )),
        )
}
