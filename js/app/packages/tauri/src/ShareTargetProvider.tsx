import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { OsType } from '@tauri-apps/plugin-os';
import {
  type Accessor,
  createContext,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  useContext,
} from 'solid-js';

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

async function popSharedFiles(
  filenames: string[]
): Promise<PendingShareFile[]> {
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

interface ShareTargetContextValue {
  pendingShareFiles: Accessor<PendingShareFile[]>;
  uploadPendingShareFile: (args: UploadPendingShareFileArgs) => Promise<void>;
  clearPendingShareFiles: () => Promise<void>;
}

const ShareTargetContext = createContext<ShareTargetContextValue | undefined>(
  undefined
);

export function ShareTargetProvider(props: {
  os: OsType;
  children: JSX.Element;
}) {
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
    } catch {}
  };

  onMount(() => {
    if (props.os !== 'ios') {
      return;
    }

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
  });

  const value: ShareTargetContextValue = {
    pendingShareFiles,
    uploadPendingShareFile,
    clearPendingShareFiles,
  };

  return (
    <ShareTargetContext.Provider value={value}>
      {props.children}
    </ShareTargetContext.Provider>
  );
}

export function useShareTarget() {
  return useContext(ShareTargetContext);
}
