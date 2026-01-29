import { tryMacroId, useDisplayNameParts } from '@core/user';

export function DisplayName(props: {
  id: string;
  format?: 'firstName' | 'lastName' | 'fullName';
}) {
  const name = () => {
    const parts = useDisplayNameParts(tryMacroId(props.id));
    return parts[props.format ?? 'fullName'];
  };
  return <>{name()}</>;
}
