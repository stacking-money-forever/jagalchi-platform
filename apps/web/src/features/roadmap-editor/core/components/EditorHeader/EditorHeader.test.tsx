import { render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { describe, expect, it, vi } from 'vitest';

import { REALTIME_MESSAGES } from '@/constants/messages';

import { EditorHeader } from '.';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

describe('EditorHeader', () => {
  const renderHeader = (props: React.ComponentProps<typeof EditorHeader> = {}) => {
    return render(
      <Provider>
        <EditorHeader {...props} />
      </Provider>,
    );
  };

  it('renders without crashing', () => {
    const { container } = renderHeader();
    expect(container).toBeInTheDocument();
  });

  it('renders as a header element', () => {
    renderHeader();
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe('HEADER');
  });

  it('renders back button', () => {
    renderHeader();
    const backButton = screen.getByLabelText('뒤로가기');
    expect(backButton).toBeInTheDocument();
  });

  it('renders title text', () => {
    renderHeader();
    const title = screen.getByText('새 실행 과제');
    expect(title).toBeInTheDocument();
  });

  it('has floating box layout classes', () => {
    renderHeader();
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('absolute');
    expect(header).toHaveClass('top-3');
    expect(header).toHaveClass('left-3');
    expect(header).toHaveClass('rounded-lg');
    expect(header).toHaveClass('shadow-md');
  });

  it('keeps mobile header content within the viewport', () => {
    renderHeader({ isConnected: false, roadmapId: 'roadmap-1' });

    const header = screen.getByRole('banner');
    expect(header).toHaveClass('w-[calc(100vw-1.5rem)]', 'sm:w-auto');
    expect(header.firstElementChild).toHaveClass('w-full', 'min-w-0', 'sm:w-auto');
    expect(screen.getByText('새 실행 과제')).toHaveClass('min-w-0', 'flex-1', 'truncate');
    expect(screen.getByText('편집 중')).toHaveClass('hidden', 'shrink-0', 'sm:inline');
    expect(screen.getByText(REALTIME_MESSAGES.CONNECTION_DISCONNECTED)).toHaveClass(
      'hidden',
      'sm:inline',
    );
    expect(screen.getByLabelText(REALTIME_MESSAGES.CONNECTION_DISCONNECTED)).toBeInTheDocument();
    expect(screen.getByLabelText('뒤로가기')).toHaveClass('shrink-0');
    expect(screen.getByLabelText('뷰어 미리보기')).toHaveClass('shrink-0');
  });

  it('is a memo component', () => {
    expect(typeof EditorHeader).toBe('object');
  });
});
