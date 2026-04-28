#[cfg(target_os = "ios")]
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64_STANDARD};
use logger::Logger;
use navigation_plugin::scheme::MacroScheme;
use navigation_plugin::{MacroNavigationPlugin, Platform};
use reqwest::cookie::CookieStore;
use reqwest::header::COOKIE;
use rootcause::{Report, report};
use serde::Serialize;
use std::sync::Mutex;
#[cfg(target_os = "ios")]
use std::sync::OnceLock;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use tauri::http::{HeaderMap, HeaderValue};
use tauri::{AppHandle, Emitter};
use tauri::{Manager, Runtime};
use tauri_plugin_deep_link::{DeepLinkExt, OpenUrlEvent};
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use url::Url;

// ── iOS App Group file sharing ─────────────────────────────────────────────────

#[derive(Default)]
struct PendingShareFilesState {
    filenames: Mutex<Vec<String>>,
}

#[cfg(target_os = "ios")]
#[derive(Clone, Serialize)]
struct ShareFilesReadyPayload {
    filenames: Vec<String>,
}

/// Returns the filesystem path of the shared App Group container used to
/// exchange files between the Share Extension and the main app.
/// Calls NSFileManager directly via the objc2 runtime — no FFI to main.mm needed.
#[cfg(target_os = "ios")]
fn ios_app_group_container_path() -> Option<String> {
    use objc2::rc::autoreleasepool;
    use objc2::runtime::AnyObject;
    use objc2::{class, msg_send};
    use std::ffi::{CStr, CString};
    use std::os::raw::c_char;

    autoreleasepool(|_| unsafe {
        let manager: *mut AnyObject = msg_send![class!(NSFileManager), defaultManager];

        let c_group = CString::new("group.com.macro.app.prod").ok()?;
        let group_ns: *mut AnyObject = msg_send![
            class!(NSString),
            stringWithUTF8String: c_group.as_ptr() as *const c_char
        ];

        let url: *mut AnyObject = msg_send![
            manager,
            containerURLForSecurityApplicationGroupIdentifier: group_ns
        ];
        if url.is_null() {
            return None;
        }

        let path_obj: *mut AnyObject = msg_send![url, path];
        if path_obj.is_null() {
            return None;
        }

        let c_path: *const c_char = msg_send![path_obj, UTF8String];
        if c_path.is_null() {
            return None;
        }

        CStr::from_ptr(c_path).to_str().ok().map(|s| s.to_string())
    })
}

#[derive(Serialize)]
struct SharedFile {
    name: String,
    /// Base64-encoded file contents.
    data: String,
    mime_type: String,
}

#[cfg(target_os = "ios")]
fn encode_base64(bytes: &[u8]) -> String {
    BASE64_STANDARD.encode(bytes)
}

#[cfg(any(target_os = "ios", test))]
const PENDING_SHARE_MANIFEST_FILENAME: &str = "pending_share_manifest.json";

#[cfg(any(target_os = "ios", test))]
fn pending_share_manifest_path(container_path: &std::path::Path) -> std::path::PathBuf {
    container_path.join(PENDING_SHARE_MANIFEST_FILENAME)
}

#[cfg(any(target_os = "ios", test))]
fn read_pending_share_manifest_from_container(container_path: &std::path::Path) -> Vec<String> {
    let manifest_path = pending_share_manifest_path(container_path);
    let Ok(data) = std::fs::read(&manifest_path) else {
        return vec![];
    };

    let Ok(filenames) = serde_json::from_slice::<Vec<String>>(&data) else {
        return vec![];
    };

    let filenames: Vec<String> = filenames
        .into_iter()
        .filter_map(|name| sanitize_shared_filename(&name).map(str::to_owned))
        .filter(|name| container_path.join(name).is_file())
        .collect();

    filenames
}

#[cfg(any(target_os = "ios", test))]
fn write_pending_share_manifest_to_container(
    container_path: &std::path::Path,
    filenames: &[String],
) -> std::io::Result<()> {
    let manifest_path = pending_share_manifest_path(container_path);

    if filenames.is_empty() {
        return match std::fs::remove_file(&manifest_path) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(error),
        };
    }

    let data = serde_json::to_vec(filenames)
        .map_err(|error| std::io::Error::new(std::io::ErrorKind::InvalidData, error))?;
    std::fs::write(manifest_path, data)
}

fn lock_pending_share_filenames(
    state: &PendingShareFilesState,
) -> std::sync::MutexGuard<'_, Vec<String>> {
    match state.filenames.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    }
}

