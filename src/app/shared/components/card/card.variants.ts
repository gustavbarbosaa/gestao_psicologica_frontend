import { cva, type VariantProps } from 'class-variance-authority';

export const cardVariants = cva(
  'block w-full rounded-[calc(var(--radius)+0.25rem)] border text-card-foreground',
  {
    variants: {
      zTone: {
        default: 'bg-card border-border/70 shadow-[var(--shadow-card)]',
        elevated: 'bg-card border-border/60 shadow-[var(--shadow-soft)]',
        tint: 'surface-tint border-border/60 shadow-[var(--shadow-card)]',
        ghost: 'border-transparent bg-transparent shadow-none',
      },
      zPadding: {
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      zTone: 'default',
      zPadding: 'default',
    },
  },
);
export type ZardCardVariants = VariantProps<typeof cardVariants>;

export const cardHeaderVariants = cva('flex w-full flex-col gap-1.5 pb-0');
export type ZardCardHeaderVariants = VariantProps<typeof cardHeaderVariants>;

export const cardBodyVariants = cva('mt-6 block w-full');
export type ZardCardBodyVariants = VariantProps<typeof cardBodyVariants>;
