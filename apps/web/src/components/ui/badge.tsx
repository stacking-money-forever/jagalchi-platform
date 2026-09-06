import * as React from 'react';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

export type BadgeIntent = 'neutral' | 'primary' | 'ticket' | 'success' | 'warning' | 'destructive';
export type BadgeVariant = 'solid' | 'subtle' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border font-bold transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none [&>svg]:pointer-events-none focus-visible:ring-3 focus-visible:ring-ring/40',
  {
    variants: {
      intent: {
        neutral: '',
        primary: '',
        ticket: '',
        success: '',
        warning: '',
        destructive: '',
      },
      variant: {
        solid: 'border-transparent',
        subtle: 'border-transparent',
        outline: 'bg-transparent',
      },
      size: {
        sm: 'h-5 px-1.5 text-[10px] [&>svg]:size-2.5',
        md: 'h-6 px-2 text-xs [&>svg]:size-3',
        lg: 'h-7 gap-1.5 px-2.5 text-xs [&>svg]:size-3.5',
      },
    },
    compoundVariants: [
      {
        intent: 'neutral',
        variant: 'solid',
        className: 'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80',
      },
      {
        intent: 'primary',
        variant: 'solid',
        className: 'bg-primary text-primary-foreground [a&]:hover:bg-primary-hover',
      },
      {
        intent: 'ticket',
        variant: 'solid',
        className: 'bg-ticket text-ticket-foreground [a&]:hover:bg-ticket-hover',
      },
      {
        intent: 'success',
        variant: 'solid',
        className: 'bg-success text-success-foreground [a&]:hover:bg-success-hover',
      },
      {
        intent: 'warning',
        variant: 'solid',
        className: 'bg-warning text-warning-foreground [a&]:hover:bg-warning-hover',
      },
      {
        intent: 'destructive',
        variant: 'solid',
        className: 'bg-error text-error-foreground [a&]:hover:bg-error-hover',
      },
      {
        intent: 'neutral',
        variant: 'subtle',
        className: 'bg-muted text-muted-foreground [a&]:hover:bg-muted/80',
      },
      {
        intent: 'primary',
        variant: 'subtle',
        className: 'bg-primary-subtle text-primary [a&]:hover:bg-primary-subtle/75',
      },
      {
        intent: 'ticket',
        variant: 'subtle',
        className: 'bg-ticket-subtle text-ticket [a&]:hover:bg-ticket-subtle/75',
      },
      {
        intent: 'success',
        variant: 'subtle',
        className: 'bg-success-subtle text-success [a&]:hover:bg-success-subtle/75',
      },
      {
        intent: 'warning',
        variant: 'subtle',
        className: 'bg-warning-subtle text-warning [a&]:hover:bg-warning-subtle/75',
      },
      {
        intent: 'destructive',
        variant: 'subtle',
        className: 'bg-error-subtle text-error [a&]:hover:bg-error-subtle/75',
      },
      {
        intent: 'neutral',
        variant: 'outline',
        className: 'border-border text-foreground [a&]:hover:bg-muted',
      },
      {
        intent: 'primary',
        variant: 'outline',
        className: 'border-primary text-primary [a&]:hover:bg-primary-subtle',
      },
      {
        intent: 'ticket',
        variant: 'outline',
        className: 'border-ticket text-ticket [a&]:hover:bg-ticket-subtle',
      },
      {
        intent: 'success',
        variant: 'outline',
        className: 'border-success text-success [a&]:hover:bg-success-subtle',
      },
      {
        intent: 'warning',
        variant: 'outline',
        className: 'border-warning text-warning [a&]:hover:bg-warning-subtle',
      },
      {
        intent: 'destructive',
        variant: 'outline',
        className: 'border-error text-error [a&]:hover:bg-error-subtle',
      },
    ],
    defaultVariants: {
      intent: 'neutral',
      variant: 'subtle',
      size: 'md',
    },
  },
);

export type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean };

function Badge({
  className,
  intent = 'neutral',
  variant = 'subtle',
  size = 'md',
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      data-intent={intent}
      data-variant={variant}
      data-size={size}
      className={cn(badgeVariants({ intent, variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
