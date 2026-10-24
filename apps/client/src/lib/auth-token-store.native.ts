import * as SecureStore from 'expo-secure-store';

const PREFIX = 'daiva.auth.';

export async function readAuthValue(key: string): Promise<string | undefined> {
  return (await SecureStore.getItemAsync(`${PREFIX}${key}`)) ?? undefined;
}

export async function writeAuthValue(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(`${PREFIX}${key}`, value);
}

export async function deleteAuthValue(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(`${PREFIX}${key}`);
}
