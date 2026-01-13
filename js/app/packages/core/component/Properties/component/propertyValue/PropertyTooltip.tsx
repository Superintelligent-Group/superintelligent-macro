import { usePropertyEntityDisplay } from '@core/component/Properties/hooks';
import type { Property } from '@core/component/Properties/types';
import {
  extractDomain,
  formatPropertyValue,
  PropertyDataTypeIcon,
} from '@core/component/Properties/utils';
import { UserIcon } from '@core/component/UserIcon';
import LinkIcon from '@icon/regular/link.svg';
import type { EntityReference } from '@service-properties/generated/schemas/entityReference';
import type { EntityType } from '@service-properties/generated/schemas/entityType';
import { useUnfurl } from '@core/signal/unfurl';
import { proxyResource } from '@service-unfurl/client';
import { createSignal, For, type JSX, Match, Show, Switch } from 'solid-js';
import { match } from 'ts-pattern';
import { PropertyValueIcon } from './PropertyValueIcon';

type PropertyTooltipProps = {
  property: Property;
};

/**
 * Tooltip content component for property values
 * Routes to type-specific tooltip content based on valueType
 */
export const PropertyTooltip = (props: PropertyTooltipProps): JSX.Element => {
  return match(props.property)
    .with({ valueType: 'STRING' }, (property) => (
      <StringTooltipContent property={property} />
    ))
    .with({ valueType: 'NUMBER' }, (property) => (
      <NumberTooltipContent property={property} />
    ))
    .with({ valueType: 'BOOLEAN' }, (property) => (
      <BooleanTooltipContent property={property} />
    ))
    .with({ valueType: 'DATE' }, (property) => (
      <DateTooltipContent property={property} />
    ))
    .with({ valueType: 'SELECT_STRING' }, (property) => (
      <SelectTooltipContent property={property} />
    ))
    .with({ valueType: 'SELECT_NUMBER' }, (property) => (
      <SelectTooltipContent property={property} />
    ))
    .with({ valueType: 'ENTITY' }, (property) => (
      <EntityTooltipContent property={property} />
    ))
    .with({ valueType: 'LINK' }, (property) => (
      <LinkTooltipContent property={property} />
    ))
    .exhaustive();
};

/**
 * Shared tooltip wrapper with consistent header styling
 */
const TooltipWrapper = (props: {
  property: Property;
  children: JSX.Element;
}) => {
  const singleSelect = () => !props.property.isMultiSelect;
  return (
    <div
      class="p-2 border border-edge-muted bg-panel"
      classList={{
        'flex flex-row gap-2 items-center': singleSelect(),
        'min-w-48 max-w-72': !singleSelect(),
      }}
    >
      <div
        class="flex items-center gap-2 text-ink-muted"
        classList={{
          'border-b border-edge-muted/50 pb-1.5 mb-1.5': !singleSelect(),
        }}
      >
        <PropertyDataTypeIcon
          property={{
            data_type: props.property.valueType,
            specific_entity_type:
              props.property.specificEntityType ?? undefined,
          }}
          class="size-3.5 text-ink-muted"
        />
        <span class="text-xs">{props.property.displayName}</span>
      </div>
      {props.children}
    </div>
  );
};

/**
 * Value pill styling used across all tooltip content types
 */
const ValuePill = (props: { children: JSX.Element }) => (
  <div class="inline-flex items-center gap-1.5 px-2 py-1 text-xs leading-none text-ink-muted border border-edge-muted h-fit w-fit">
    {props.children}
  </div>
);

// STRING tooltip content
const StringTooltipContent = (props: {
  property: Property & { valueType: 'STRING' };
}) => {
  const hasValue = () =>
    props.property.value !== null && props.property.value !== '';

  return (
    <TooltipWrapper property={props.property}>
      <Show
        when={hasValue()}
        fallback={<span class="text-xs text-ink-muted">No value</span>}
      >
        <div class="flex items-center gap-1.5 flex-wrap">
          <ValuePill>
            <span class="truncate max-w-[150px]">{props.property.value}</span>
          </ValuePill>
        </div>
      </Show>
    </TooltipWrapper>
  );
};

// NUMBER tooltip content
const NumberTooltipContent = (props: {
  property: Property & { valueType: 'NUMBER' };
}) => {
  const hasValue = () => props.property.value !== null;
  const displayValue = () =>
    hasValue()
      ? formatPropertyValue(props.property, props.property.value)
      : null;

  return (
    <TooltipWrapper property={props.property}>
      <Show
        when={hasValue()}
        fallback={<span class="text-xs text-ink-muted">No value</span>}
      >
        <div class="flex items-center gap-1.5 flex-wrap">
          <ValuePill>
            <span class="truncate max-w-[150px]">{displayValue()}</span>
          </ValuePill>
        </div>
      </Show>
    </TooltipWrapper>
  );
};

// BOOLEAN tooltip content
const BooleanTooltipContent = (props: {
  property: Property & { valueType: 'BOOLEAN' };
}) => {
  const hasValue = () => props.property.value !== null;
  const displayValue = () =>
    hasValue()
      ? formatPropertyValue(props.property, props.property.value)
      : null;

  return (
    <TooltipWrapper property={props.property}>
      <Show
        when={hasValue()}
        fallback={<span class="text-xs text-ink-muted">No value</span>}
      >
        <div class="flex items-center gap-1.5 flex-wrap">
          <ValuePill>
            <span>{displayValue()}</span>
          </ValuePill>
        </div>
      </Show>
    </TooltipWrapper>
  );
};

