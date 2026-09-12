import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('public Proof Profile API base', () => {
  it('adds the API prefix when the server is configured with an origin', async () => {
    vi.stubEnv('API_ORIGIN', 'https://jagalchi-api.justn.me');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '/api');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          schemaVersion: 1,
          profile: {
            publicId: '62342qFKStoh8WUcRCGPaL5TSbE',
            displayName: 'Jagalchi QA',
            summary: null,
          },
          proofs: [
            {
              publicProofId: '9d3rjrLtMLYngyZdwatR3GqPn8M',
              title: 'Verified project',
              summary: null,
              competencyLabel: 'Verified project delivery',
              provider: 'GITHUB',
              verification: { status: 'VERIFIED', verifiedAt: '2026-09-12T08:52:35.135Z' },
              criteria: { passedCount: 1, totalCount: 1, types: ['MERGED_PR'] },
            },
          ],
          updatedAt: '2026-09-12T09:11:21.537Z',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { getPublicProofProfile } = await import('./proof-profile');
    await getPublicProofProfile('62342qFKStoh8WUcRCGPaL5TSbE');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://jagalchi-api.justn.me/api/career/proof-profiles/62342qFKStoh8WUcRCGPaL5TSbE',
      expect.objectContaining({ cache: 'no-store', method: 'GET' }),
    );
  });
});
