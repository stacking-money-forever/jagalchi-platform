import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renewWebSessionOnce } from './session-renewal-coordinator';

describe('renewWebSessionOnce', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('coalesces concurrent callers into one refresh request', async () => {
    let release: ((response: Response) => void) | undefined;
    const refresh = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetchMock = vi.fn<typeof fetch>((input) => {
      if (String(input).endsWith('/csrf-token'))
        return Promise.resolve(Response.json({ token: 'csrf' }));
      return refresh;
    });
    vi.stubGlobal('fetch', fetchMock);
    const first = renewWebSessionOnce();
    const second = renewWebSessionOnce();
    release?.(new Response(null, { status: 204 }));
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
