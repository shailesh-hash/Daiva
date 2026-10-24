import { describe, expect, it } from 'vitest';

import {
  assertAllowedSampleMediaUri,
  inferSampleContentType,
  resolveConfiguredSampleUri,
} from './sample-source';

describe('assertAllowedSampleMediaUri', () => {
  it('allows bundled-style and localhost URIs', () => {
    expect(assertAllowedSampleMediaUri('/assets/sample/sample.mp4')).toBe(
      '/assets/sample/sample.mp4',
    );
    expect(assertAllowedSampleMediaUri('http://localhost:8081/sample.mp4')).toContain('localhost');
    expect(assertAllowedSampleMediaUri('http://127.0.0.1:4173/sample.m3u8')).toContain('127.0.0.1');
  });

  it('rejects unauthorized third-party video hosts', () => {
    expect(() => assertAllowedSampleMediaUri('https://www.youtube.com/watch?v=abc')).toThrow(
      /third-party/i,
    );
    expect(() => assertAllowedSampleMediaUri('https://cdn.example.com/video.mp4')).toThrow(
      /localhost/i,
    );
  });
});

describe('resolveConfiguredSampleUri', () => {
  it('treats a blank env value as the bundled clip', () => {
    expect(resolveConfiguredSampleUri(undefined)).toBeUndefined();
    expect(resolveConfiguredSampleUri('   ')).toBeUndefined();
  });
});

describe('inferSampleContentType', () => {
  it('detects HLS manifests', () => {
    expect(inferSampleContentType('http://localhost/master.m3u8?token=1')).toBe('hls');
    expect(inferSampleContentType('/assets/sample/sample.mp4')).toBe('mp4');
  });
});
