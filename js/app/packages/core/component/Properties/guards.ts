import type { EntityReference } from '@service-properties/generated/schemas/entityReference';
import type {
  BooleanProperty,
  DateProperty,
  EntityProperty,
  LinkProperty,
  MultiValueProperty,
  NumberProperty,
  Property,
  SelectNumberProperty,
  SelectProperty,
  SelectStringProperty,
  SingleValueProperty,
  StringProperty,
} from './types';

export const isStringProperty = (
  property: Property
): property is StringProperty => {
  return property.valueType === 'STRING';
};

export const isNumberProperty = (
  property: Property
): property is NumberProperty => {
  return property.valueType === 'NUMBER';
};

export const isBooleanProperty = (
  property: Property
): property is BooleanProperty => {
  return property.valueType === 'BOOLEAN';
};

export const isDateProperty = (
  property: Property
): property is DateProperty => {
  return property.valueType === 'DATE';
};

export const isSelectStringProperty = (
  property: Property
): property is SelectStringProperty => {
  return property.valueType === 'SELECT_STRING';
};

export const isSelectNumberProperty = (
  property: Property
): property is SelectNumberProperty => {
  return property.valueType === 'SELECT_NUMBER';
};

export const isEntityProperty = (
  property: Property
): property is EntityProperty => {
  return property.valueType === 'ENTITY';
};

export const isLinkProperty = (
  property: Property
): property is LinkProperty => {
  return property.valueType === 'LINK';
};

export const isSingleValueProperty = (
  property: Property
): property is SingleValueProperty => {
  return (
    property.valueType === 'STRING' ||
    property.valueType === 'NUMBER' ||
    property.valueType === 'BOOLEAN' ||
    property.valueType === 'DATE'
  );
};

export const isMultiValueProperty = (
  property: Property
): property is MultiValueProperty => {
  return (
    property.valueType === 'SELECT_STRING' ||
    property.valueType === 'SELECT_NUMBER' ||
    property.valueType === 'ENTITY' ||
    property.valueType === 'LINK'
  );
};

export const isSelectProperty = (
  property: Property
): property is SelectProperty => {
  return (
    property.valueType === 'SELECT_STRING' ||
    property.valueType === 'SELECT_NUMBER'
  );
};

export const getStringValue = (property: StringProperty): string | null => {
  return property.value;
};

export const getNumberValue = (property: NumberProperty): number | null => {
  return property.value;
};

export const getBooleanValue = (property: BooleanProperty): boolean | null => {
  return property.value;
};

export const getDateValue = (property: DateProperty): Date | null => {
  return property.value;
};

export const getSelectStringValues = (
  property: SelectStringProperty
): string[] | null => {
  return property.value;
};

export const getSelectNumberValues = (
  property: SelectNumberProperty
): string[] | null => {
  return property.value;
};

export const getEntityValues = (
  property: EntityProperty
): EntityReference[] | null => {
  return property.value;
};

export const getLinkValues = (property: LinkProperty): string[] | null => {
  return property.value;
};

export const hasValue = (property: Property): boolean => {
  if (property.value === null) {
    return false;
  }

  if (Array.isArray(property.value)) {
    return property.value.length > 0;
  }

  return true;
};

export const hasSingleValue = (property: MultiValueProperty): boolean => {
  return property.value !== null && property.value.length === 1;
};

export const hasMultiValue = (property: MultiValueProperty): boolean => {
  return property.value !== null && property.value.length > 1;
};
