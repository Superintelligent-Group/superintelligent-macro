import { useSplitPanelOrThrow } from '@app/component/split-layout/layoutUtils';
import type { ListView } from '@app/constants/list-views';
import { SortDropdown } from '@app/component/next-soup/soup-view/filters-bar/sort-dropdown';
import { Button } from '@app/component/next-soup/soup-view/filters-bar/button';
import SortIcon from '@macro-icons/wide/sort.svg';
import ChevronDownIcon from '@icon/regular/caret-down.svg';
import {
  CHANNEL_SORT_OPTIONS,
  DEFAULT_SORT_OPTIONS,
  DOCUMENT_SORT_OPTIONS,
  EMAIL_SORT_OPTIONS,
  TASK_SORT_OPTIONS,
  type SortOption,
  type SystemSortOption,
} from '@app/component/next-soup/soup-view/sort-options';
import { useSoupView } from '@app/component/next-soup/soup-view/soup-view-context';
import { createMemo, createSignal, Switch, Match } from 'solid-js';
import { registerHotkey } from '@core/hotkey/hotkeys';

type SortOpenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const SoupViewContextSort = () => {
  const panel = useSplitPanelOrThrow();

  const [sortOpen, setSortOpen] = createSignal(false);

  registerHotkey({
    hotkey: 's',
    scopeId: panel.splitHotkeyScope,
    description: 'Open sort menu',
    keyDownHandler: () => {
      setSortOpen(true);
      return true;
    },
  });

  const component = createMemo(() => {
    const content = panel.handle.content();

    if (content.type !== 'component') return;

    return content.id;
  });

  const isComponentListView = (listView: ListView) => {
    return component() === listView;
  };

  const openProps = (): SortOpenProps => ({
    open: sortOpen(),
    onOpenChange: setSortOpen,
  });

  return (
    <Switch fallback={<SortPlaceholder />}>
      <Match when={isComponentListView('inbox')}>
        <InboxSort {...openProps()} />
      </Match>
      <Match when={isComponentListView('agents')}>
        <AgentsSort {...openProps()} />
      </Match>
      <Match when={isComponentListView('mail')}>
        <MailSort {...openProps()} />
      </Match>
      <Match when={isComponentListView('documents')}>
        <DocumentsSort {...openProps()} />
      </Match>
      <Match when={isComponentListView('tasks')}>
        <TasksSort {...openProps()} />
      </Match>
      <Match when={isComponentListView('channels')}>
        <ChannelsSort {...openProps()} />
      </Match>
      <Match when={isComponentListView('folders')}>
        <FilesSort {...openProps()} />
      </Match>
    </Switch>
  );
};

/**
 * Invisible placeholder that occupies the same space as the sort dropdown
 * trigger button. Used in views that don't support sorting (e.g. search,
 * calls) so the preview icon to the left of it stays in a stable position
 * across all soup splits.
 */
const SortPlaceholder = () => (
  <div class="invisible" aria-hidden="true">
    <Button
      variant="secondary"
      size="sm"
      class="whitespace-nowrap rounded-xs [&_svg]:size-4"
      tabIndex={-1}
    >
      <SortIcon />
      <ChevronDownIcon class="size-4" />
    </Button>
  </div>
);

const useSortDropdown = (options: SortOption[] = DEFAULT_SORT_OPTIONS) => {
  const { soup } = useSoupView();

  const value = createMemo(
    () => (soup.sort.active()[0]?.id as SystemSortOption) ?? 'updated_at'
  );

  const onChange = (sortOption: SystemSortOption) => {
    soup.sort.setAll([sortOption]);
  };

  return { value, onChange, options };
};

const InboxSort = (props: SortOpenProps) => {
  const sort = useSortDropdown();

  return (
    <SortDropdown
      value={sort.value}
      onChange={sort.onChange}
      options={sort.options}
      open={props.open}
      onOpenChange={props.onOpenChange}
    />
  );
};

const AgentsSort = (props: SortOpenProps) => {
  const sort = useSortDropdown();

  return (
    <SortDropdown
      value={sort.value}
      onChange={sort.onChange}
      options={sort.options}
      open={props.open}
      onOpenChange={props.onOpenChange}
    />
  );
};

const MailSort = (props: SortOpenProps) => {
  const sort = useSortDropdown(EMAIL_SORT_OPTIONS);

  return (
    <SortDropdown
      value={sort.value}
      onChange={sort.onChange}
      options={sort.options}
      open={props.open}
      onOpenChange={props.onOpenChange}
    />
  );
};

const DocumentsSort = (props: SortOpenProps) => {
  const sort = useSortDropdown(DOCUMENT_SORT_OPTIONS);

  return (
    <SortDropdown
      value={sort.value}
      onChange={sort.onChange}
      options={sort.options}
      open={props.open}
      onOpenChange={props.onOpenChange}
    />
  );
};

const TasksSort = (props: SortOpenProps) => {
  const sort = useSortDropdown(TASK_SORT_OPTIONS);

  return (
    <SortDropdown
      value={sort.value}
      onChange={sort.onChange}
      options={sort.options}
      open={props.open}
      onOpenChange={props.onOpenChange}
    />
  );
};

const ChannelsSort = (props: SortOpenProps) => {
  const sort = useSortDropdown(CHANNEL_SORT_OPTIONS);

  return (
    <SortDropdown
      value={sort.value}
      onChange={sort.onChange}
      options={sort.options}
      open={props.open}
      onOpenChange={props.onOpenChange}
    />
  );
};

const FilesSort = (props: SortOpenProps) => {
  const sort = useSortDropdown();

  return (
    <SortDropdown
      value={sort.value}
      onChange={sort.onChange}
      options={sort.options}
      open={props.open}
      onOpenChange={props.onOpenChange}
    />
  );
};
