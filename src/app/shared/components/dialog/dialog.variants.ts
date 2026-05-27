import { cva, type VariantProps } from 'class-variance-authority';

export const dialogVariants = cva(
  'fixed left-[50%] top-[50%] z-50 flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] translate-x-[-50%] translate-y-[-50%] flex-col gap-4 overflow-hidden rounded-lg border border-muted/10 bg-background p-4 shadow-2xl ring-1 ring-primary/10 sm:max-h-[calc(100dvh-2rem)] sm:max-w-[825px] sm:p-6',
);
export type ZardDialogVariants = VariantProps<typeof dialogVariants>;
