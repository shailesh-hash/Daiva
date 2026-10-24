export function isPlaybackComplete(positionSeconds: number, durationSeconds: number): boolean {
  if (durationSeconds <= 0 || positionSeconds < 0) {
    return false;
  }

  return positionSeconds >= durationSeconds - 1 || positionSeconds / durationSeconds >= 0.95;
}

export function shouldRecordProgress(
  lastRecordedSeconds: number,
  nextSeconds: number,
  intervalSeconds = 1,
): boolean {
  return Math.abs(nextSeconds - lastRecordedSeconds) >= intervalSeconds;
}

export const REMOTE_PROGRESS_INTERVAL_SECONDS = 10;

export function shouldPersistRemoteProgress(
  lastPersistedSeconds: number,
  nextSeconds: number,
  completed: boolean,
  intervalSeconds = REMOTE_PROGRESS_INTERVAL_SECONDS,
): boolean {
  return completed || shouldRecordProgress(lastPersistedSeconds, nextSeconds, intervalSeconds);
}
