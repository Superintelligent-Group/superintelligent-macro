import { MobileDrawer } from '@app/component/mobile/MobileDrawer';
import { useUserId } from '@core/context/user';
import { RecipientSelector } from '@core/component/RecipientSelector';
import { getDestinationFromOptions } from '@core/component/NewMessage';
import { toast } from '@core/component/Toast/Toast';
import { useCombinedRecipients } from '@core/signal/useCombinedRecipient';
import type { WithCustomUserInput } from '@core/user';
import { invalidateContacts } from '@core/user/contactService';
import { isErr, throwOnErr } from '@core/util/maybeResult';
import { Button } from '@ui/components/Button';
import {
  ChannelInput,
  Input,
  createInputAttachmentTracker,
  type InputAttachmentData,
  type InputAttachmentKind,
  type InputAttachmentTracker,
  type InputSnapshot,
  useInput,
  useInputCommands,
} from '@channel/Input';
import { buildPostMessageRequest } from '@channel/Input/message-payload';
import { hasSendableInputContent } from '@channel/Input/utils/sendable-content';
import {
  getAttachmentKindFromFile,
  iconTypeFromFilename,
} from '@channel/Input/utils/file-helpers';
import type { PendingShareFile } from '@macro/tauri';
import { useShareTarget, useTauri } from '@macro/tauri';
import { invalidateListChannels } from '@queries/channel/channels';
import { commsServiceClient } from '@service-comms/client';
import { staticFileClient } from '@service-static-files/client';
import {
  ErrorBoundary,
  createEffect,
  createSignal,
  on,
  onCleanup,
  type Accessor,
  Show,
  Suspense,
} from 'solid-js';

// Use the current staged file tokens as the share-session identity.
function pendingShareBatchKey(files: readonly PendingShareFile[]): string {
  return files.map((file) => file.token).join('|');
}

function getPendingShareAttachmentKind(
  file: Pick<PendingShareFile, 'name' | 'mimeType'>
): InputAttachmentKind {
  return getAttachmentKindFromFile({
    name: file.name,
    type: file.mimeType,
  });
}

function buildPendingAttachment(
  file: PendingShareFile,
  pendingId: string,
  kind: InputAttachmentKind
): InputAttachmentData {
  return {
    id: pendingId,
    name: file.name,
    kind,
    iconType: kind === 'document' ? iconTypeFromFilename(file.name) : undefined,
    pending: true,
    previewSrc: kind === 'image' ? file.previewSrc : undefined,
  };
}

function buildUploadedAttachment(
  file: PendingShareFile,
  staticFileId: string,
  kind: InputAttachmentKind
): InputAttachmentData {
  if (kind === 'document') {
    return {
      id: staticFileId,
      name: file.name,
      kind,
      iconType: iconTypeFromFilename(file.name),
    };
  }

  return {
    id: staticFileId,
    name: file.name,
    kind,
  };
}

async function uploadPendingShareAttachment(options: {
  file: PendingShareFile;
  tracker: InputAttachmentTracker;
  uploadPendingShareFile:
    | ((args: { token: string; uploadUrl: string; mimeType: string }) => Promise<void>)
    | undefined;
  isActive: () => boolean;
}) {
  const kind = getPendingShareAttachmentKind(options.file);
  const pendingId = `pending-share:${options.file.token}`;

  options.tracker.addAttachment(
    buildPendingAttachment(options.file, pendingId, kind)
  );

  try {
    if (kind === 'document') {
      throw new Error('Unsupported iOS share attachment type');
    }

    const result = await throwOnErr(() =>
      staticFileClient.makePresignedUrl({
        file_name: options.file.name,
        content_type: options.file.mimeType,
      })
    );

    if (!options.uploadPendingShareFile) {
      throw new Error('Missing native shared file uploader');
    }

    await options.uploadPendingShareFile({
      token: options.file.token,
      uploadUrl: result.upload_url,
      mimeType: options.file.mimeType,
    });

    if (!options.isActive()) return;

    options.tracker.removeAttachment(pendingId);
    options.tracker.addAttachment(
      buildUploadedAttachment(options.file, result.id, kind)
    );
  } catch (error) {
    if (!options.isActive()) return;

    options.tracker.removeAttachment(pendingId);
    console.error('failed to upload iOS shared file', {
      file: options.file,
      error,
    });
    toast.failure(`Failed to upload ${options.file.name}`);
  }
}

