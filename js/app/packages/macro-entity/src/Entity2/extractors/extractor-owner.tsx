import { tryMacroId, useDisplayName } from 'core/user';
import { useUserId } from '@core/context/user';
import type { EntityData } from '../../types/entity';

export function ExtractorOwner(props: { entity: EntityData }) {
  const userId = useUserId();
  const ownerId = () => props.entity.ownerId;

  const ownerDisplayName = () => {
    const owner = ownerId();
    if (!owner) return undefined;
    return useDisplayName(tryMacroId(owner))[0]();
  };

  const displayText = () => {
    const owner = ownerId();
    const currentUser = userId();

    if (!owner) return undefined;

    // Return "me" if the owner is the current user
    if (currentUser && owner === currentUser) {
      return 'me';
    }

    // Otherwise return the owner's display name
    return ownerDisplayName();
  };

  return <>{displayText()}</>;
}
