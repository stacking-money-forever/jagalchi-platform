import { describe, expect, it } from 'vitest';

import {
  parseDiffGaps,
  parseProfileFindings,
  parseProfileRepositories,
  parseTargetHeader,
} from './snapshot-payload';

describe('snapshot payload parsers', () => {
  it('parses profile repositories and findings with status buckets', () => {
    const repos = parseProfileRepositories({
      repositories: [{ id: 'r1', fullName: 'acme/app' }],
    });
    const findings = parseProfileFindings({
      interpretation: {
        findings: [
          { id: 'f1', label: 'React', status: 'OBSERVED' },
          { id: 'f2', label: 'K8s', status: 'INFERRED' },
        ],
      },
    });

    expect(repos).toEqual([{ id: 'r1', fullName: 'acme/app' }]);
    expect(findings.map((item) => item.status)).toEqual(['OBSERVED', 'INFERRED']);
  });

  it('parses diff gaps and target header with fallbacks', () => {
    const gaps = parseDiffGaps({
      missing: [{ id: 'g1', competencyId: 'c1', description: 'CI', status: 'MISSING' }],
    });
    const header = parseTargetHeader({ company: 'Acme', role: 'Backend' });

    expect(gaps[0]?.description).toBe('CI');
    expect(header).toEqual({ company: 'Acme', role: 'Backend' });
  });
});
