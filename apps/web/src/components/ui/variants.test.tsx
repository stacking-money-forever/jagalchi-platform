import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Badge } from './badge';
import { Button } from './button';
import { Card } from './card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { Input } from './input';
import { Textarea } from './textarea';

describe('copy-owned primitive variants', () => {
  it.each([
    'primary',
    'neutral',
    'inverse',
    'ticket',
    'success',
    'warning',
    'destructive',
  ] as const)('exposes the %s button intent', (intent) => {
    render(<Button intent={intent}>{intent}</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-intent', intent);
  });

  it.each(['solid', 'outline', 'ghost', 'link'] as const)(
    'exposes the %s button appearance',
    (variant) => {
      render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('data-variant', variant);
    },
  );

  it.each(['xs', 'sm', 'md', 'lg', 'xl'] as const)('exposes the %s button size', (size) => {
    render(<Button size={size}>{size}</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', size);
  });

  it('uses an accessible, non-interactive loading state', () => {
    render(
      <Button loading loadingLabel="저장 중">
        저장
      </Button>,
    );
    const button = screen.getByRole('button', { name: '저장 중' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('data-loading', 'true');
    expect(button.querySelector('[aria-hidden="true"]')).toHaveClass('motion-reduce:animate-none');
  });

  it('keeps primitive motion bounded to compositor properties', () => {
    render(
      <>
        <Button>실행</Button>
        <Badge>상태</Badge>
      </>,
    );
    const button = screen.getByRole('button', { name: '실행' });
    const badge = screen.getByText('상태');
    expect(button.className).toContain('transition-[opacity,transform]');
    expect(badge.className).toContain('transition-[opacity,transform]');
    expect(button.className).not.toContain('active:scale');
    expect(badge.className).not.toContain('active:scale');
  });

  it('does not fire a disabled or loading button', () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button disabled onClick={onClick}>
        저장
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    rerender(
      <Button loading loadingLabel="저장 중" onClick={onClick}>
        저장
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: '저장 중' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('preserves child semantics when composed with Slot', () => {
    render(
      <Button asChild intent="ticket">
        <a href="/tickets">티켓</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: '티켓' })).toHaveAttribute('href', '/tickets');
  });

  it.each(['default', 'error', 'success'] as const)(
    'exposes the %s input validation state',
    (validation) => {
      render(<Input aria-label="이메일" validation={validation} inputSize="lg" />);
      const input = screen.getByLabelText('이메일');
      expect(input).toHaveAttribute('data-validation', validation);
      expect(input).toHaveAttribute('data-size', 'lg');
      if (validation === 'error') {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      } else {
        expect(input).not.toHaveAttribute('aria-invalid');
      }
    },
  );

  it('shares field validation semantics with textarea', () => {
    render(<Textarea aria-label="설명" validation="error" textareaSize="sm" />);
    expect(screen.getByLabelText('설명')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('설명')).toHaveAttribute('data-size', 'sm');
  });

  it.each(['neutral', 'primary', 'ticket', 'success', 'warning', 'destructive'] as const)(
    'exposes the %s badge intent',
    (intent) => {
      render(<Badge intent={intent}>{intent}</Badge>);
      expect(screen.getByText(intent)).toHaveAttribute('data-intent', intent);
    },
  );

  it.each(['solid', 'subtle', 'outline'] as const)('exposes the %s badge appearance', (variant) => {
    render(<Badge variant={variant}>{variant}</Badge>);
    expect(screen.getByText(variant)).toHaveAttribute('data-variant', variant);
  });

  it('exposes semantic badge and card variants', () => {
    render(
      <Card variant="interactive" padding="lg" data-testid="card">
        <Badge intent="ticket" variant="subtle" size="lg">
          30장
        </Badge>
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveAttribute('data-variant', 'interactive');
    expect(screen.getByTestId('card')).toHaveAttribute('data-intent', 'neutral');
    expect(screen.getByTestId('card')).toHaveAttribute('data-padding', 'lg');
    expect(screen.getByText('30장')).toHaveAttribute('data-intent', 'ticket');
    expect(screen.getByText('30장')).toHaveAttribute('data-variant', 'subtle');
    expect(screen.getByText('30장')).toHaveAttribute('data-size', 'lg');
  });

  it.each(['sm', 'default', 'lg', 'full'] as const)(
    'exposes the %s dialog content size',
    (size) => {
      render(
        <Dialog defaultOpen>
          <DialogContent size={size}>
            <DialogTitle>설정</DialogTitle>
            <DialogDescription>설명</DialogDescription>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByRole('dialog')).toHaveAttribute('data-size', size);
    },
  );
});
