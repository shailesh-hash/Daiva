export type PlayerPhase =
  'idle' | 'loading' | 'buffering' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';

export type PlayerSnapshot = {
  phase: PlayerPhase;
  positionSeconds: number;
  durationSeconds: number;
  bufferedSeconds: number;
  muted: boolean;
  volume: number;
  captionsEnabled: boolean;
  errorMessage?: string;
};

export type PlayerEvent =
  | { type: 'load' }
  | { type: 'ready'; durationSeconds: number }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'waiting' }
  | { type: 'playing' }
  | { type: 'ended' }
  | { type: 'error'; message: string }
  | { type: 'progress'; positionSeconds: number; bufferedSeconds?: number }
  | { type: 'duration'; durationSeconds: number }
  | { type: 'mute'; muted: boolean }
  | { type: 'volume'; volume: number }
  | { type: 'captions'; enabled: boolean }
  | { type: 'reset' };

export function createPlayerSnapshot(): PlayerSnapshot {
  return {
    phase: 'idle',
    positionSeconds: 0,
    durationSeconds: 0,
    bufferedSeconds: 0,
    muted: false,
    volume: 1,
    captionsEnabled: false,
  };
}

export function reducePlayerSnapshot(state: PlayerSnapshot, event: PlayerEvent): PlayerSnapshot {
  switch (event.type) {
    case 'reset':
      return createPlayerSnapshot();
    case 'load':
      return { ...state, phase: 'loading', errorMessage: undefined };
    case 'ready':
      return {
        ...state,
        phase: state.phase === 'playing' ? 'playing' : 'ready',
        durationSeconds: event.durationSeconds,
        errorMessage: undefined,
      };
    case 'play':
      return {
        ...state,
        phase: state.phase === 'loading' ? 'loading' : 'playing',
        errorMessage: undefined,
      };
    case 'pause':
      return { ...state, phase: state.phase === 'error' ? 'error' : 'paused' };
    case 'waiting':
      return { ...state, phase: 'buffering' };
    case 'playing':
      return { ...state, phase: 'playing', errorMessage: undefined };
    case 'ended':
      return { ...state, phase: 'ended' };
    case 'error':
      return { ...state, phase: 'error', errorMessage: event.message };
    case 'progress':
      return {
        ...state,
        positionSeconds: event.positionSeconds,
        bufferedSeconds: event.bufferedSeconds ?? state.bufferedSeconds,
      };
    case 'duration':
      return { ...state, durationSeconds: event.durationSeconds };
    case 'mute':
      return { ...state, muted: event.muted };
    case 'volume':
      return { ...state, volume: clampVolume(event.volume) };
    case 'captions':
      return { ...state, captionsEnabled: event.enabled };
  }
}

export function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) {
    return 0;
  }
  return Math.min(1, Math.max(0, volume));
}
