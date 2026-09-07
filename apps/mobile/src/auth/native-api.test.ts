jest.mock('./session-store', () => ({
  clearNativeSession: jest.fn(async () => undefined),
  getNativeRefreshToken: jest.fn(async () => 'r'.repeat(32)),
  saveNativeSession: jest.fn(async () => undefined),
}));

import * as mockSessionStore from './session-store';

import {
  nativeLogin,
  nativeRefresh,
  requestRegistrationVerification,
  verifyRegistrationCode,
} from './native-api';

const session = {
  accessToken: 'access-token',
  refreshToken: 'r'.repeat(32),
  user: { id: 'user-1', email: 'a@b.com', name: 'A', roles: ['USER'] },
};

describe('native auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and stores a native session without browser-only headers', async () => {
    globalThis.fetch = jest.fn(async () => ({ ok: true, json: async () => session })) as jest.Mock;
    await expect(nativeLogin('a@b.com', 'password')).resolves.toEqual(session);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/auth/native/login'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(mockSessionStore.saveNativeSession).toHaveBeenCalledWith('access-token', 'r'.repeat(32));
  });

  it('clears rotated credentials when native refresh is rejected', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      json: async () => ({ message: 'expired' }),
    })) as jest.Mock;
    await expect(nativeRefresh()).rejects.toThrow('expired');
    expect(mockSessionStore.clearNativeSession).toHaveBeenCalledTimes(1);
  });

  it('requests and verifies email without exposing registration proof to storage', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ registrationProof: 'proof-token' }) });
    await requestRegistrationVerification('a@b.com');
    await expect(verifyRegistrationCode('a@b.com', '123456')).resolves.toEqual({
      registrationProof: 'proof-token',
    });
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/users/verification'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/users/verification'),
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(mockSessionStore.saveNativeSession).not.toHaveBeenCalled();
  });
});
