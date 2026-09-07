import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'jagalchi.native.access-token';
const REFRESH_TOKEN_KEY = 'jagalchi.native.refresh-token';

export async function saveNativeSession(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

export function getNativeAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function getNativeRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getNativeSession(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const [accessToken, refreshToken] = await Promise.all([
    getNativeAccessToken(),
    getNativeRefreshToken(),
  ]);
  return { accessToken, refreshToken };
}

export async function clearNativeSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