#[cfg(target_os = "ios")]
fn replace_pending_share_filenames(state: &PendingShareFilesState, filenames: Vec<String>) {
    *lock_pending_share_filenames(state) = filenames;
}

#[cfg(not(target_os = "ios"))]
fn remove_pending_share_filenames(state: &PendingShareFilesState, filenames: &[String]) {
    let mut pending = lock_pending_share_filenames(state);
    pending.retain(|name| !filenames.contains(name));
}

#[cfg(any(target_os = "ios", test))]
fn remaining_pending_share_filenames(
    pending_filenames: &[String],
    consumed_filenames: &[String],
) -> Vec<String> {
    pending_filenames
        .iter()
        .filter(|name| !consumed_filenames.contains(name))
        .cloned()
        .collect()
}

#[cfg(target_os = "ios")]
fn consume_pending_share_filenames(
    container_path: &std::path::Path,
    state: &PendingShareFilesState,
    filenames: &[String],
) -> Result<(), String> {
    let filenames: Vec<String> = filenames
        .iter()
        .filter_map(|name| sanitize_shared_filename(name).map(str::to_owned))
        .collect();

    {
        let mut pending = lock_pending_share_filenames(state);
        let remaining = remaining_pending_share_filenames(&pending, &filenames);
        write_pending_share_manifest_to_container(container_path, &remaining)
            .map_err(|error| format!("failed to update pending share manifest: {error}"))?;
        *pending = remaining;
    }

    for name in filenames {
        let path = container_path.join(name);
        if let Err(error) = std::fs::remove_file(&path) {
            if error.kind() != std::io::ErrorKind::NotFound {
                continue;
            }
        }
    }

    Ok(())
}

fn sanitize_shared_filename(name: &str) -> Option<&str> {
    let path = std::path::Path::new(name);
    match path.file_name().and_then(|file_name| file_name.to_str()) {
        Some(file_name) if file_name == name && file_name.starts_with("share_") => Some(file_name),
        _ => None,
    }
}

#[cfg(any(target_os = "ios", test))]
fn share_filenames_from_url(url: &Url) -> Vec<String> {
    url.query_pairs()
        .filter(|(key, _)| key == "files")
        .flat_map(|(_, value)| {
            value
                .split(',')
                .filter_map(|name| sanitize_shared_filename(name).map(str::to_owned))
                .collect::<Vec<_>>()
        })
        .collect()
}

#[cfg(target_os = "ios")]
fn mime_type_from_path(path: &std::path::Path) -> &'static str {
    let ext = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "heic" | "heif" => "image/heic",
        "mov" => "video/quicktime",
        "mp4" => "video/mp4",
        _ => "application/octet-stream",
    }
}

#[tauri::command]
fn get_pending_share_filenames(
    app: tauri::AppHandle,
    state: tauri::State<'_, PendingShareFilesState>,
) -> Vec<String> {
    #[cfg(not(target_os = "ios"))]
    let _ = &app;

    let pending = lock_pending_share_filenames(&state).clone();

    #[cfg(not(target_os = "ios"))]
    if !pending.is_empty() {
        return pending;
    }

    #[cfg(target_os = "ios")]
    {
        if !pending.is_empty() {
            if let Some(container_path) = ios_app_group_container_path() {
                let container_path = std::path::Path::new(&container_path);
                let pending_len = pending.len();
                let existing_pending: Vec<String> = pending
                    .into_iter()
                    .filter(|name| container_path.join(name).is_file())
                    .collect();

                if existing_pending.len() != pending_len {
                    replace_pending_share_filenames(&state, existing_pending.clone());
                    let _ =
                        write_pending_share_manifest_to_container(container_path, &existing_pending);
                }

                if !existing_pending.is_empty() {
                    return existing_pending;
                }
            } else {
                return pending;
            }
        }

        if let Some(container_path) = ios_app_group_container_path() {
            let container_path = std::path::Path::new(&container_path);
            let manifest_filenames = read_pending_share_manifest_from_container(container_path);
            if !manifest_filenames.is_empty() {
                replace_pending_share_filenames(&state, manifest_filenames.clone());
                return manifest_filenames;
            }

            let _ = write_pending_share_manifest_to_container(container_path, &manifest_filenames);
        }

        use tauri_plugin_mobile_sharetarget::IOS_DEEP_LINK_SCHEME;

        match app.deep_link().get_current() {
            Ok(Some(urls)) => {
                if let Some(url) = urls.first() {
                    if url.scheme().eq(IOS_DEEP_LINK_SCHEME.wait())
                        && url.host_str() == Some("share")
                    {
                        let filenames = share_filenames_from_url(url);
                        replace_pending_share_filenames(&state, filenames.clone());
                        return filenames;
                    }
                }
            }
            Ok(None) | Err(_) => {}
        }
    }

    Vec::new()
}

