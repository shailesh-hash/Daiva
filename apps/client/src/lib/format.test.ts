import { describe, expect, it } from 'vitest';

import { formatDuration, formatLanguage } from './format';

describe('formatDuration', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatDuration(95)).toBe('1:35');
    expect(formatDuration(8)).toBe('0:08');
  });
});

describe('formatLanguage', () => {
  it('maps known language codes', () => {
    expect(formatLanguage('kn')).toBe('Kannada');
    expect(formatLanguage('en')).toBe('English');
  });
});
