import { describe, expect, it } from 'vitest';

import { posterMonogram, posterPalette } from './poster-palette';

describe('posterPalette', () => {
  it('returns a stable cinematic palette for the same title', () => {
    expect(posterPalette('The Lamp at Dusk')).toEqual(posterPalette('The Lamp at Dusk'));
  });

  it('returns a cinematic palette with background and accent colors', () => {
    const palette = posterPalette('The Lamp at Dusk');
    expect(palette.background).toMatch(/^#[0-9a-f]{6}$/);
    expect(palette.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(posterPalette('A')).not.toEqual(posterPalette('Z'));
  });

  it('uses the first meaningful letter as the poster monogram', () => {
    expect(posterMonogram('The Lamp at Dusk')).toBe('L');
    expect(posterMonogram('River Crossing')).toBe('R');
  });
});
