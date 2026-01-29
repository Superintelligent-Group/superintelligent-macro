/**
 * Pure utility functions for handling email participant names and display
 */

/**
 * Checks if a value is likely an email address
 */
export function isLikelyEmail(value?: string): boolean {
  return typeof value === 'string' && value.includes('@');
}

/**
 * Extracts the local part of an email address (before @)
 */
export function getEmailLocalPart(email: string): string {
  return email.split('@')[0];
}

/**
 * Resolves the best display name for a participant
 * Priority: macroDisplayName > participant.name > email local part
 */
export function resolveParticipantName(
  participant: { email: string; name: string },
  macroDisplayName?: string
): string {
  // Prefer macro display name if it's not an email
  if (macroDisplayName && !isLikelyEmail(macroDisplayName)) {
    return macroDisplayName;
  }

  // Fall back to participant's full name if it's not an email
  const participantFullName = participant.name ?? '';
  if (participantFullName && !isLikelyEmail(participantFullName)) {
    return participantFullName;
  }

  // Last resort: use email local part
  return getEmailLocalPart(participant.email);
}

/**
 * Combines participant names into a list, handling the "me" case
 * Returns an array of display names (possibly ["me"] if single participant is userEmail)
 */
export function combineParticipantNames(
  participants: Array<{ email: string; name: string }> | undefined,
  userEmail: string | undefined,
  getMacroDisplayName: (email: string) => string | undefined
): string[] {
  if (!participants || participants.length === 0) {
    return [];
  }

  // Special case: single participant is the user
  if (
    participants.length === 1 &&
    userEmail &&
    participants[0].email === userEmail
  ) {
    return ['me'];
  }

  const namesSet = new Set<string>();

  for (const participant of participants) {
    if (!participant.email) continue;

    // Skip the current user in multi-participant threads
    if (userEmail && participant.email === userEmail) continue;

    const macroDisplayName = getMacroDisplayName(participant.email);
    const displayName = resolveParticipantName(participant, macroDisplayName);

    namesSet.add(displayName);
  }

  return Array.from(namesSet);
}

/**
 * Formats display names into a string suitable for UI display
 * - Single name: returns as-is
 * - 2-3 names: comma-separated with first names only
 * - 4+ names: "First .. SecondLast, Last" format with first names
 */
export function formatDisplayNames(names: string[]): string | undefined {
  if (!names || names.length === 0) return undefined;
  if (names.length === 1) return names[0];

  // For multiple participants, use first names only
  const firstNames = names.map((name) => name.split(' ')[0]);

  if (firstNames.length <= 3) {
    return firstNames.join(', ');
  }

  // For 4+ participants: "First .. SecondLast, Last"
  return `${firstNames[0]} .. ${firstNames[firstNames.length - 2]}, ${firstNames[firstNames.length - 1]}`;
}
