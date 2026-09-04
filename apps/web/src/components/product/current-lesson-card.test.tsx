import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CurrentLessonCard } from './current-lesson-card';

describe('CurrentLessonCard hero heading', () => {
  it('uses the existing responsive heading scale to avoid a mobile orphan line', () => {
    render(
      <CurrentLessonCard
        roadmap="채용공고에서 시작하는 커리어 준비"
        title="공부한 만큼 증명되는 커리어를 만드세요"
        meta="목표 직무의 요구사항과 실제 결과물을 연결하세요."
        href="/explore"
        headingId="home-heading"
      />,
    );

    const heading = screen.getByRole('heading', {
      level: 1,
      name: '공부한 만큼 증명되는 커리어를 만드세요',
    });

    expect(heading).toHaveClass('text-2xl', 'sm:text-3xl', 'leading-[1.25]');
  });
});
