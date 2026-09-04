import type { NodeColorVariant, TextColorVariant, NodeState } from '@/types/roadmap.types';

export interface NodeColorClasses {
  bg: string;
  border: string;
  sectionBorder: string;
  text: string;
  handle: string;
  badge: string;
}

export const NODE_COLOR_CLASSES: Record<NodeColorVariant, Record<NodeState, NodeColorClasses>> = {
  white: {
    default: {
      bg: 'bg-background',
      border: 'border-border',
      sectionBorder: 'border-[#e2e8f0]',
      text: 'text-foreground',
      handle: 'bg-primary',
      badge: 'bg-muted text-[#0f172a]',
    },
    focus: {
      bg: 'bg-background',
      border: 'border-[#3f8dff]',
      sectionBorder: 'border-[#8ec5ff]',
      text: 'text-foreground',
      handle: 'bg-primary',
      badge: 'bg-blue-500 text-white',
    },
  },
  black: {
    default: {
      bg: 'bg-primary',
      border: 'border-border',
      sectionBorder: 'border-[#64748b]',
      text: 'text-primary-foreground',
      handle: 'bg-primary-foreground',
      badge: 'bg-primary text-primary-foreground',
    },
    focus: {
      bg: 'bg-primary',
      border: 'border-[#3f8dff]',
      sectionBorder: 'border-[#8ec5ff]',
      text: 'text-primary-foreground',
      handle: 'bg-primary-foreground',
      badge: 'bg-blue-500 text-white',
    },
  },
  blue: {
    default: {
      bg: 'bg-[#155dfc]',
      border: 'border-[#e2e8f0]',
      sectionBorder: 'border-[#8ec5ff]',
      text: 'text-white',
      handle: 'bg-white',
      badge: 'bg-[#155dfc] text-white',
    },
    focus: {
      bg: 'bg-[#155dfc]',
      border: 'border-[#3f8dff]',
      sectionBorder: 'border-[#8ec5ff]',
      text: 'text-white',
      handle: 'bg-white',
      badge: 'bg-blue-500 text-white',
    },
  },
  purple: {
    default: {
      bg: 'bg-[#9810fa]',
      border: 'border-[#e2e8f0]',
      sectionBorder: 'border-[#dab2ff]',
      text: 'text-white',
      handle: 'bg-white',
      badge: 'bg-[#9810fa] text-white',
    },
    focus: {
      bg: 'bg-[#9810fa]',
      border: 'border-[#3f8dff]',
      sectionBorder: 'border-[#8ec5ff]',
      text: 'text-white',
      handle: 'bg-white',
      badge: 'bg-blue-500 text-white',
    },
  },
  red: {
    default: {
      bg: 'bg-[#ec003f]',
      border: 'border-[#e2e8f0]',
      sectionBorder: 'border-[#ffa1ad]',
      text: 'text-white',
      handle: 'bg-white',
      badge: 'bg-[#ec003f] text-white',
    },
    focus: {
      bg: 'bg-[#ec003f]',
      border: 'border-[#3f8dff]',
      sectionBorder: 'border-[#8ec5ff]',
      text: 'text-white',
      handle: 'bg-white',
      badge: 'bg-blue-500 text-white',
    },
  },
  orange: {
    default: {
      bg: 'bg-[#f54a00]',
      border: 'border-[#e2e8f0]',
      sectionBorder: 'border-[#ffb86a]',
      text: 'text-white',
      handle: 'bg-white',
      badge: 'bg-[#e17100] text-white',
    },
    focus: {
      bg: 'bg-[#f54a00]',
      border: 'border-[#3f8dff]',
      sectionBorder: 'border-[#8ec5ff]',
      text: 'text-white',
      handle: 'bg-white',
      badge: 'bg-blue-500 text-white',
    },
  },
} as const;

export const TEXT_COLOR_CLASSES: Record<TextColorVariant, string> = {
  white: 'text-white',
  black: 'text-foreground',
  blue: 'text-[#155dfc]',
  purple: 'text-[#9810fa]',
  red: 'text-[#ec003f]',
  orange: 'text-[#e17100]',
} as const;

function isNodeColorVariant(value: unknown): value is NodeColorVariant {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(NODE_COLOR_CLASSES, value)
  );
}

export function getNodeColors(variant: unknown, state: NodeState): NodeColorClasses {
  const safeVariant = isNodeColorVariant(variant) ? variant : 'white';
  return NODE_COLOR_CLASSES[safeVariant][state];
}

export function getTextColor(variant: TextColorVariant): string {
  return TEXT_COLOR_CLASSES[variant];
}