function ShareSheetInputActions(props: {
  hasRecipients: Accessor<boolean>;
}) {
  const input = useInput();
  const commands = useInputCommands();

  const canSend = () =>
    props.hasRecipients() &&
    !input().hasPendingAttachments &&
    hasSendableInputContent(input());

  return (
    <Input.Actions>
      <Input.Actions.Left>
        <Input.AttachFilesAction />
        <Input.ToggleFormatAction />
      </Input.Actions.Left>
      <Input.Actions.Right>
        <Button
          variant={canSend() ? 'accent' : 'secondary'}
          size="sm"
          disabled={!canSend()}
          onPointerDown={(event) => {
            event.preventDefault();
            void commands.send().catch(() => {});
          }}
        >
          Send
        </Button>
      </Input.Actions.Right>
    </Input.Actions>
  );
}

function ShareSheetComposerLoading() {
  return (
    <div class="macro-message-width flex min-h-32 w-full items-center justify-center rounded-[5px] border border-edge-muted bg-input px-4 py-6 text-sm text-ink-muted">
      Preparing composer…
    </div>
  );
}

function ShareSheetComposerError(_props: { error: unknown }) {
  return (
    <div class="macro-message-width flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-[5px] border border-edge-muted bg-input px-4 py-6 text-center">
      <p class="text-sm text-ink">Couldn&apos;t load the composer.</p>
      <p class="text-xs text-ink-muted">
        Close the sheet and try sharing again.
      </p>
    </div>
  );
}