/// Tauri command: read files saved by the Share Extension from the shared App Group
/// container and return them as base64-encoded blobs. Successfully read files
/// are consumed from the native pending-share queue so they are not replayed on
/// the next app launch.
/// On non-iOS platforms this is a no-op that returns an empty list.
#[tauri::command]
fn pop_shared_files(
    filenames: Vec<String>,
    state: tauri::State<'_, PendingShareFilesState>,
) -> Vec<SharedFile> {
    #[cfg(not(target_os = "ios"))]
    {
        let _ = (filenames, state);
        return vec![];
    }

    #[cfg(target_os = "ios")]
    {
        let container_path = match ios_app_group_container_path() {
            Some(p) => p,
            None => return vec![],
        };

        let container_path = std::path::PathBuf::from(container_path);
        let mut files = Vec::with_capacity(filenames.len());
        let mut consumed_filenames = Vec::new();
        for name in filenames {
            let Some(name) = sanitize_shared_filename(&name).map(str::to_owned) else {
                continue;
            };

            let path = container_path.join(&name);
            match std::fs::read(&path) {
                Ok(data) => {
                    files.push(SharedFile {
                        name: name.clone(),
                        data: encode_base64(&data),
                        mime_type: mime_type_from_path(&path).to_string(),
                    });
                    consumed_filenames.push(name);
                }
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                    consumed_filenames.push(name);
                }
                Err(_) => {}
            }
        }

        if !consumed_filenames.is_empty() {
            let _ = consume_pending_share_filenames(&container_path, &state, &consumed_filenames);
        }

        files
    }
}

/// Tauri command: delete files that were previously handed off from the shared
/// App Group container after the frontend has safely taken ownership.
#[tauri::command]
fn clear_shared_files(
    filenames: Vec<String>,
    state: tauri::State<'_, PendingShareFilesState>,
) -> Result<(), String> {
    let filenames: Vec<String> = filenames
        .into_iter()
        .filter_map(|name| sanitize_shared_filename(&name).map(str::to_owned))
        .collect();

    #[cfg(target_os = "ios")]
    {
        let Some(container_path) = ios_app_group_container_path() else {
            return Err("missing iOS app group container".to_string());
        };
        consume_pending_share_filenames(std::path::Path::new(&container_path), &state, &filenames)
    }

    #[cfg(not(target_os = "ios"))]
    {
        remove_pending_share_filenames(&state, &filenames);
        Ok(())
    }
}

struct HeartbeatState {
    alive: AtomicBool,
    /// Incremented on each resume event so stale check threads are ignored
    generation: AtomicU64,
}

#[tauri::command]
fn heartbeat_response(state: tauri::State<'_, HeartbeatState>) {
    state.alive.store(true, Ordering::SeqCst);
}

/// This module provides debuging utilities and should not be compiled in prodiction builds
#[cfg(debug_assertions)] // do not remove this
mod debug;

#[cfg(target_os = "ios")]
static GLOBAL_APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

/// Send a heartbeat ping to the JS layer and check for a response after 1 second.
/// If no response is received, reload the webview (the content process is likely dead).
#[cfg(target_os = "ios")]
fn send_heartbeat(handle: &AppHandle) {
    tracing::info!("app resumed, sending heartbeat ping");

    let state = handle.state::<HeartbeatState>();
    let current_gen = state.generation.fetch_add(1, Ordering::SeqCst) + 1;
    state.alive.store(false, Ordering::SeqCst);

    let _ = handle.emit("heartbeat_ping", ());

    let handle = handle.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        let state = handle.state::<HeartbeatState>();

        if state.generation.load(Ordering::SeqCst) != current_gen {
            tracing::debug!("heartbeat: stale generation {current_gen}, skipping");
            return;
        }

        if !state.alive.load(Ordering::SeqCst) {
            tracing::warn!(
                "heartbeat: no response from JS — content process likely dead, reloading webview"
            );
            if let Some(webview) = handle.webview_windows().values().next() {
                let _ = webview.reload();
            }
        } else {
            tracing::info!("heartbeat: JS responded, content process alive");
        }
    });
}

/// Called from native Objective-C when the iOS app resumes from background.
/// See `main.mm` for the notification observer.
#[cfg(target_os = "ios")]
#[unsafe(no_mangle)]
extern "C" fn on_app_resumed() {
    let Some(handle) = GLOBAL_APP_HANDLE.get() else {
        tracing::warn!("on_app_resumed: app handle not yet initialized");
        return;
    };
    send_heartbeat(handle);
}

