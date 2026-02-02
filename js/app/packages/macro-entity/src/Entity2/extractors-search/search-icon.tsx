import { Dynamic } from 'solid-js/web';
import type { JSX } from 'solid-js';
import { match } from 'ts-pattern';
import type { ContentHitData } from '../../types/search';
import FileTextIcon from '@icon/regular/file-text.svg';
import FilePdfIcon from '@icon/regular/file-pdf.svg';
import HashIcon from '@icon/regular/hash.svg';
import EnvelopeIcon from '@icon/regular/envelope.svg';
import { cn } from '@ui/utils/classname';

interface SearchIconProps {
  hit?: ContentHitData;
  class?: string;
}

/**
 * Gets the appropriate icon for a content hit type
 */
function getSearchIcon(
  hit: ContentHitData
): (props: { class?: string }) => JSX.Element {
  return match(hit)
    .with({ type: 'md' }, () => FileTextIcon)
    .with({ type: 'pdf' }, () => FilePdfIcon)
    .with({ type: 'channel' }, () => HashIcon)
    .with({ type: 'email' }, () => EnvelopeIcon)
    .otherwise(() => FileTextIcon);
}

/**
 * Displays the appropriate icon for a search content hit
 */
export function SearchIcon(props: SearchIconProps) {
  const icon = () => {
    if (!props.hit) return FileTextIcon;
    return getSearchIcon(props.hit);
  };

  return <Dynamic component={icon()} class={cn('size-4', props.class)} />;
}