function IosShareSheetComposer(props: {
  batchKey: string;
  handleCancel: () => void;
}) {
  const shareTarget = useShareTarget();
  const userId = useUserId();
  const { all: destinationOptions } = useCombinedRecipients();
  const attachmentTracker = createInputAttachmentTracker();
  const composerId = crypto.randomUUID();

  const [selectedOptions, setSelectedOptions] = createSignal<
    WithCustomUserInput<'user' | 'contact' | 'channel'>[]
  >([]);

  createEffect(
    on(
      () => props.batchKey,
      () => {
        const files = shareTarget?.pendingShareFiles() ?? [];
        if (files.length === 0) return;

        let active = true;
        onCleanup(() => {
          active = false;
        });

        void (async () => {
          await Promise.allSettled(
            files.map((file) =>
              uploadPendingShareAttachment({
                file,
                tracker: attachmentTracker,
                uploadPendingShareFile: shareTarget?.uploadPendingShareFile,
                isActive: () => active,
              })
            )
          );
        })();
      }
    )
  );

  const resolveDestinationChannelId = async () => {
    const options = selectedOptions();

    if (options.length === 0) {
      toast.failure('Select a recipient');
      throw new Error('No recipient selected for iOS share sheet');
    }

    const destination = getDestinationFromOptions(options);

    if (destination.type === 'channel') {
      return destination.id;
    }

    if (destination.users.length === 0) {
      toast.failure('Select a valid recipient');
      throw new Error('No valid recipients selected for iOS share sheet');
    }

    const result =
      destination.users.length === 1
        ? await commsServiceClient.getOrCreateDirectMessage({
            recipient_id: destination.users[0],
          })
        : await commsServiceClient.getOrCreatePrivateChannel({
            recipients: destination.users,
          });

    if (isErr(result)) {
      toast.failure('Failed to open channel');
      throw new Error('Failed to resolve share destination channel');
    }

    return result[1].channel_id;
  };

  const handleSend = async (snapshot: InputSnapshot) => {
    const senderId = userId();
    if (!senderId) {
      toast.failure('Failed to send message');
      throw new Error('Missing sender id for iOS share sheet send');
    }

    const channelId = await resolveDestinationChannelId();
    const message = buildPostMessageRequest({ snapshot });

    const result = await commsServiceClient.postMessage({
      channel_id: channelId,
      message,
    });

    if (isErr(result)) {
      toast.failure('Failed to send message');
      throw new Error('Failed to post shared message');
    }

    invalidateListChannels();
    invalidateContacts();

    void shareTarget?.clearPendingShareFiles();
  };

  return (
    <div class="flex h-full flex-col">
      <div class="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2 border-b border-edge-muted/50">
        <Button variant="ghost" size="sm" onClick={props.handleCancel}>
          Cancel
        </Button>
      </div>

      <div class="shrink-0 border-b border-edge-muted/50 px-1 py-2">
        <RecipientSelector<'user' | 'contact' | 'channel'>
          placeholder="To: Email or group"
          setSelectedOptions={setSelectedOptions}
          selectedOptions={selectedOptions()}
          options={destinationOptions}
          triggerMode="input"
          noBrackets
          hideBorder
          noPadding
          focusOnMount
          mobileHorizontalScroll
        />
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <ErrorBoundary
          fallback={(error) => <ShareSheetComposerError error={error} />}
        >
          <Suspense fallback={<ShareSheetComposerLoading />}>
            <ChannelInput
              input={{
                mode: 'channel',
                id: `ios-share-input-${composerId}`,
                placeholder: 'Add a message',
              }}
              attachmentTracker={attachmentTracker}
              markdownNamespace={`ios-share-input-${composerId}`}
              onSend={handleSend}
            >
              <ShareSheetInputActions
                hasRecipients={() => selectedOptions().length > 0}
              />
            </ChannelInput>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}

export function IosShareSheet() {
  const tauri = useTauri();
  const shareTarget = useShareTarget();

  const pendingFiles = () => shareTarget?.pendingShareFiles() ?? [];
  const shareBatchKey = () => pendingShareBatchKey(pendingFiles());
  const isOpen = () => pendingFiles().length > 0 && tauri?.os === 'ios';
  const [awaitingFirstInteraction, setAwaitingFirstInteraction] =
    createSignal(false);

  createEffect(
    on(isOpen, (open) => {
      if (!open) {
        setAwaitingFirstInteraction(false);
        return;
      }

      setAwaitingFirstInteraction(true);

      const releaseDismissGuard = () => {
        setAwaitingFirstInteraction(false);
      };

      const handlePointerDown = () => releaseDismissGuard();
      const handleKeyDown = () => releaseDismissGuard();

      window.addEventListener('pointerdown', handlePointerDown, true);
      window.addEventListener('keydown', handleKeyDown, true);

      onCleanup(() => {
        window.removeEventListener('pointerdown', handlePointerDown, true);
        window.removeEventListener('keydown', handleKeyDown, true);
      });
    })
  );

  const handleCancel = () => {
    void shareTarget?.clearPendingShareFiles();
  };

  return (
    <Show when={tauri?.os === 'ios'}>
      <MobileDrawer
        side="bottom"
        open={isOpen()}
        closeOnOutsidePointerStrategy="pointerdown"
        closeOnOutsideFocus={false}
        preventScroll={false}
        preventScrollbarShift={false}
        restoreFocus={false}
        noOutsidePointerEvents={false}
        onOpenChange={(open) => {
          const closeGuardActive =
            !open && isOpen() && awaitingFirstInteraction();

          if (closeGuardActive) return;

          if (!open && isOpen()) handleCancel();
        }}
      >
        <MobileDrawer.Portal>
          <MobileDrawer.Overlay class="fixed inset-0 z-modal-overlay bg-modal-overlay" />
          <MobileDrawer.Content aria-label="Share to Macro">
            <Show when={isOpen() ? shareBatchKey() : undefined} keyed>
              {(batchKey) => (
                <IosShareSheetComposer
                  batchKey={batchKey}
                  handleCancel={handleCancel}
                />
              )}
            </Show>
          </MobileDrawer.Content>
        </MobileDrawer.Portal>
      </MobileDrawer>
    </Show>
  );
}
