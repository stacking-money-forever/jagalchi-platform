import { describe, expect, it } from 'vitest';

import { NODE_COLOR_CLASSES, getNodeColors } from './node-colors';

describe('getNodeColors', () => {
  it('preserves the configured classes for legacy variants', () => {
    expect(getNodeColors('blue', 'default')).toEqual(NODE_COLOR_CLASSES.blue.default);
  });

  it('uses the neutral white classes for missing or unknown variants', () => {
    expect(getNodeColors(undefined, 'default')).toEqual(NODE_COLOR_CLASSES.white.default);
    expect(getNodeColors('task', 'focus')).toEqual(NODE_COLOR_CLASSES.white.focus);
  });
});
