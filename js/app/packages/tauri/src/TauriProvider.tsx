import { isTauri } from '@core/util/platform';
import { PlatformNotificationProvider } from '@notifications';
import type { RouteSectionProps } from '@solidjs/router';
import { invoke } from '@tauri-apps/api/core';
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

interface SharedFileData {
  name: string;
  data: string; // base64
  mime_type: string;
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

async function popSharedFiles(filenames: string[]): Promise<File[]> {
  const results = await invoke<SharedFileData[]>('pop_shared_files', {
    filenames,
  });
  return results.map(({ name, data, mime_type }) => {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], name, { type: mime_type });
  });
}

async function clearSharedFiles(filenames: string[]): Promise<void> {
  await invoke('clear_shared_files', { filenames });
}

interface TauriContextValue {
  os: OsType;
  runtimeInsets: Accessor<Insets | NotAndroid>;
  /** Files shared into Macro via the iOS Share Extension, waiting to be attached. */
  pendingShareFiles: Accessor<File[]>;
  /** Call this after the files have been handed to a message composer. */
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

  const [pendingShareFiles, setPendingShareFiles] = createSignal<File[]>([]);
  const [pendingShareFileNames, setPendingShareFileNames] = createSignal<
    string[]
  >([]);

  const clearPendingShareFiles = async () => {
    const filenames = pendingShareFileNames();
    if (filenames.length === 0) {
      setPendingShareFiles([]);
      setPendingShareFileNames([]);
      return;
    }

    await clearSharedFiles(filenames);

    if (shareFileNamesMatch(pendingShareFileNames(), filenames)) {
      setPendingShareFiles([]);
      setPendingShareFileNames([]);
    }
  };

  const value: TauriContextValue = {
    runtimeInsets: insets,
    os: osType(),
    pendingShareFiles,
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
          if (previousFilenames.length > 0 && !isSamePendingShare) {
            void clearSharedFiles(previousFilenames).catch(() => {});
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
