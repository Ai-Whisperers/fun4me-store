/**
 * Type declarations for lucide-react ESM icon imports
 * This allows tree-shakeable imports from the ESM build
 */

declare module 'lucide-react/dist/esm/icons/*' {
  import type { LucideIcon } from 'lucide-react'
  const icon: LucideIcon
  export default icon
}
