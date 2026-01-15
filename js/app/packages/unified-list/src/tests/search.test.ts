/**
 * Tests for search utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  fuzzyMatch,
  highlightMatches,
  enhanceWithSearchHighlight,
} from '../plugins/searchPlugin';

describe('Search Utilities', () => {
  describe('fuzzyMatch', () => {
    it('returns true for empty query', () => {
      expect(fuzzyMatch('any text', '')).toBe(true);
    });

    it('returns false for empty text with non-empty query', () => {
      expect(fuzzyMatch('', 'query')).toBe(false);
    });

    it('matches exact substring', () => {
      expect(fuzzyMatch('hello world', 'world')).toBe(true);
    });

    it('matches case-insensitively', () => {
      expect(fuzzyMatch('Hello World', 'hello')).toBe(true);
      expect(fuzzyMatch('hello world', 'WORLD')).toBe(true);
    });

    it('matches fuzzy pattern', () => {
      // Matches h...e...l...l...o
      expect(fuzzyMatch('hamburger hello', 'hlo')).toBe(true);
    });

    it('returns false when characters not in order', () => {
      expect(fuzzyMatch('world', 'dlrow')).toBe(false);
    });

    it('returns false when query longer than text', () => {
      expect(fuzzyMatch('hi', 'hello world')).toBe(false);
    });
  });

  describe('highlightMatches', () => {
    it('returns original text for empty query', () => {
      expect(highlightMatches('hello', '')).toBe('hello');
    });

    it('highlights matching characters', () => {
      const result = highlightMatches('hello', 'hlo');
      // Algorithm matches first occurrence of each character (h, then first l, then o)
      expect(result).toBe('<mark>h</mark>e<mark>l</mark>l<mark>o</mark>');
    });

    it('is case-insensitive but preserves original case', () => {
      const result = highlightMatches('Hello', 'hlo');
      // Preserves original case while matching case-insensitively
      expect(result).toBe('<mark>H</mark>e<mark>l</mark>l<mark>o</mark>');
    });

    it('uses custom highlight tag', () => {
      const result = highlightMatches('hello', 'hlo', 'strong');
      expect(result).toBe(
        '<strong>h</strong>e<strong>l</strong>l<strong>o</strong>'
      );
    });

    it('handles non-matching query', () => {
      const result = highlightMatches('hello', 'xyz');
      expect(result).toBe('hello');
    });
  });

  describe('enhanceWithSearchHighlight', () => {
    it('returns entity unchanged for empty query', () => {
      const entity = { id: '1', name: 'Test Entity' };
      const result = enhanceWithSearchHighlight(entity, '');

      expect(result).toEqual(entity);
      expect(result.searchHighlight).toBeUndefined();
    });

    it('adds search highlight data', () => {
      const entity = { id: '1', name: 'Test Entity' };
      const result = enhanceWithSearchHighlight(entity, 'test');

      expect(result.searchHighlight).toBeDefined();
      expect(result.searchHighlight?.name).toContain('<mark>');
    });

    it('preserves all entity properties', () => {
      const entity = {
        id: '1',
        name: 'Test Entity',
        type: 'document',
        extra: 'data',
      };
      const result = enhanceWithSearchHighlight(entity, 'test');

      expect(result.id).toBe('1');
      expect(result.name).toBe('Test Entity');
      expect(result.type).toBe('document');
      expect(result.extra).toBe('data');
    });
  });
});
