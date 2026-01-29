import { describe, expect, it } from 'vitest';
import {
  isLikelyEmail,
  getEmailLocalPart,
  resolveParticipantName,
  combineParticipantNames,
  formatDisplayNames,
} from '../email-participants';

describe('isLikelyEmail', () => {
  it('returns true for valid email addresses', () => {
    expect(isLikelyEmail('user@example.com')).toBe(true);
    expect(isLikelyEmail('test.user@company.org')).toBe(true);
    expect(isLikelyEmail('name+tag@domain.co.uk')).toBe(true);
  });

  it('returns false for non-email strings', () => {
    expect(isLikelyEmail('John Doe')).toBe(false);
    expect(isLikelyEmail('Just a name')).toBe(false);
    expect(isLikelyEmail('12345')).toBe(false);
  });

  it('returns false for undefined or empty', () => {
    expect(isLikelyEmail(undefined)).toBe(false);
    expect(isLikelyEmail('')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isLikelyEmail(null as unknown as string)).toBe(false);
    expect(isLikelyEmail(123 as unknown as string)).toBe(false);
  });
});

describe('getEmailLocalPart', () => {
  it('extracts local part from email', () => {
    expect(getEmailLocalPart('user@example.com')).toBe('user');
    expect(getEmailLocalPart('john.doe@company.org')).toBe('john.doe');
    expect(getEmailLocalPart('test+tag@domain.com')).toBe('test+tag');
  });

  it('handles multiple @ symbols', () => {
    expect(getEmailLocalPart('user@@example.com')).toBe('user');
  });

  it('returns original string if no @ symbol', () => {
    expect(getEmailLocalPart('notanemail')).toBe('notanemail');
  });
});

describe('resolveParticipantName', () => {
  const participant = { email: 'user@example.com', name: 'John Doe' };

  it('prefers macro display name when not an email', () => {
    expect(resolveParticipantName(participant, 'Macro User')).toBe(
      'Macro User'
    );
  });

  it('falls back to participant name when macro display name is an email', () => {
    expect(resolveParticipantName(participant, 'user@another.com')).toBe(
      'John Doe'
    );
  });

  it('falls back to participant name when no macro display name', () => {
    expect(resolveParticipantName(participant, undefined)).toBe('John Doe');
  });

  it('falls back to email local part when participant name is an email', () => {
    const emailNameParticipant = {
      email: 'user@example.com',
      name: 'user@example.com',
    };
    expect(resolveParticipantName(emailNameParticipant, undefined)).toBe(
      'user'
    );
  });

  it('falls back to email local part when participant name is empty', () => {
    const noNameParticipant = { email: 'user@example.com', name: '' };
    expect(resolveParticipantName(noNameParticipant, undefined)).toBe('user');
  });
});

describe('combineParticipantNames', () => {
  const getMacroDisplayName = (email: string) => {
    const map: Record<string, string> = {
      'alice@example.com': 'Alice Smith',
      'bob@example.com': 'bob@example.com', // email-like display name
    };
    return map[email];
  };

  it('returns ["me"] for single participant matching userEmail', () => {
    const participants = [{ email: 'user@example.com', name: 'Current User' }];
    expect(
      combineParticipantNames(
        participants,
        'user@example.com',
        getMacroDisplayName
      )
    ).toEqual(['me']);
  });

  it('skips current user in multi-participant threads', () => {
    const participants = [
      { email: 'user@example.com', name: 'Current User' },
      { email: 'alice@example.com', name: 'Alice' },
    ];
    const result = combineParticipantNames(
      participants,
      'user@example.com',
      getMacroDisplayName
    );
    expect(result).toEqual(['Alice Smith']);
    expect(result).not.toContain('Current User');
  });

  it('uses macro display names when available', () => {
    const participants = [{ email: 'alice@example.com', name: 'Alice' }];
    expect(
      combineParticipantNames(participants, undefined, getMacroDisplayName)
    ).toEqual(['Alice Smith']);
  });

  it('uses participant names when macro display name is email-like', () => {
    const participants = [{ email: 'bob@example.com', name: 'Bob Jones' }];
    expect(
      combineParticipantNames(participants, undefined, getMacroDisplayName)
    ).toEqual(['Bob Jones']);
  });

  it('deduplicates participant names', () => {
    const participants = [
      { email: 'alice@example.com', name: 'Alice' },
      { email: 'alice2@example.com', name: 'Alice' }, // Same name, different email
    ];
    const getMacroName = () => undefined;
    const result = combineParticipantNames(
      participants,
      undefined,
      getMacroName
    );
    expect(result).toEqual(['Alice']);
  });

  it('skips participants without email', () => {
    const participants = [
      { email: '', name: 'No Email' },
      { email: 'alice@example.com', name: 'Alice' },
    ];
    expect(
      combineParticipantNames(participants, undefined, getMacroDisplayName)
    ).toEqual(['Alice Smith']);
  });

  it('returns empty array for undefined participants', () => {
    expect(
      combineParticipantNames(undefined, undefined, getMacroDisplayName)
    ).toEqual([]);
  });

  it('returns empty array for empty participants', () => {
    expect(combineParticipantNames([], undefined, getMacroDisplayName)).toEqual(
      []
    );
  });
});

describe('formatDisplayNames', () => {
  it('returns undefined for empty array', () => {
    expect(formatDisplayNames([])).toBeUndefined();
  });

  it('returns single name as-is', () => {
    expect(formatDisplayNames(['Alice'])).toBe('Alice');
    expect(formatDisplayNames(['me'])).toBe('me');
  });

  it('formats two names with comma', () => {
    expect(formatDisplayNames(['Alice', 'Bob'])).toBe('Alice, Bob');
  });

  it('formats three names with commas', () => {
    expect(formatDisplayNames(['Alice', 'Bob', 'Charlie'])).toBe(
      'Alice, Bob, Charlie'
    );
  });

  it('formats four or more names with ellipsis', () => {
    expect(formatDisplayNames(['Alice', 'Bob', 'Charlie', 'David'])).toBe(
      'Alice .. Charlie, David'
    );
  });

  it('formats five names with ellipsis', () => {
    expect(
      formatDisplayNames(['Alice', 'Bob', 'Charlie', 'David', 'Eve'])
    ).toBe('Alice .. David, Eve');
  });

  it('uses first names only for multiple participants', () => {
    expect(
      formatDisplayNames(['Alice Smith', 'Bob Jones', 'Charlie Brown'])
    ).toBe('Alice, Bob, Charlie');
  });

  it('uses first names for 4+ participants with ellipsis', () => {
    expect(
      formatDisplayNames([
        'Alice Smith',
        'Bob Jones',
        'Charlie Brown',
        'David Lee',
      ])
    ).toBe('Alice .. Charlie, David');
  });
});
