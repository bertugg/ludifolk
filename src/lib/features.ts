/**
 * Switches for parts of the app that are built but temporarily turned off.
 * Flip a value to true to bring that feature back; its code stays in place.
 */
export const FEATURES = {
  /** The Achievements badge grid on profiles. */
  achievements: false,
  /** The Challenges checklist on your own profile. */
  challenges: false,
} as const;
