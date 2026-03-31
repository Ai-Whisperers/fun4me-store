/**
 * Screen Reader Only Component
 *
 * Renders content that is visually hidden but available to screen readers.
 * Useful for providing additional context to assistive technology users.
 */

interface SROnlyProps {
  children: React.ReactNode
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export function SROnly({ children, as: Component = 'span' }: SROnlyProps): React.ReactElement {
  return <Component className="sr-only">{children}</Component>
}
