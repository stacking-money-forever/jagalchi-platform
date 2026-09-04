import { describe, expect, it } from 'vitest';

import { ApiResponseError } from '@jagalchi/api-client';

import {
  isManualCaptureSuggested,
  mapApiGateError,
  mapWorkflowOperationFailure,
} from './operation-errors';

describe('operation error mapping', () => {
  it('maps workflow failure codes to localized copy', () => {
    const view = mapWorkflowOperationFailure({ code: 'TARGET_FETCH_FAILED', retryable: true });
    expect(view.retryable).toBe(true);
    expect(view.title).toContain('가져오지');
  });

  it('maps entitlement and feature gate API errors', () => {
    const blocked = mapApiGateError(new ApiResponseError(503, 'PROJECT_RUNS_DISABLED', 'disabled'));
    expect(blocked?.blocked).toBe('PROJECT_RUNS_DISABLED');
  });

  it('suggests manual capture for fetch failures', () => {
    expect(isManualCaptureSuggested('TARGET_FETCH_FAILED')).toBe(true);
    expect(isManualCaptureSuggested('AI_SERVICE_UNAVAILABLE')).toBe(false);
  });
});