/// domains which the tauri webview can render.
/// This should be as restrictive as possible.
/// If the webview attempts to naviate to other domains,
/// they will be opened in the systems default browser
static ALLOWED_DOMAINS: &[&str] = &[
    "http://tauri.localhost",
    "tauri://localhost",
    "https://macro.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "http://localhost:3006",
    "http://localhost:3007",
    "http://localhost:3008",
    "http://localhost:3009",
];

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tracing_subscriber::EnvFilter;

    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        if cfg!(debug_assertions) {
            "debug,tungstenite=info,tokio_tungstenite=info,reqwest=info,hyper=info,h2=info".into()
        } else {
            "info,tungstenite=info,tokio_tungstenite=info,reqwest=info".into()
        }
    });

    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_file(true)
        .with_target(false)
        .with_writer(std::io::stderr)
        .with_line_number(true)
        .pretty();

    let registry = tracing_subscriber::registry().with(filter).with(fmt_layer);

    #[cfg(target_os = "ios")]
    let registry = registry.with(tracing_oslog::OsLogger::new(
        "com.macro.app.prod",
        "default",
    ));

    registry.init();

    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // single instance plugin should always be the first registered
        tracing::debug!("register single instance plugin");
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
            tracing::debug!("single instance callback with argv: {argv:?}");
        }))
    }

    #[cfg(target_os = "ios")]
    {
        builder = builder
            .plugin(tauri_plugin_haptics::init())
            .plugin(tauri_plugin_input_accessory::init());
    }

    // register the rest of the common plugins
    // The log plugin with "tracing" feature emits tracing::event! directly,
    // so logs from the webview will go through our tracing subscriber
    builder = builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Debug)
                .skip_logger() // Don't set up log crate logger, we only want the tracing events
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_websocket::Builder::new()
                .merge_header_callback(Box::new(merge_header_callback))
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(
            MacroNavigationPlugin::new(
                ALLOWED_DOMAINS,
                cfg!(mobile)
                    .then_some(Platform::Mobile)
                    .unwrap_or(Platform::Desktop),
            )
            .expect("Domains must be valid urls"),
        );

    #[cfg(mobile)]
    {
        // register mobile specific plugins
        builder = builder
            .plugin(tauri_plugin_safe_area_insets::init())
            .plugin(tauri_plugin_notifications::init())
            .plugin(tauri_plugin_virtual_keyboard::init())
            .plugin(tauri_plugin_auth::init())
            .plugin(tauri_plugin_mobile_sharetarget::init());
    }

    builder
        .manage(HeartbeatState {
            alive: AtomicBool::new(true),
            generation: AtomicU64::new(0),
        })
        .manage(PendingShareFilesState::default())
        .invoke_handler(tauri::generate_handler![
            heartbeat_response,
            get_pending_share_filenames,
            pop_shared_files,
            clear_shared_files
        ])
        .setup(|app| {
            #[cfg(any(target_os = "linux", all(windows, debug_assertions)))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link()
                    .register_all()
                    .inspect(|_| tracing::debug!("attached scheme handler"))
                    .log_and_consume();
            }

            app.chain(attach_deep_link_handler);

            #[cfg(target_os = "ios")]
            {
                let _ = GLOBAL_APP_HANDLE.set(app.handle().clone());
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// fn to merge the headers from the http cookie store into the initial
/// GET request to open a websocket
fn merge_header_callback<R: Runtime>(url: String, headers: &mut HeaderMap, handle: &AppHandle<R>) {
    tracing::debug!("got url {url}");
    let Some(s) = handle.try_state::<tauri_plugin_http::Http>() else {
        return;
    };
    let Ok(mut url) = url.parse::<Url>() else {
        return;
    };
    url.set_scheme(match url.scheme() {
        "ws" => "http",
        _ => "https",
    })
    .ok();
    tracing::debug!("checking cookies for {url}");

    if let Some(cookie) = s.inner().cookies_jar.as_ref().cookies(&url) {
        tracing::info!("inserting cookie value for {url}");
        tracing::debug!("{cookie:?}");
        headers.insert(COOKIE, cookie);
    }
}

trait AppChain {
    fn chain(&mut self, f: impl FnOnce(&mut Self)) -> &mut Self;
}

impl AppChain for tauri::App {
    fn chain(&mut self, f: impl FnOnce(&mut Self)) -> &mut Self {
        f(self);
        self
    }
}

fn attach_deep_link_handler(app: &mut tauri::App) {
    fn inner_handler(ev: OpenUrlEvent, handle: &AppHandle) -> Result<(), Report> {
        let url = ev
            .urls()
            .into_iter()
            .next()
            .ok_or_else(|| report!("expected at least 1 url"))?;

        // iOS: intercept share extension deep links before navigation routing.
        // The ShareExtension saves files to the shared App Group container and
        // opens macro://share?files=... — we validate and forward that file list
        // to the frontend.
        #[cfg(target_os = "ios")]
        {
            use tauri_plugin_mobile_sharetarget::IOS_DEEP_LINK_SCHEME;
            if url.scheme().eq(IOS_DEEP_LINK_SCHEME.wait()) && url.host_str() == Some("share") {
                let filenames = share_filenames_from_url(&url);
                replace_pending_share_filenames(
                    &handle.state::<PendingShareFilesState>(),
                    filenames.clone(),
                );
                let _ = handle.emit("share-files-ready", ShareFilesReadyPayload { filenames });
                return Ok(());
            }
        }

        // Universal/App links come in as https:// URLs, custom scheme links come in as macro://
        let macro_scheme = match url.scheme() {
            "macro" => MacroScheme::new(url)?,
            "http" | "https" => MacroScheme::from_url(&url)?,
            scheme => {
                return Err(report!("unexpected deep link scheme: {}", scheme));
            }
        };

        #[derive(Clone, Serialize, Debug)]
        struct NavigatePayload<'a> {
            path: &'a str,
            query: &'a str,
        }

        let payload = NavigatePayload {
            path: macro_scheme.0.path(),
            query: macro_scheme.0.query().unwrap_or_default(),
        };
        // we send a navigate event instead of calling navigate directly
        // because navigate performs a full browser navigation

        tracing::info!("{payload:?}");
        Ok(handle.emit("navigate", payload)?)
    }

    app.deep_link().on_open_url({
        let handle = app.handle().clone();
        move |ev| {
            inner_handler(ev, &handle).log_and_consume();
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn share_filenames_from_url_preserves_order() {
        let url = Url::parse("macro://share?files=share_one.jpg,share_two.mp4").unwrap();

        assert_eq!(
            share_filenames_from_url(&url),
            vec!["share_one.jpg".to_string(), "share_two.mp4".to_string()]
        );
    }

    #[test]
    fn share_filenames_from_url_rejects_invalid_names() {
        let url = Url::parse(
            "macro://share?files=share_ok.png,../bad.mov,not_shared.jpg,share_nested%2Fbad.mp4",
        )
        .unwrap();

        assert_eq!(
            share_filenames_from_url(&url),
            vec!["share_ok.png".to_string()]
        );
    }

    #[test]
    fn pending_share_manifest_filters_invalid_and_missing_files() {
        use std::time::{SystemTime, UNIX_EPOCH};

        let test_dir = std::env::temp_dir().join(format!(
            "macro-pending-share-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));

        std::fs::create_dir_all(&test_dir).unwrap();
        std::fs::write(test_dir.join("share_ok.png"), b"ok").unwrap();
        std::fs::write(
            pending_share_manifest_path(&test_dir),
            serde_json::to_vec(&vec![
                "share_ok.png".to_string(),
                "../bad.mov".to_string(),
                "share_missing.mp4".to_string(),
            ])
            .unwrap(),
        )
        .unwrap();

        assert_eq!(
            read_pending_share_manifest_from_container(&test_dir),
            vec!["share_ok.png".to_string()]
        );

        std::fs::remove_dir_all(test_dir).unwrap();
    }

    #[test]
    fn remaining_pending_share_filenames_only_removes_consumed_entries() {
        let pending = vec![
            "share_old.jpg".to_string(),
            "share_current.mp4".to_string(),
            "share_next.png".to_string(),
        ];
        let consumed = vec!["share_current.mp4".to_string(), "share_missing.mov".to_string()];

        assert_eq!(
            remaining_pending_share_filenames(&pending, &consumed),
            vec!["share_old.jpg".to_string(), "share_next.png".to_string()]
        );
    }

    #[test]
    fn write_pending_share_manifest_removes_manifest_when_empty() {
        use std::time::{SystemTime, UNIX_EPOCH};

        let test_dir = std::env::temp_dir().join(format!(
            "macro-pending-share-write-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));

        std::fs::create_dir_all(&test_dir).unwrap();
        std::fs::write(pending_share_manifest_path(&test_dir), b"[]").unwrap();

        write_pending_share_manifest_to_container(&test_dir, &[]).unwrap();

        assert!(!pending_share_manifest_path(&test_dir).exists());

        std::fs::remove_dir_all(test_dir).unwrap();
    }
}
