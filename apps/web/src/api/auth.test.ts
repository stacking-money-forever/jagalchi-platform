import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  apiClient: {
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  },
  refreshAccessToken: vi.fn(),
}));

import { apiClient, refreshAccessToken as refreshAccessTokenClient } from './client';
import {
  login,
  signUp,
  sendVerificationCode,
  verifyCode,
  sendPasswordResetCode,
  verifyPasswordResetCode,
  resetPassword,
  refreshToken,
  logout,
  deleteAccount,
  getGoogleOAuthUrl,
  getGithubOAuthUrl,
  getAppleOAuthUrl,
  exchangeOAuthCode,
} from './auth';

describe('auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login calls POST /users/auth/login', () => {
    login({ email: 'a@b.com', password: '1234' });
    expect(apiClient.post).toHaveBeenCalledWith('/users/auth/login', {
      email: 'a@b.com',
      password: '1234',
    });
  });

  it('signUp calls POST /users', () => {
    vi.mocked(apiClient.post).mockResolvedValue({ authenticated: true });
    signUp({
      email: 'a@b.com',
      name: 'test',
      password: '1234',
      registrationProof: 'proof',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/users', {
      email: 'a@b.com',
      name: 'test',
      password: '1234',
      registrationProof: 'proof',
    });
  });

  it('sendVerificationCode calls POST /users/verification', () => {
    sendVerificationCode({ email: 'a@b.com' });
    expect(apiClient.post).toHaveBeenCalledWith('/users/verification', { email: 'a@b.com' });
  });

  it('verifyCode calls PATCH /users/verification', () => {
    verifyCode({ email: 'a@b.com', code: '123456' });
    expect(apiClient.patch).toHaveBeenCalledWith('/users/verification', {
      email: 'a@b.com',
      code: '123456',
    });
  });

  it('sendPasswordResetCode calls POST /users/auth/password-reset', () => {
    sendPasswordResetCode({ email: 'a@b.com' });
    expect(apiClient.post).toHaveBeenCalledWith('/users/auth/password-reset', {
      email: 'a@b.com',
    });
  });

  it('verifyPasswordResetCode calls PATCH /users/auth/password-reset/verify', () => {
    verifyPasswordResetCode({ email: 'a@b.com', code: '123456' });
    expect(apiClient.patch).toHaveBeenCalledWith('/users/auth/password-reset/verify', {
      email: 'a@b.com',
      code: '123456',
    });
  });

  it('resetPassword calls PATCH /users/auth/password-reset', () => {
    resetPassword({
      email: 'a@b.com',
      newPassword: 'newpass',
      resetProof: 'reset-proof',
    });
    expect(apiClient.patch).toHaveBeenCalledWith('/users/auth/password-reset', {
      email: 'a@b.com',
      newPassword: 'newpass',
      resetProof: 'reset-proof',
    });
  });

  it('refreshToken uses the shared refresh coordinator', async () => {
    vi.mocked(refreshAccessTokenClient).mockResolvedValue({
      status: 'refreshed',
      session: { authenticated: true },
    });

    await expect(refreshToken()).resolves.toEqual({ authenticated: true });
    expect(refreshAccessTokenClient).toHaveBeenCalledTimes(1);
  });

  it('logout calls POST /users/auth/logout', () => {
    logout();
    expect(apiClient.post).toHaveBeenCalledWith('/users/auth/logout');
  });

  it('deleteAccount calls DELETE /users', () => {
    deleteAccount();
    expect(apiClient.delete).toHaveBeenCalledWith('/users');
  });

  it('getGoogleOAuthUrl returns correct URL', () => {
    const url = getGoogleOAuthUrl();
    expect(url).toContain('/users/auth/login/google');
  });

  it('getGithubOAuthUrl returns correct URL', () => {
    const url = getGithubOAuthUrl();
    expect(url).toContain('/users/auth/login/github');
  });

  it('getAppleOAuthUrl returns correct URL', () => {
    const url = getAppleOAuthUrl();
    expect(url).toContain('/users/auth/login/apple');
  });

  it('exchangeOAuthCode posts the one-time callback code', () => {
    exchangeOAuthCode('oauth-code');
    expect(apiClient.post).toHaveBeenCalledWith('/users/auth/oauth/exchange', {
      code: 'oauth-code',
    });
  });
});
