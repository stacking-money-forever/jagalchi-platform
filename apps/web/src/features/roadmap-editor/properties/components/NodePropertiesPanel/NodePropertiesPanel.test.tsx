import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { uploadRoadmapAttachment } from '@/api/uploads';

import { NodePropertiesPanel } from '.';

import { nodesAtom } from '../../../stores/editor-atoms';

import type { JagalchiNodeType } from '../../../types/editor.types';

vi.mock('@/api/uploads', () => ({ uploadRoadmapAttachment: vi.fn() }));

const mockNode: JagalchiNodeType = {
  id: 'node-1',
  type: 'jagalchi-node',
  position: { x: 0, y: 0 },
  data: {
    label: 'Test Node',
    description: 'Test Description',
    variant: 'blue',
    isLocked: false,
    resources: ['https://example.com', '', ''],
  },
};

const renderWithProvider = (node: JagalchiNodeType) => {
  const store = createStore();
  store.set(nodesAtom, [node]);

  return {
    store,
    ...render(
      <Provider store={store}>
        <NodePropertiesPanel node={node} roadmapId="11111111-1111-4111-8111-111111111111" />
      </Provider>,
    ),
  };
};

describe('NodePropertiesPanel', () => {
  beforeEach(() => {
    vi.mocked(uploadRoadmapAttachment).mockReset();
  });

  it('renders node header with label', () => {
    renderWithProvider(mockNode);
    expect(screen.getByText('Test Node')).toBeInTheDocument();
  });

  it('renders lock button', () => {
    renderWithProvider(mockNode);
    expect(screen.getByRole('button', { name: /잠금/ })).toBeInTheDocument();
  });

  it('renders node name input', () => {
    renderWithProvider(mockNode);
    expect(screen.getByDisplayValue('Test Node')).toBeInTheDocument();
  });

  it('renders node description textarea', () => {
    renderWithProvider(mockNode);
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
  });

  it('renders 3 resource input fields', () => {
    renderWithProvider(mockNode);
    const resourceInputs = screen.getAllByPlaceholderText('URL을 입력하세요');
    expect(resourceInputs).toHaveLength(3);
  });

  it('renders attachment upload button', () => {
    renderWithProvider(mockNode);
    expect(screen.getByRole('button', { name: '파일 첨부' })).toBeInTheDocument();
  });

  it('disables inputs when node is locked', () => {
    const lockedNode = { ...mockNode, data: { ...mockNode.data, isLocked: true } };
    renderWithProvider(lockedNode);

    const nameInput = screen.getByDisplayValue('Test Node');
    expect(nameInput).toBeDisabled();

    const descriptionInput = screen.getByDisplayValue('Test Description');
    expect(descriptionInput).toBeDisabled();
  });

  it('allows user to interact with name input when unlocked', async () => {
    const user = userEvent.setup();
    renderWithProvider(mockNode);

    const nameInput = screen.getByDisplayValue('Test Node');
    expect(nameInput).not.toBeDisabled();

    // Verify input can receive focus
    await user.click(nameInput);
    expect(nameInput).toHaveFocus();
  });

  it('shows unlock icon when node is unlocked', () => {
    renderWithProvider(mockNode);
    expect(screen.getByRole('button', { name: /잠금/ })).toBeInTheDocument();
  });

  it('shows lock icon when node is locked', () => {
    const lockedNode = { ...mockNode, data: { ...mockNode.data, isLocked: true } };
    renderWithProvider(lockedNode);
    expect(screen.getByRole('button', { name: /잠금 해제/ })).toBeInTheDocument();
  });

  it('uploads an attachment into the first empty resource slot', async () => {
    const user = userEvent.setup();
    vi.mocked(uploadRoadmapAttachment).mockImplementation(async (file, roadmapId, options) => {
      options?.onProgress?.(100);
      return {
        id: '22222222-2222-4222-8222-222222222222',
        resourceUrl: '/api/uploads/22222222-2222-4222-8222-222222222222/content',
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      };
    });

    const { container, store } = renderWithProvider(mockNode);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();

    await user.upload(input!, new File(['lesson'], 'lesson.pdf', { type: 'application/pdf' }));

    expect(uploadRoadmapAttachment).toHaveBeenCalledWith(
      expect.any(File),
      '11111111-1111-4111-8111-111111111111',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        onProgress: expect.any(Function),
      }),
    );
    expect(store.get(nodesAtom)[0]?.data.resources).toEqual([
      'https://example.com',
      '/api/uploads/22222222-2222-4222-8222-222222222222/content',
      '',
    ]);
  });

  it('shows validation error for unsupported attachment files', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { container } = renderWithProvider(mockNode);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();

    await user.upload(input!, new File(['html'], 'bad.html', { type: 'text/html' }));

    expect(uploadRoadmapAttachment).not.toHaveBeenCalled();
    expect(
      screen.getByText('이미지, PDF, 텍스트 파일만 업로드할 수 있습니다.'),
    ).toBeInTheDocument();
  });
});
