import {
  $applyNodeReplacement,
  DecoratorNode,
  type DOMConversion,
  type DOMConversionMap,
  type EditorConfig,
  type EditorThemeClasses,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from 'lexical';
import { type DecoratorComponent, getDecorator } from '../decoratorRegistry';
import { $applyIdFromSerialized } from '../plugins/nodeIdPlugin';

const VERSION = 1;

/**
 * GitHub entity types that can be mentioned
 */
export type GitHubEntityType = 'pr' | 'issue' | 'commit' | 'branch' | 'release';

/**
 * Extracts the display text from a GitHub entity ID based on its type.
 * @param entityId - The namespaced identifier
 * @param entityType - The type of GitHub entity
 * @returns A human-readable display string
 */
export function getDisplayTextFromGitHubId(
  entityId: string,
  entityType: GitHubEntityType
): string {
  const parts = entityId.split(':');
  const identifier = parts[parts.length - 1] || entityId;

  switch (entityType) {
    case 'pr':
    case 'issue': {
      // Format: owner/repo#number -> #number
      const hashIdx = identifier.lastIndexOf('#');
      if (hashIdx !== -1) {
        return `#${identifier.substring(hashIdx + 1)}`;
      }
      return identifier;
    }
    case 'commit': {
      // Format: owner/repo@sha -> sha (short)
      const atIdx = identifier.lastIndexOf('@');
      if (atIdx !== -1) {
        const sha = identifier.substring(atIdx + 1);
        return sha.substring(0, 7);
      }
      return identifier;
    }
    case 'branch': {
      // Format: owner/repo:branch -> branch
      // Note: branch ID uses : as separator between repo and branch
      // The full format is github::branch:owner/repo:branchName
      // So identifier would be owner/repo:branchName
      const colonIdx = identifier.indexOf(':');
      if (colonIdx !== -1) {
        return identifier.substring(colonIdx + 1);
      }
      return identifier;
    }
    case 'release': {
      // Format: owner/repo@tag -> tag
      const atIdx = identifier.lastIndexOf('@');
      if (atIdx !== -1) {
        return identifier.substring(atIdx + 1);
      }
      return identifier;
    }
  }
}

/**
 * Gets the repo full name from any GitHub entity ID
 */
export function getRepoFromGitHubId(entityId: string): string {
  const parts = entityId.split(':');
  const identifier = parts[parts.length - 1] || entityId;

  // Handle different separators
  let repoPath = identifier;
  if (identifier.includes('#')) {
    repoPath = identifier.substring(0, identifier.lastIndexOf('#'));
  } else if (identifier.includes('@')) {
    repoPath = identifier.substring(0, identifier.lastIndexOf('@'));
  } else if (identifier.includes(':')) {
    // For branch format: owner/repo:branch
    repoPath = identifier.substring(0, identifier.indexOf(':'));
  }

  return repoPath;
}

export type GitHubMentionInfo = {
  entityId: string; // Full namespaced ID (e.g., github::pr:owner/repo#123)
  entityType: GitHubEntityType;
  mentionUuid?: string;
};

export type SerializedGitHubMentionNode = Spread<
  GitHubMentionInfo,
  SerializedLexicalNode
>;

export type GitHubMentionDecoratorProps = GitHubMentionInfo & {
  key: NodeKey;
  theme: EditorThemeClasses;
};

export class GitHubMentionNode extends DecoratorNode<
  DecoratorComponent<GitHubMentionDecoratorProps> | undefined
> {
  __entityId: string;
  __entityType: GitHubEntityType;
  __mentionUuid: string | undefined;

  static getType() {
    return 'github-mention';
  }

  isInline(): boolean {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }

  static clone(node: GitHubMentionNode) {
    return new GitHubMentionNode(
      node.__entityId,
      node.__entityType,
      node.__mentionUuid,
      node.__key
    );
  }

  constructor(
    entityId: string,
    entityType: GitHubEntityType,
    mentionUuid?: string,
    key?: NodeKey
  ) {
    super(key);
    this.__entityId = entityId;
    this.__entityType = entityType;
    this.__mentionUuid = mentionUuid;
  }

  static importJSON(serializedNode: SerializedGitHubMentionNode) {
    const node = $createGitHubMentionNode({
      entityId: serializedNode.entityId,
      entityType: serializedNode.entityType,
      mentionUuid: serializedNode.mentionUuid,
    });
    $applyIdFromSerialized(node, serializedNode);
    return node;
  }

  exportJSON(): SerializedGitHubMentionNode {
    return {
      ...super.exportJSON(),
      entityId: this.__entityId,
      entityType: this.__entityType,
      mentionUuid: this.__mentionUuid,
      type: GitHubMentionNode.getType(),
      version: VERSION,
    };
  }

  exportComponentProps(): GitHubMentionInfo {
    return {
      entityId: this.__entityId,
      entityType: this.__entityType,
      mentionUuid: this.__mentionUuid,
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    span.setAttribute('data-github-mention', 'true');
    span.setAttribute('data-entity-type', this.__entityType);
    return span;
  }

  updateDOM(_prevNode: GitHubMentionNode, _dom: HTMLElement): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap<HTMLElement> | null {
    const convert = (domNode: HTMLElement) => {
      const entityId = domNode.getAttribute('data-entity-id');
      const entityType = domNode.getAttribute(
        'data-entity-type'
      ) as GitHubEntityType;
      const mentionUuid =
        domNode.getAttribute('data-mention-uuid') || undefined;

      if (entityId && entityType) {
        const node = $createGitHubMentionNode({
          entityId,
          entityType,
          mentionUuid,
        });
        return { node };
      }

      return null;
    };

    const wrapInCheck = (conversion: DOMConversion) => {
      return (node: HTMLElement) =>
        node.hasAttribute('data-github-mention') ? conversion : null;
    };

    return {
      span: wrapInCheck({ conversion: convert, priority: 1 }),
      div: wrapInCheck({ conversion: convert, priority: 1 }),
      a: wrapInCheck({ conversion: convert, priority: 1 }),
    };
  }

  getDataAttrs(): Record<string, string> {
    return {
      'data-github-mention': 'true',
      'data-entity-id': this.__entityId,
      'data-entity-type': this.__entityType,
      'data-mention-uuid': this.__mentionUuid || '',
    };
  }

  exportDOM() {
    const element = document.createElement('span');
    const attrs = this.getDataAttrs();
    for (const [k, v] of Object.entries(attrs)) {
      if (v) {
        element.setAttribute(k, v);
      }
    }
    element.textContent = getDisplayTextFromGitHubId(
      this.__entityId,
      this.__entityType
    );
    return { element };
  }

  getTextContent(): string {
    return getDisplayTextFromGitHubId(this.__entityId, this.__entityType);
  }

  getSearchText(): string {
    return '';
  }

  getEntityId(): string {
    return this.__entityId;
  }

  getEntityType(): GitHubEntityType {
    return this.__entityType;
  }

  getMentionUuid(): string | undefined {
    return this.__mentionUuid;
  }

  setMentionUuid(mentionUuid: string | undefined) {
    const writable = this.getWritable();
    writable.__mentionUuid = mentionUuid;
    return writable;
  }

  decorate(_: LexicalEditor, config: EditorConfig) {
    const decorator = getDecorator<GitHubMentionNode>(GitHubMentionNode);
    if (decorator) {
      return () =>
        decorator({
          entityId: this.__entityId,
          entityType: this.__entityType,
          mentionUuid: this.__mentionUuid,
          key: this.getKey(),
          theme: config.theme,
        });
    }
  }
}

export function $createGitHubMentionNode(
  params: GitHubMentionInfo
): GitHubMentionNode {
  const node = new GitHubMentionNode(
    params.entityId,
    params.entityType,
    params.mentionUuid
  );
  return $applyNodeReplacement(node);
}

export function $isGitHubMentionNode(
  node: GitHubMentionNode | LexicalNode | null | undefined
): node is GitHubMentionNode {
  return node instanceof GitHubMentionNode;
}
