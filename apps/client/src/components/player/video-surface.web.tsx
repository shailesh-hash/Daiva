import { default as HlsJs } from 'hls.js';
import { createElement, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import type { VideoSurfaceProps } from './video-surface-types';

type HtmlVideo = {
  src: string;
  poster: string;
  muted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  paused: boolean;
  textTracks: { length: number; [index: number]: { mode: string } };
  play(): Promise<void>;
  pause(): void;
  load(): void;
  canPlayType(type: string): string;
  addEventListener(name: string, handler: () => void): void;
  removeEventListener(name: string, handler: () => void): void;
};

export function VideoSurface({
  sourceUri,
  posterUri,
  captionsVtt,
  contentType,
  title,
  command,
  onEvent,
}: VideoSurfaceProps) {
  const videoRef = useRef<HtmlVideo | null>(null);
  const hlsRef = useRef<HlsJs | null>(null);
  const captionsUrlRef = useRef<string | null>(null);
  const lastSeekToken = useRef(0);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const emit = (handler: () => void) => handler();
    const onLoadStart = () => onEventRef.current({ type: 'load' });
    const onLoaded = () =>
      onEventRef.current({
        type: 'ready',
        durationSeconds: Number.isFinite(video.duration) ? video.duration : 0,
      });
    const onWaiting = () => onEventRef.current({ type: 'waiting' });
    const onPlaying = () => onEventRef.current({ type: 'playing' });
    const onPause = () => {
      if (!video.paused) {
        return;
      }
      onEventRef.current({ type: 'pause' });
    };
    const onEnded = () => onEventRef.current({ type: 'ended' });
    const onError = () =>
      onEventRef.current({ type: 'error', message: 'The sample video could not be decoded.' });
    const onTime = () => {
      const buffered = video.duration > 0 ? video.duration : 0;
      onEventRef.current({
        type: 'progress',
        positionSeconds: video.currentTime,
        bufferedSeconds: buffered,
      });
    };

    video.addEventListener('loadstart', onLoadStart);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('canplay', onLoaded);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    video.addEventListener('timeupdate', onTime);

    return () => {
      video.removeEventListener('loadstart', onLoadStart);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('canplay', onLoaded);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      video.removeEventListener('timeupdate', onTime);
      emit(() => undefined);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (!sourceUri) {
      onEventRef.current({
        type: 'error',
        message: 'No playable sample URI is available on web.',
      });
      return;
    }

    onEventRef.current({ type: 'load' });

    if (contentType === 'hls') {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sourceUri;
        video.load();
        return;
      }

      if (HlsJs.isSupported()) {
        const hls = new HlsJs({ enableWorker: true });
        hlsRef.current = hls;
        hls.on(HlsJs.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            onEventRef.current({ type: 'error', message: 'HLS sample playback failed.' });
          }
        });
        hls.loadSource(sourceUri);
        hls.attachMedia(video as never);
        return;
      }

      onEventRef.current({
        type: 'error',
        message: 'This browser cannot play HLS sample streams.',
      });
      return;
    }

    video.src = sourceUri;
    video.load();

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [contentType, sourceUri]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !captionsVtt) {
      return;
    }

    if (captionsUrlRef.current) {
      URL.revokeObjectURL(captionsUrlRef.current);
    }
    const url = URL.createObjectURL(new Blob([captionsVtt], { type: 'text/vtt' }));
    captionsUrlRef.current = url;

    const node = video as unknown as {
      ownerDocument: {
        createElement(name: string): {
          kind: string;
          src: string;
          srclang: string;
          label: string;
        };
      };
      appendChild(child: unknown): void;
      querySelectorAll(sel: string): { forEach(cb: (n: { remove(): void }) => void): void };
    };
    node.querySelectorAll('track').forEach((item) => item.remove());
    const track = node.ownerDocument.createElement('track');
    track.kind = 'subtitles';
    track.src = url;
    track.srclang = 'en';
    track.label = 'English sample captions';
    node.appendChild(track);

    return () => {
      if (captionsUrlRef.current) {
        URL.revokeObjectURL(captionsUrlRef.current);
        captionsUrlRef.current = null;
      }
    };
  }, [captionsVtt]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = command.muted;
    video.volume = command.volume;
    if (video.textTracks.length > 0) {
      video.textTracks[0].mode = command.captionsEnabled ? 'showing' : 'hidden';
    }

    if (command.seekToken !== lastSeekToken.current) {
      lastSeekToken.current = command.seekToken;
      video.currentTime = command.seekSeconds;
    }

    if (command.intent === 'play' && video.paused) {
      void video.play().catch(() => {
        onEventRef.current({
          type: 'error',
          message: 'The browser blocked sample playback. Try the play control again.',
        });
      });
    }

    if (command.intent === 'pause' && !video.paused) {
      video.pause();
    }
  }, [command]);

  return (
    <View style={styles.fill}>
      {createElement('video', {
        ref: videoRef,
        poster: posterUri,
        playsInline: true,
        preload: 'metadata',
        controls: false,
        'aria-label': `Sample video player for ${title}`,
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#161310',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
