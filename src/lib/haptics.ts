/** Milestone-tap haptic. iOS Safari has no vibrate API; this is a no-op there. */
export function vibrate(ms = 30): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}
