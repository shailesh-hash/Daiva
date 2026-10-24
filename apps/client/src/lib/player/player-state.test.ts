import { describe, expect, it } from 'vitest';

import { createPlayerSnapshot, reducePlayerSnapshot } from './player-state';

describe('reducePlayerSnapshot', () => {
  it('moves through loading, ready, playing, and ended', () => {
    let state = createPlayerSnapshot();
    state = reducePlayerSnapshot(state, { type: 'load' });
    expect(state.phase).toBe('loading');

    state = reducePlayerSnapshot(state, { type: 'ready', durationSeconds: 4 });
    expect(state.phase).toBe('ready');
    expect(state.durationSeconds).toBe(4);

    state = reducePlayerSnapshot(state, { type: 'play' });
    state = reducePlayerSnapshot(state, { type: 'playing' });
    expect(state.phase).toBe('playing');

    state = reducePlayerSnapshot(state, {
      type: 'progress',
      positionSeconds: 2,
      bufferedSeconds: 3,
    });
    expect(state.positionSeconds).toBe(2);
    expect(state.bufferedSeconds).toBe(3);

    state = reducePlayerSnapshot(state, { type: 'ended' });
    expect(state.phase).toBe('ended');
  });

  it('reports buffering and playback errors', () => {
    let state = createPlayerSnapshot();
    state = reducePlayerSnapshot(state, { type: 'play' });
    state = reducePlayerSnapshot(state, { type: 'waiting' });
    expect(state.phase).toBe('buffering');

    state = reducePlayerSnapshot(state, { type: 'error', message: 'Sample source failed' });
    expect(state.phase).toBe('error');
    expect(state.errorMessage).toBe('Sample source failed');
  });

  it('keeps mute, volume, and caption flags', () => {
    let state = createPlayerSnapshot();
    state = reducePlayerSnapshot(state, { type: 'mute', muted: true });
    state = reducePlayerSnapshot(state, { type: 'volume', volume: 1.8 });
    state = reducePlayerSnapshot(state, { type: 'captions', enabled: true });

    expect(state.muted).toBe(true);
    expect(state.volume).toBe(1);
    expect(state.captionsEnabled).toBe(true);
  });
});
