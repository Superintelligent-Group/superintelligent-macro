# Notification Components

This directory contains composed notification components that follow the same extractor pattern as the entity components.

## Usage Examples

### Using NotificationMinimal with a single notification

```tsx
import { Entity2 as Entity } from '@macro-entity';
import type { Notification } from '@macro-entity/types/notification';

function MyComponent(props: { notification: Notification }) {
  return <Entity.Notification.Minimal notification={props.notification} />;
}
```

### Using NotificationMinimal with a notification stack

```tsx
import { Entity2 as Entity } from '@macro-entity';
import type { NotificationStack } from '@notifications';

function MyComponent(props: { stack: NotificationStack }) {
  return <Entity.Notification.Minimal stack={props.stack} />;
}
```

### Using individual notification extractors

```tsx
import { Entity2 as Entity } from '@macro-entity';

function CustomNotificationDisplay(props: { notification: Notification }) {
  return (
    <div class="flex items-center gap-2">
      <Entity.Notification.Icon notification={props.notification} />
      <Entity.Notification.Sender notification={props.notification} />
      <Entity.Notification.Description notification={props.notification} />
      <Entity.Notification.Content notification={props.notification} />
      <Entity.Notification.Timestamp notification={props.notification} />
    </div>
  );
}
```

## Available Extractors

All extractors can accept either `notification` or `stack` props:

- **Icon** - Displays the appropriate icon for the notification type
- **Sender** - Displays the sender name(s) with +N for multiple senders
- **Description** - Displays the action verb or count + type noun
- **Content** - Displays the message content preview
- **Timestamp** - Displays the formatted timestamp

## Pattern

These components follow the same composable pattern as the entity components:
- Small, focused extractors that grab specific pieces of state
- Pure presentation components
- Accept either a single notification or a notification stack
- Can be composed together to create custom layouts
