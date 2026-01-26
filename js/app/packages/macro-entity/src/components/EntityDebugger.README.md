# Entity Debugger

Interactive visual testing environment for the Entity component refactor.

## Accessing the Debugger

The EntityDebugger is registered in the component registry and can be accessed by opening a split with the `entity-debugger` component.

### In the App

1. Open a split in the app
2. Navigate to: `/app/component/entity-debugger`
3. Or use the split commands to load the `entity-debugger` component

## Features

### Controls Panel

Located at the top of the debugger, provides interactive controls for:

- **Layout Variant**: Switch between `default`, `compact`, `expanded`, and `card` layouts
- **Width**: Test responsive behavior at different screen widths:
  - Mobile (375px)
  - Tablet (768px)
  - Desktop (1024px)
  - Wide (1440px)
- **Feature Toggles**:
  - Show/hide checkbox column
  - Show/hide properties
  - Show/hide notifications
  - Enable search mode

### Entity Grid

The main testing area displays categorized entities:

- **Documents**: Various document types including PDFs, markdown files
- **Tasks**: Tasks with different completion states and priorities
- **Emails**: Unread, read, drafts, threads
- **Channels**: Public, private, direct messages, organization channels
- **Search Results**: Entities with search highlights and content hits

#### Interactions

- **Click** an entity to select it and view details in the Inspector
- **Hover** to see hover states
- **Check** entities using the checkbox column (when enabled)

### Inspector Panel

Located on the right side, shows detailed information about the selected entity:

- **Entity Info**: ID, type, name, owner
- **State**: Selected, hovered, checked status
- **Features**: Project associations, file types, subtypes
- **Raw Data**: Full JSON representation of the entity

### Console Log

Located at the bottom, displays real-time debug information:

- Entity click events
- Selection changes
- Checked state toggles
- Component lifecycle events

Click "Clear" to reset the console log.

## Mock Data

The debugger uses comprehensive mock data from `/mocks/mockEntityData.ts`:

- **All Entity Types**: Documents, Tasks, Emails, Channels, Projects, Chats
- **Edge Cases**: Long names, special characters, Unicode emojis, missing fields
- **Features**: Notifications, properties, project paths, search highlights
- **States**: Shared ownership, various completion states, read/unread

## Use Cases

### Testing Layout Variants

1. Select different layouts from the Controls Panel
2. Observe how entities render in each variant
3. Test at different screen widths

### Testing Features

1. Toggle "Show Properties" to see property badges on tasks
2. Toggle "Show Notifications" to see notification rows
3. Toggle "Search Mode" to see search highlights and content hits

### Debugging Specific Entities

1. Click an entity in the grid
2. View extracted data in the Inspector
3. Check console log for event details
4. Review raw JSON data

### Testing Responsive Behavior

1. Switch between width variants (Mobile → Tablet → Desktop → Wide)
2. Observe layout changes and responsive styles
3. Check entity grid wrapping and overflow behavior

## Next Steps

This debugger is designed for **Phase 0** of the refactor. As the refactor progresses:

1. **Phase 1**: Update to use Entity.Row component
2. **Phase 2**: Show Entity.Layout variants
3. **Phase 3**: Display Entity.Slot composition
4. **Phase 4**: Inspect Entity.Extractor data flow

The inspector will be enhanced to show the data flow through the new architecture layers.
