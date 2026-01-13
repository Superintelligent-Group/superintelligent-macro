import type { EntityType } from '@service-properties/generated/schemas/entityType';
import {
  type Accessor,
  createContext,
  createSignal,
  type ParentProps,
  useContext,
} from 'solid-js';
import { saveEntityProperty } from '../api';
import type { Property, PropertyApiValues, Result } from '../types';
import {
  type PropertySaveHandler,
  type PropertiesContextValue,
  type PropertySelectorModalState,
  type PropertyEditorModalState,
  type DatePickerModalState,
  type CreatePropertyModalState,
} from './PropertiesContext';

// Soup-specific context for managing property editing across multiple entities
export interface SoupPropertiesContextValue {
  // Current entity being edited
  editingEntityId: Accessor<string | null>;
  setEditingEntityId: (entityId: string | null) => void;

  // Create a properties provider for a specific entity
  createEntityPropertiesProvider: (
    entityId: string,
    entityType: EntityType,
    properties: () => Property[],
    onRefresh?: () => void
  ) => PropertiesContextValue;

  // Quick access to check if an entity is being edited
  isEntityBeingEdited: (entityId: string) => boolean;
}

const SoupPropertiesContext = createContext<SoupPropertiesContextValue>();

export interface SoupPropertiesProviderProps extends ParentProps {
  // Optional global refresh handler for when properties change
  onGlobalRefresh?: () => void;
}

export function SoupPropertiesProvider(props: SoupPropertiesProviderProps) {
  const [editingEntityId, setEditingEntityId] = createSignal<string | null>(
    null
  );

  const isEntityBeingEdited = (entityId: string) => {
    return editingEntityId() === entityId;
  };

  const createEntityPropertiesProvider = (
    entityId: string,
    entityType: EntityType,
    properties: () => Property[],
    onRefresh?: () => void
  ): PropertiesContextValue => {
    // Create entity-specific save handler
    const saveHandler: PropertySaveHandler = {
      saveProperty: async (property: Property, value: PropertyApiValues) => {
        const result = await saveEntityProperty(
          entityId,
          entityType,
          property,
          value
        );
        if (result.ok) {
          onRefresh?.();
          props.onGlobalRefresh?.();
        }
        return result;
      },
      saveDate: async (property: Property, date: Date) => {
        const result = await saveEntityProperty(
          entityId,
          entityType,
          property,
          {
            valueType: 'DATE',
            value: date.toISOString(),
          }
        );
        if (result.ok) {
          onRefresh?.();
          props.onGlobalRefresh?.();
        }
        return result;
      },
    };

    // Create minimal properties context value for this entity
    // We create signals for modal state but don't provide the full PropertiesProvider wrapper
    const [propertySelectorModal, setPropertySelectorModal] =
      createSignal<PropertySelectorModalState | null>(null);
    const [propertyEditorModal, setPropertyEditorModal] =
      createSignal<PropertyEditorModalState | null>(null);
    const [datePickerModal, setDatePickerModal] =
      createSignal<DatePickerModalState | null>(null);
    const [createPropertyModal, setCreatePropertyModal] =
      createSignal<CreatePropertyModalState | null>(null);

    const openPropertySelector = () => {
      console.log(
        'SoupPropertiesProvider: openPropertySelector for entity:',
        entityId
      );
      setEditingEntityId(entityId);
      setPropertySelectorModal({ isOpen: true });
    };

    const closePropertySelector = () => {
      setPropertySelectorModal(null);
      if (editingEntityId() === entityId) {
        setEditingEntityId(null);
      }
    };

    const openPropertyEditor = (property: Property, anchor?: HTMLElement) => {
      console.log(
        'SoupPropertiesProvider: openPropertyEditor for entity:',
        entityId,
        'property:',
        property.displayName
      );
      setEditingEntityId(entityId);
      setPropertyEditorModal({ property, anchor });
    };

    const closePropertyEditor = () => {
      setPropertyEditorModal(null);
      if (editingEntityId() === entityId) {
        setEditingEntityId(null);
      }
    };

    const openDatePicker = (
      property: Property & { valueType: 'DATE' },
      anchor?: HTMLElement
    ) => {
      console.log(
        'SoupPropertiesProvider: openDatePicker for entity:',
        entityId,
        'property:',
        property.displayName
      );
      setEditingEntityId(entityId);
      setDatePickerModal({ property, anchor });
    };

    const closeDatePicker = () => {
      setDatePickerModal(null);
      if (editingEntityId() === entityId) {
        setEditingEntityId(null);
      }
    };

    const openCreateProperty = () => {
      setEditingEntityId(entityId);
      setCreatePropertyModal({ isOpen: true });
    };

    const closeCreateProperty = () => {
      setCreatePropertyModal(null);
      if (editingEntityId() === entityId) {
        setEditingEntityId(null);
      }
    };

    const closeAllModals = () => {
      setPropertySelectorModal(null);
      setPropertyEditorModal(null);
      setDatePickerModal(null);
      setCreatePropertyModal(null);
      if (editingEntityId() === entityId) {
        setEditingEntityId(null);
      }
    };

    return {
      entityType,
      canEdit: true, // Soup context always allows editing
      properties,
      onRefresh: onRefresh || (() => {}),
      onPropertyAdded: () => {
        onRefresh?.();
        props.onGlobalRefresh?.();
      },
      onPropertyDeleted: () => {
        onRefresh?.();
        props.onGlobalRefresh?.();
      },
      saveHandler,
      // Modal state accessors
      propertySelectorModal,
      propertyEditorModal,
      datePickerModal,
      createPropertyModal,
      // Modal actions
      openPropertySelector,
      closePropertySelector,
      openPropertyEditor,
      closePropertyEditor,
      openDatePicker,
      closeDatePicker,
      openCreateProperty,
      closeCreateProperty,
      closeAllModals,
    };
  };

  const value: SoupPropertiesContextValue = {
    editingEntityId,
    setEditingEntityId,
    createEntityPropertiesProvider,
    isEntityBeingEdited,
  };

  return (
    <SoupPropertiesContext.Provider value={value}>
      {props.children}
    </SoupPropertiesContext.Provider>
  );
}

export function useSoupPropertiesContext() {
  const context = useContext(SoupPropertiesContext);
  if (!context) {
    throw new Error(
      'useSoupPropertiesContext must be used within SoupPropertiesProvider'
    );
  }
  return context;
}
