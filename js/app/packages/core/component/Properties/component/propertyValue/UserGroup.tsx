import { UserGroup as CoreUserGroup } from '@core/component/UserGroup';
import type { EntityReference } from '../../types';

type UserEntityPillProps = {
  entities: EntityReference[];
  maxUsers?: number;
};

/**
 * Wrapper around the core UserGroup component for use in property values.
 * Maps EntityReference[] to userIds string[] expected by the core component.
 */
export const UserGroup = (props: UserEntityPillProps) => {
  const userIds = () => props.entities.map((entity) => entity.entity_id);

  return (
    <CoreUserGroup
      userIds={userIds()}
      maxUsers={props.maxUsers}
      size="xs"
      suppressClick
      showTooltip={false}
    />
  );
};
