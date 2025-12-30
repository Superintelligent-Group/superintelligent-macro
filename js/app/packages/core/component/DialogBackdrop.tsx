import { createSignal } from "solid-js";

export const [dialogCount, setDialogCount] = createSignal<number>(0);

export function DialogBackdrop(){
  return (
    <div
      class="z-modal fixed inset-0 bg-modal-overlay pattern-edge-muted pattern-diagonal-4"
      style={{display: dialogCount() > 0 ? 'block' : 'none'}}
    />
  );
}
