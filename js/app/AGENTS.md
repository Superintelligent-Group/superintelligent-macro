## Development Commands
- `bun run test`: run tests 
- `bun run check`: check typescript changes 
- `bun run lint`: lint with biome 
- `bun run format`: format changes with biome 
- `bun run knip`: to check for dead code

## Development Patterns

### General
- All API/network calls live in service-clients.
- All queries & mutations are defined in the queries package.

### SolidJs
- Avoid createEffect. Legitimate uses: syncing with external/imperative systems (DOM APIs, third-party libs). If you're using it to derive state or trigger updates, use a derived signal or wrap the setter instead.
- Use createMemo only when you need referential stability or the derivation is expensive. Cheap derivations (() => a() + b()) don't need it regardless of subscriber count.
- Before rolling your own reactive utility, check solid-primitives first.

## UI / Components
- Prefer composition over configurability. Follow slot-based patterns (see packages/channel, packages/entity, or Kobalte).
- Keep reusable components small, atomic, and decoupled from queries/complex state. Push data-fetching and mutations up to use-case-specific composed components.
- Context should be scoped to a component subtree — Message.Content consuming a MessageContext is fine because the ownership boundary is clear.
- Composed primitives must not depend on use-case-specific context — a RecipientsSelector should never require an EmailComposeContext.

## Styling
- Use semantic color tokens, not raw Tailwind color classes.

## TS
- For exhaustive switch statements use `match` from `ts-pattern`.

### Misc
- If you create a Lexical Node or make breaking changes to a Lexical Node, you must increment the lexical version counter (in packages/core/component/LexicalMarkdown/version.ts) along with a brief note about changes.
- Avoid `blockSignals`, `blockEffects`, `blockMemos` etc...

### Good Reference
- https://github.com/solidjs-community/solid-primitives
- https://github.com/kobaltedev/kobalte
- `packages/entity`
- `packages/channel`
- `packages/block-md`
- `packages/app/component/next-soup`

### Bad Examples
- `packages/block-channel`
- `packages/block-pdf`

## Notes
- Don't shy away from pulling good examples into context. In the case of solid-primtiives/kobalte try reading documentation, or just temp clone into /tmp to reference

## Code Styles
1. Avoid using `blockSignals`, `blockMemos`, `blockResources` etc... They are deprecated.
2. Primitive UI components should be pure, and prefer composition over props vs complex global state or context.
3. Use semantic color tokens instead of default tailwind styles for colors.
4. Going forward, all network calls to serice clients should be done through Tanstack query in the `queries` package. **DO NOT** introduce code that calls any client from `service-clients` outside of the queries package.
5. For exhaustive switch statements use `match` from `ts-pattern`.
6. When reaching for solid related utilities always check if a sufficient `solid-primitive` exists first (https://github.com/solidjs-community/solid-primitives).
7. Always use `cn()` from `@ui/utils/classname` for conditional or dynamic class names. Never use SolidJS's `classList` prop.
8. If you create a Lexical Node or make breaking changes to a Lexical Node, you must increment the lexical version counter (in packages/core/component/LexicalMarkdown/version.ts) along with a brief note about changes.
