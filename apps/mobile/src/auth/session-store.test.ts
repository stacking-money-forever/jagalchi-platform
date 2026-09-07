jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => 'stored-token'),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import * as SecureStore from 'expo-secure-store';

import { clearNativeSession, getNativeAccessToken, saveNativeSession } from './session-store';

describe('native session store', () => {
  it('stores secrets only through SecureStore and clears both values', async () => {
    await saveNativeSession('access', 'refresh');
    await expect(getNativeAccessToken()).resolves.toBe('stored-token');
    await clearNativeSession();
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
  });
});
