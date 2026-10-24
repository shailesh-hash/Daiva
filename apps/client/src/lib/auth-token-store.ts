const memory = new Map<string, string>();

export async function readAuthValue(key: string): Promise<string | undefined> {
  return memory.get(key);
}

export async function writeAuthValue(key: string, value: string): Promise<void> {
  memory.set(key, value);
}

export async function deleteAuthValue(key: string): Promise<void> {
  memory.delete(key);
}
