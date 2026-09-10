import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GithubProofPicker } from './GithubProofPicker';

describe('GithubProofPicker', () => {
  it('allows an active installation to start the audited reconnect flow', async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn();

    render(
      <GithubProofPicker
        connection={{ status: 'ACTIVE', accountId: '164326325' }}
        repositories={[
          {
            id: '101',
            nameWithOwner: 'justn-hyeok/jagalchi-evidence-staging',
            isPrivate: true,
          },
        ]}
        selectedRepositoryId=""
        pullNumber=""
        onConnect={onConnect}
        onRepositoryChange={vi.fn()}
        onPullNumberChange={vi.fn()}
        onBind={vi.fn()}
        isBinding={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'GitHub App 다시 연결' }));

    expect(onConnect).toHaveBeenCalledOnce();
  });
});
