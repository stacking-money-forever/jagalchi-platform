import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OperationStatusPanel } from './operation-status-panel';

describe('OperationStatusPanel cancellation copy', () => {
  it('keeps a cancellation request distinct from a completed cancellation', () => {
    const { rerender } = render(<OperationStatusPanel cancellation="requested" />);
    expect(screen.getByRole('status')).toHaveTextContent('취소를 요청했습니다');
    expect(screen.getByRole('status')).not.toHaveTextContent('작업이 취소됐습니다');

    rerender(<OperationStatusPanel cancellation="completed" />);
    expect(screen.getByRole('status')).toHaveTextContent('작업이 취소됐습니다');
  });
});
