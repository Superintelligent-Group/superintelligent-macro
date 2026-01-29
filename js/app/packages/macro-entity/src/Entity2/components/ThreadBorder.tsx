/**
 * Thread border visual connector
 * Thin vertical line for grouped items
 */
export function ThreadBorder() {
  return (
    <div
      class="absolute left-[calc(0.5rem+1px)] w-[1px] border-l border-edge-muted -top-0.75"
      style={{ height: '6px' }}
    />
  );
}
