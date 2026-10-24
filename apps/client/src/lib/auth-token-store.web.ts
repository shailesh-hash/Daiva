const PREFIX = 'daiva.auth.';

export async function readAuthValue(key: string): Promise<string | undefined> {
  if (typeof sessionStorage === 'undefined') {
    return undefined;
  }
  return sessionStorage.getItem(`${PREFIX}${key}`) ?? undefined;
}

export async function writeAuthValue(key: string, value: string): Promise<void> {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(`${PREFIX}${key}`, value);
}

export async function deleteAuthValue(key: string): Promise<void> {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(`${PREFIX}${key}`);
}
