/**
 * Haptic feedback utility
 *
 * Uses the Vibration API when available. Falls back to no-op silently.
 */

export const haptics = {
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(20),
  heavy: () => navigator.vibrate?.(40),
  error: () => navigator.vibrate?.([10, 50, 10]),
  success: () => navigator.vibrate?.([20, 20, 20, 20, 20]),
};
