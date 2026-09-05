import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

// Pill geometry throughout, per docs/design.json. Sizes are floors rather
// than fixed heights so a label that wraps in German or French grows the
// control instead of overflowing it.
//
// Focus is deliberately not styled here: globals.css gives every focusable
// element the same ring, so a control cannot be added without one.
const buttonVariants = cva(
  [
    'group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full',
    'border border-transparent bg-clip-padding text-sm font-semibold',
    'transition-colors duration-[var(--duration-normal)] ease-[var(--ease)]',
    'outline-none select-none',
    'disabled:pointer-events-none disabled:opacity-45',
    'aria-invalid:border-destructive',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-[var(--primary-button-hover)]',
        outline: 'border-border bg-background text-foreground hover:bg-muted',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-surface-hover',
        ghost: 'text-foreground hover:bg-muted',
        // Reserved for the search submit, which is the one place the spec
        // spends the brand colour on a control.
        brand: 'bg-brand text-on-brand hover:bg-brand-hover',
        destructive: 'bg-destructive-soft text-destructive hover:bg-destructive/15',
        link: 'text-foreground underline-offset-4 hover:underline',
      },
      size: {
        // 48px: the spec's primary control height.
        default: 'min-h-12 px-6 py-2',
        // 44px: the minimum touch target, used for secondary controls.
        sm: 'min-h-11 px-5 py-2',
        // Chips and inline controls, below touch-target size on purpose --
        // never the only way to reach an action.
        xs: 'min-h-8 px-3 py-1 text-[0.8125rem] font-medium',
        lg: 'min-h-14 px-8 py-3 text-base',
        icon: 'size-11 px-0',
        'icon-sm': 'size-9 px-0',
        'icon-lg': 'size-12 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
