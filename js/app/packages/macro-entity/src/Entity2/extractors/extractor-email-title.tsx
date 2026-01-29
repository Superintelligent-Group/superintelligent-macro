import { useEmail } from '@core/context/user';
import { emailToMacroId, useDisplayName } from 'core/user';
import { createMemo } from 'solid-js';
import type { EmailEntity } from '../../types/entity';
import {
  combineParticipantNames,
  formatDisplayNames,
} from '../utils/email-participants';

interface ExtractorEmailTitleProps {
  entity: EmailEntity;
}

/**
 * Extracts and formats participant names for email entities
 * Returns formatted string like "me", "Alice", or "Alice, Bob, Charlie"
 */
export function ExtractorEmailTitle(props: ExtractorEmailTitleProps) {
  const userEmail = useEmail();

  const displayNames = createMemo(() => {
    // Build a lookup function that calls useDisplayName for each email
    // This happens inside the memo, which is acceptable in Solid.js
    const getMacroDisplayName = (email: string): string | undefined => {
      const macroId = emailToMacroId(email);
      const [displayName] = useDisplayName(macroId);
      return displayName();
    };

    const names = combineParticipantNames(
      props.entity.participants,
      userEmail(),
      getMacroDisplayName
    );

    return formatDisplayNames(names);
  });

  return <span class="truncate">{displayNames()}</span>;
}
