export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatLanguage(code: string): string {
  if (code === 'kn') {
    return 'Kannada';
  }
  if (code === 'en') {
    return 'English';
  }
  return code;
}
