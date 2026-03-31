// Design System Components
// Import from '@/components/ui' for consistent UI across the app

export { Button } from './button'
export type { ButtonProps } from './button'

export { IconButton } from './icon-button'
export type { IconButtonProps } from './icon-button'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'
export type { CardProps } from './card'

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonProductCard,
  SkeletonPetCard,
  SkeletonTable,
  SkeletonStatCard,
  SkeletonAppointmentCard,
  SkeletonInvoiceRow,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonDashboard,
  SkeletonForm,
  SkeletonList,
} from './skeleton'
export type { SkeletonProps } from './skeleton'

export { Badge, SpeciesBadge } from './badge'
export type { BadgeProps } from './badge'

export { Modal, ModalFooter, ConfirmModal } from './modal'
export type { ModalProps } from './modal'

export { Input, Textarea, Select } from './input'
export type { InputProps, TextareaProps, SelectProps } from './input'

export { ToastProvider, useToast } from './Toast'

export { SearchField } from './search-field'
export { DataTable } from './data-table'
export type { Column } from './data-table'

export { EmptyState } from './empty-state'
export { ConfirmDialog } from './confirm-dialog'
export { StatusBadge } from './status-badge'
export { LoadingButton } from './loading-button'
export { InfoCard } from './info-card'

// Form Components
export { Label } from './label'
export type { LabelProps } from './label'

export { DatePicker } from './date-picker'
export type { DatePickerProps } from './date-picker'

export { FileUpload } from './file-upload'
export type { FileUploadProps } from './file-upload'

// Tab Components
export {
  Tabs,
  TabList,
  TabTrigger,
  TabPanel,
  PetProfileTabs,
  PetTabPanel,
  DashboardTabs,
} from './tabs'

// Utility Components
export { ProgressStepper, ProgressIndicator, DotProgress } from './progress-stepper'
export { Progress, CircularProgress, ProgressOverlay } from './progress'
export type { ProgressProps, CircularProgressProps, ProgressOverlayProps } from './progress'
export { PasswordInput } from './password-input'
export { CommandPalette } from './command-palette'
export { NotificationBanner } from './notification-banner'
export { SlideOver } from './slide-over'
export { SROnly } from './sr-only'
