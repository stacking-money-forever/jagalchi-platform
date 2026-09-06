import * as React from 'react';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

export type ButtonIntent =
  'primary' | 'neutral' | 'inverse' | 'ticket' | 'success' | 'warning' | 'destructive';
export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-lg';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 data-[loading=true]:cursor-wait [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/35",
  {
    variants: {
      intent: {
        primary: 'focus-visible:ring-primary/35',
        neutral: 'focus-visible:ring-ring/40',
        inverse: 'focus-visible:ring-primary-foreground/45',
        ticket: 'focus-visible:ring-ticket/35',
        success: 'focus-visible:ring-success/35',
        warning: 'focus-visible:ring-warning/35',
        destructive: 'focus-visible:ring-destructive/30',
      },
      variant: {
        solid: 'border border-transparent shadow-xs',
        outline: 'border bg-background shadow-xs dark:bg-input/30',
        ghost: 'border border-transparent shadow-none',
        link: 'h-auto border-0 bg-transparent p-0 underline-offset-4 shadow-none hover:underline',
      },
      size: {
        xs: 'h-8 gap-1 rounded-lg px-2.5 text-xs has-[>svg]:px-2',
        sm: 'h-9 gap-1.5 rounded-lg px-3 text-xs has-[>svg]:px-2.5',
        md: 'h-11 px-4 has-[>svg]:px-3',
        lg: 'h-12 px-6 text-base has-[>svg]:px-4',
        xl: 'h-14 px-7 text-base has-[>svg]:px-5',
        icon: 'size-11',
        'icon-sm': 'size-9 rounded-lg',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      intent: 'primary',
      variant: 'solid',
      size: 'md',
    },
    compoundVariants: [
      {
        intent: 'primary',
        variant: 'solid',
        className:
          'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed',
      },
      {
        intent: 'neutral',
        variant: 'solid',
        className:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70',
      },
      {
        intent: 'inverse',
        variant: 'solid',
        className:
          'bg-primary-foreground text-primary hover:bg-primary-foreground/90 active:bg-primary-foreground/80',
      },
      {
        intent: 'ticket',
        variant: 'solid',
        className:
          'bg-ticket text-ticket-foreground hover:bg-ticket-hover active:bg-ticket-pressed',
      },
      {
        intent: 'success',
        variant: 'solid',
        className:
          'bg-success text-success-foreground hover:bg-success-hover active:bg-success-pressed',
      },
      {
        intent: 'warning',
        variant: 'solid',
        className:
          'bg-warning text-warning-foreground hover:bg-warning-hover active:bg-warning-pressed',
      },
      {
        intent: 'destructive',
        variant: 'solid',
        className:
          'bg-destructive text-error-foreground hover:bg-error-hover active:bg-error-pressed',
      },
      {
        intent: 'primary',
        variant: 'outline',
        className:
          'border-primary text-primary hover:bg-primary-subtle active:bg-primary-subtle/75',
      },
      {
        intent: 'neutral',
        variant: 'outline',
        className:
          'border-border text-foreground hover:bg-accent hover:text-accent-foreground active:bg-muted',
      },
      {
        intent: 'inverse',
        variant: 'outline',
        className:
          'border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 active:bg-primary-foreground/20',
      },
      {
        intent: 'ticket',
        variant: 'outline',
        className: 'border-ticket text-ticket hover:bg-ticket-subtle active:bg-ticket-subtle/75',
      },
      {
        intent: 'success',
        variant: 'outline',
        className:
          'border-success text-success hover:bg-success-subtle active:bg-success-subtle/75',
      },
      {
        intent: 'warning',
        variant: 'outline',
        className:
          'border-warning text-warning hover:bg-warning-subtle active:bg-warning-subtle/75',
      },
      {
        intent: 'destructive',
        variant: 'outline',
        className:
          'border-destructive text-destructive hover:bg-error-subtle active:bg-error-subtle/75',
      },
      {
        intent: 'primary',
        variant: ['ghost', 'link'],
        className: 'text-primary hover:bg-primary-subtle active:bg-primary-subtle/75',
      },
      {
        intent: 'neutral',
        variant: ['ghost', 'link'],
        className: 'text-foreground hover:bg-accent hover:text-accent-foreground active:bg-muted',
      },
      {
        intent: 'inverse',
        variant: ['ghost', 'link'],
        className:
          'text-primary-foreground hover:bg-primary-foreground/10 active:bg-primary-foreground/20',
      },
      {
        intent: 'ticket',
        variant: ['ghost', 'link'],
        className: 'text-ticket hover:bg-ticket-subtle active:bg-ticket-subtle/75',
      },
      {
        intent: 'success',
        variant: ['ghost', 'link'],
        className: 'text-success hover:bg-success-subtle active:bg-success-subtle/75',
      },
      {
        intent: 'warning',
        variant: ['ghost', 'link'],
        className: 'text-warning hover:bg-warning-subtle active:bg-warning-subtle/75',
      },
      {
        intent: 'destructive',
        variant: ['ghost', 'link'],
        className: 'text-destructive hover:bg-error-subtle active:bg-error-subtle/75',
      },
    ],
  },
);

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    loadingLabel?: string;
  };

function Button({
  className,
  intent = 'primary',
  variant = 'solid',
  size = 'md',
  asChild = false,
  loading = false,
  loadingLabel,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const sharedProps = {
    'data-slot': 'button',
    'data-variant': variant,
    'data-intent': intent,
    'data-size': size,
    'data-loading': loading,
    'aria-busy': loading || undefined,
    className: cn(buttonVariants({ intent, variant, size, className })),
  } as const;

  if (asChild) {
    return (
      <Slot {...sharedProps} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button {...sharedProps} disabled={disabled || loading} {...props}>
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
      ) : null}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

export { Button, buttonVariants };
