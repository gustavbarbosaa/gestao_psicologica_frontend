import { cva, type VariantProps } from 'class-variance-authority';

export const dialogVariants = cva(
  'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 bg-background p-6 rounded-lg max-w-[calc(100%-2rem)] sm:max-w-[425px] shadow-2xl border border-muted/10 ring-1 ring-primary/10',
);
export type ZardDialogVariants = VariantProps<typeof dialogVariants>;
