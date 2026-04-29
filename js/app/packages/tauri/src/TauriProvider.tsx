import { isTauri } from '@core/util/platform';
import { PlatformNotificationProvider } from '@notifications';
import type { RouteSectionProps } from '@solidjs/router';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { type OsType, type as osType } from '@tauri-apps/plugin-os';
import {
  type Accessor,
  createContext,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  useContext,
} from 'solid-js';
import { getInsets, type Insets } from 'tauri-plugin-safe-area-insets';
import { listenForHeartbeat } from './heartbeat';
import { useTauriNavigationEffect } from './navigation';
import { MaybePushNotificationRegistration } from './PushNotification';

type NotAndroid = 'not-android';

interface StagedSharedFileData {
  token: string;
  name: string;
  mime_type: string;
  size: number;
  preview_path?: string | null;
}

export interface PendingShareFile {
  token: string;
  name: string;
  mimeType: string;
  size: number;
  previewSrc?: string;
}

export interface UploadPendingShareFileArgs {
  token: string;
  uploadUrl: string;
  mimeType: string;
}

interface ShareFilesReadyPayload {
  filenames: string[];
}

function shareFileNamesMatch(
  left: readonly string[],
  right: readonly string[]
): boolean {
  return (
    left.length === right.length &&
    left.every((name, index) => name === right[index])
  );
}

async function getPendingShareFilenames(): Promise<string[]> {
  return invoke<string[]>('get_pending_share_filenames');
}

async function popSharedFiles(filenames: string[]): Promise<PendingShareFile[]> {
  const results = await invoke<StagedSharedFileData[]>('pop_shared_files', {
    filenames,
  });
  return results.map(({ token, name, mime_type, size, preview_path }) => ({
    token,
    name,
    mimeType: mime_type,
    size,
    previewSrc: preview_path ? convertFileSrc(preview_path) : undefined,
  }));
}

async function clearSharedFiles(tokens: string[]): Promise<void> {
  await invoke('clear_shared_files', { tokens });
}

async function uploadPendingShareFile(
  args: UploadPendingShareFileArgs
): Promise<void> {
  await invoke('upload_shared_file_to_presigned_url', {
    token: args.token,
    uploadUrl: args.uploadUrl,
    mimeType: args.mimeType,
  });
}

interface TauriContextValue {
  os: OsType;
  runtimeInsets: Accessor<Insets | NotAndroid>;
  /** Files shared into Macro via the iOS Share Extension, waiting to be attached. */
  pendingShareFiles: Accessor<PendingShareFile[]>;
  /** Call this to upload a staged iOS shared file without loading it into JS memory. */
  uploadPendingShareFile: (
    args: UploadPendingShareFileArgs
  ) => Promise<void>;
  /** Call this after the files have been handled by the share sheet. */
  clearPendingShareFiles: () => Promise<void>;
}

const TauriContext = createContext<TauriContextValue | undefined>(undefined);

function TauriProvider(props: { children: JSX.Element }) {
  // we only care about this value on android.
  // ios should use the env(safe-area-inset-top) css properties
  // this css is not reliably set on android
  const [insets, setInsets] = createSignal<NotAndroid | Insets>(
    'not-android' as const
  );

  const [pendingShareFiles, setPendingShareFiles] = createSignal<
    PendingShareFile[]
  >([]);
  const [pendingShareFileNames, setPendingShareFileNames] = createSignal<
    string[]
  >([]);

  const clearPendingShareFiles = async () => {
    const files = pendingShareFiles();
    setPendingShareFiles([]);
    setPendingShareFileNames([]);

    if (files.length === 0) {
      return;
    }

    try {
      await clearSharedFiles(files.map((file) => file.token));
    } catch {
      setPendingShareFiles([]);
      setPendingShareFileNames([]);
    }
  };

  const value: TauriContextValue = {
    runtimeInsets: insets,
    os: osType(),
    pendingShareFiles,
    uploadPendingShareFile,
    clearPendingShareFiles,
  };

  onMount(() => {
    listenForHeartbeat();

    if (value.os === 'android') {
      getInsets().then((insets) => {
        setInsets(insets);
        // Set CSS variables for Tauri insets
        document.documentElement.style.setProperty(
          '--tauri-inset-top',
          `${insets.top}px`
        );
        document.documentElement.style.setProperty(
          '--tauri-inset-bottom',
          `${insets.bottom}px`
        );
        document.documentElement.style.setProperty(
          '--tauri-inset-left',
          `${insets.left}px`
        );
        document.documentElement.style.setProperty(
          '--tauri-inset-right',
          `${insets.right}px`
        );
      });
    }

    document.body.classList.add('tauri');
    document.body.classList.add(`tauri-${value.os}`);

    // iOS: pop any files shared via the Share Extension on mount (cold-launch)
    // and whenever the app is foregrounded by a new share.
    if (value.os === 'ios') {
      const loadPendingShareFiles = async (filenames: string[]) => {
        if (filenames.length === 0) return;

        const previousFilenames = pendingShareFileNames();
        const previousFiles = pendingShareFiles();
        const isSamePendingShare = shareFileNamesMatch(
          previousFilenames,
          filenames
        );

        if (isSamePendingShare && pendingShareFiles().length > 0) {
          return;
        }

        try {
          const files = await popSharedFiles(filenames);
          if (files.length === 0) {
            return;
          }

          setPendingShareFiles(files);
          setPendingShareFileNames(filenames);
          if (previousFiles.length > 0 && !isSamePendingShare) {
            void clearSharedFiles(previousFiles.map((file) => file.token)).catch(
              () => {}
            );
          }
        } catch {}
      };

      const unlisten = listen<ShareFilesReadyPayload>(
        'share-files-ready',
        (event) => void loadPendingShareFiles(event.payload.filenames)
      );

      void (async () => {
        try {
          await unlisten;
          const filenames = await getPendingShareFilenames();
          await loadPendingShareFiles(filenames);
        } catch {}
      })();

      onCleanup(() => void unlisten.then((fn) => fn()));
    }
  });

  return (
    <TauriContext.Provider value={value}>
      {props.children}
    </TauriContext.Provider>
  );
}

export function MaybeTauriProvider(props: { children: JSX.Element }) {
  if (isTauri()) {
    return (
      <TauriProvider>
        <MaybePushNotificationRegistration>
          {props.children}
        </MaybePushNotificationRegistration>
      </TauriProvider>
    );
  }

  return (
    <PlatformNotificationProvider>
      {props.children}
    </PlatformNotificationProvider>
  );
}

/// return the value of the tauri context
export function useTauri() {
  return useContext(TauriContext);
}

/// same as useTauri but throws if the structure of the component tree is invalid
export function useExpectTauri() {
  const res = useTauri();
  if (res === undefined) {
    throw new Error(
      'Tauri Context was not found, did you mean to call useTauri instead?'
    );
  }

  return res;
}

/// we need this as a separate component since it must be a child of solidjs Router
export function TauriRouteListener(props: RouteSectionProps) {
  if (isTauri()) {
    useTauriNavigationEffect();
  }

  return props.children;
}
