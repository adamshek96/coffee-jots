/**
 * Keep the screen awake during a live roast.
 * Uses the Wake Lock API (iOS 16.4+, Chrome, Edge) and re-acquires the lock
 * whenever the page becomes visible again. On browsers without the API this
 * degrades to a no-op — the roast itself survives the screen sleeping because
 * elapsed time is recomputed from startedAt, never counted.
 */
export function keepAwake(): () => void {
  let lock: WakeLockSentinel | null = null;
  let released = false;

  const acquire = async () => {
    if (released || document.visibilityState !== "visible") return;
    try {
      lock = await navigator.wakeLock?.request("screen");
    } catch {
      /* denied or unsupported */
    }
  };

  const onVisible = () => void acquire();

  void acquire();
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    released = true;
    document.removeEventListener("visibilitychange", onVisible);
    void lock?.release().catch(() => {});
    lock = null;
  };
}
