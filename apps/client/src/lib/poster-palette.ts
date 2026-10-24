export type PosterPalette = {
  background: string;
  accent: string;
};

const palettes: readonly PosterPalette[] = [
  { background: '#3b0d18', accent: '#ff4d6d' },
  { background: '#1b1440', accent: '#8b7cff' },
  { background: '#13261c', accent: '#34d399' },
  { background: '#2a1608', accent: '#f59e0b' },
  { background: '#102033', accent: '#38bdf8' },
  { background: '#2a1028', accent: '#f472b6' },
  { background: '#23180a', accent: '#f5c518' },
  { background: '#3f1010', accent: '#ef4444' },
];

export function posterMonogram(title: string): string {
  const cleaned = title.replace(/^\s*the\s+/i, '').trim();
  return (cleaned.charAt(0) || title.charAt(0) || 'D').toUpperCase();
}

export function posterPalette(title: string): PosterPalette {
  const seed = title.replace(/^\s*the\s+/i, '').trim() || title;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return palettes[hash % palettes.length] ?? palettes[0];
}
