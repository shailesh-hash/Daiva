import { describe, expect, it } from 'vitest';

import { isPlaybackComplete, shouldPersistRemoteProgress, shouldRecordProgress } from './progress';

describe('isPlaybackComplete', () => {
  it('marks near-end playback as complete', () => {
    expect(isPlaybackComplete(3.2, 4)).toBe(true);
    expect(isPlaybackComplete(19, 20)).toBe(true);
    expect(isPlaybackComplete(1, 4)).toBe(false);
    expect(isPlaybackComplete(0, 0)).toBe(false);
  });
});

describe('shouldRecordProgress', () => {
  it('throttles progress writes to the interval', () => {
    expect(shouldRecordProgress(1, 1.4)).toBe(false);
    expect(shouldRecordProgress(1, 2.1)).toBe(true);
  });
});

describe('shouldPersistRemoteProgress', () => {
  it('avoids a request on every second and always persists completion', () => {
    expect(shouldPersistRemoteProgress(10, 14, false)).toBe(false);
    expect(shouldPersistRemoteProgress(10, 21, false)).toBe(true);
    expect(shouldPersistRemoteProgress(10, 11, true)).toBe(true);
  });
});