// DATE tooltip content
const DateTooltipContent = (props: {
  property: Property & { valueType: 'DATE' };
}) => {
  const hasValue = () => props.property.value !== null;
  const displayValue = () =>
    hasValue()
      ? formatPropertyValue(props.property, props.property.value)
      : null;

  return (
    <TooltipWrapper property={props.property}>
      <Show
        when={hasValue()}
        fallback={<span class="text-xs text-ink-muted">No value</span>}
      >
        <div class="flex items-center gap-1.5 flex-wrap">
          <ValuePill>
            <span class="truncate max-w-[150px]">{displayValue()}</span>
          </ValuePill>
        </div>
      </Show>
    </TooltipWrapper>
  );
};

// SELECT (STRING and NUMBER) tooltip content
const SelectTooltipContent = (props: {
  property: Property & { valueType: 'SELECT_STRING' | 'SELECT_NUMBER' };
}) => {
  const values = () => props.property.value ?? [];
  const hasValue = () => values().length > 0;

  return (
    <TooltipWrapper property={props.property}>
      <Show
        when={hasValue()}
        fallback={<span class="text-xs text-ink-muted">No value</span>}
      >
        <div class="flex items-center gap-1.5 flex-wrap">
          <For each={values()}>
            {(optionId, index) => (
              <ValuePill>
                <SelectValueIcon
                  property={props.property}
                  valueIndex={index()}
                />
                <span class="truncate max-w-[150px]">
                  {formatPropertyValue(props.property, optionId)}
                </span>
              </ValuePill>
            )}
          </For>
        </div>
      </Show>
    </TooltipWrapper>
  );
};

const SelectValueIcon = (props: {
  property: Property & { valueType: 'SELECT_STRING' | 'SELECT_NUMBER' };
  valueIndex: number;
}) => {
  const optionId = () => props.property.value?.[props.valueIndex];

  return (
    <Show when={optionId()}>
      <PropertyValueIcon optionId={optionId()!} class="size-3 shrink-0" />
    </Show>
  );
};

// ENTITY tooltip content
const EntityTooltipContent = (props: {
  property: Property & { valueType: 'ENTITY' };
}) => {
  const entities = () => props.property.value ?? [];
  const hasValue = () => entities().length > 0;
  const isUserType = () => props.property.specificEntityType === 'USER';

  return (
    <TooltipWrapper property={props.property}>
      <Show
        when={hasValue()}
        fallback={<span class="text-xs text-ink-muted">No value</span>}
      >
        <div class="flex items-center gap-1.5 flex-wrap">
          <Switch>
            <Match when={isUserType()}>
              <div class="flex flex-col gap-1.5">
                <For each={entities()}>
                  {(entity) => <UserEntityItem entity={entity} />}
                </For>
              </div>
            </Match>
            <Match when={!isUserType()}>
              <For each={entities()}>
                {(entity) => <EntityValuePill entity={entity} />}
              </For>
            </Match>
          </Switch>
        </div>
      </Show>
    </TooltipWrapper>
  );
};

const EntityValuePill = (props: { entity: EntityReference }) => {
  const { name, icon } = usePropertyEntityDisplay(
    () => props.entity.entity_id,
    () => props.entity.entity_type as EntityType,
    { fallbackIcon: null }
  );

  return (
    <ValuePill>
      <Show when={icon()}>{icon()}</Show>
      <span class="truncate max-w-[150px]">{name()}</span>
    </ValuePill>
  );
};

const UserEntityItem = (props: { entity: EntityReference }) => {
  const { name } = usePropertyEntityDisplay(
    () => props.entity.entity_id,
    () => props.entity.entity_type as EntityType,
    { fallbackIcon: null }
  );

  return (
    <ValuePill>
      <div class="size-4 rounded-full overflow-hidden shrink-0">
        <UserIcon id={props.entity.entity_id} isDeleted={false} size="fill" />
      </div>
      <span class="truncate max-w-[150px]">{name()}</span>
    </ValuePill>
  );
};

// LINK tooltip content
const LinkTooltipContent = (props: {
  property: Property & { valueType: 'LINK' };
}) => {
  const links = () => props.property.value ?? [];
  const hasValue = () => links().length > 0;

  return (
    <TooltipWrapper property={props.property}>
      <Show
        when={hasValue()}
        fallback={<span class="text-xs text-ink-muted">No value</span>}
      >
        <div class="flex items-center gap-1.5 flex-wrap">
          <For each={links()}>{(url) => <LinkValuePill url={url} />}</For>
        </div>
      </Show>
    </TooltipWrapper>
  );
};

const LinkValuePill = (props: { url: string }) => {
  const [unfurlData] = useUnfurl(props.url);
  const [imageError, setImageError] = createSignal(false);

  const title = () => {
    const data = unfurlData();
    if (data?.type === 'success' && data.data.title) {
      return data.data.title;
    }
    return extractDomain(props.url);
  };

  const faviconUrl = () => {
    const data = unfurlData();
    if (data?.type === 'success' && data.data.favicon_url) {
      return proxyResource(data.data.favicon_url);
    }
    return null;
  };

  return (
    <a
      href={props.url}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1.5 px-2 py-1 text-xs leading-none text-ink-muted border border-edge-muted h-fit w-fit"
      title={props.url}
    >
      <Show
        when={faviconUrl() && !imageError()}
        fallback={<LinkIcon class="size-4 text-ink-muted" />}
      >
        <img
          src={faviconUrl()!}
          class="size-4 object-cover rounded"
          crossorigin="anonymous"
          alt=""
          onError={() => setImageError(true)}
        />
      </Show>
      <span class="truncate max-w-[150px]">{title()}</span>
    </a>
  );
};
