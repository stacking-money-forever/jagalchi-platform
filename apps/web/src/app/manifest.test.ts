import { describe, expect, it } from 'vitest';

import manifest from './manifest';

describe('web app manifest', () => {
  it('provides installable PNG icons without opting into offline caching', () => {
    const value = manifest();

    expect(value).toMatchObject({
      id: '/',
      start_url: '/',
      scope: '/',
      display: 'standalone',
    });
    expect(value.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/pwa-icon-192.png', sizes: '192x192' }),
        expect.objectContaining({ src: '/pwa-icon-512.png', sizes: '512x512' }),
        expect.objectContaining({
          src: '/pwa-icon-maskable-512.png',
          sizes: '512x512',
          purpose: 'maskable',
        }),
      ]),
    );
    expect(value).not.toHaveProperty('serviceworker');
  });
});
