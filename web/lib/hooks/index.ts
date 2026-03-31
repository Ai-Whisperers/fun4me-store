/**
 * Custom React Hooks Library
 *
 * This module exports reusable hooks for common patterns in the application.
 * For form handling, use react-hook-form directly.
 *
 * @example
 * ```typescript
 * import { useModal, useSyncedState } from '@/lib/hooks'
 * ```
 */

// Modal management
export {
  useModal,
  useModalWithData,
  useConfirmation,
  type ModalState,
  type ModalWithDataState,
  type ConfirmationState,
  type UseModalOptions,
} from './use-modal'

// State synchronization
export {
  useSyncedState,
  useLocalStorage,
  type SyncedStateResult,
  type SyncStatus,
  type UseSyncedStateOptions,
} from './use-synced-state'

// Dashboard labels
export {
  useDashboardLabels,
  DashboardLabelsProvider,
  defaultDashboardLabels,
} from './use-dashboard-labels'

// Barcode scanning
export { useBarcodeScanner } from './use-barcode-scanner'

// Import wizard state
export {
  useImportWizard,
  type ImportMapping,
  type PreviewResult,
  type ImportResult,
  type UseImportWizardOptions,
  type UseImportWizardReturn,
} from './use-import-wizard'

// Tenant features (tier-based feature gating)
export {
  useTenantFeatures,
  TenantFeaturesProvider,
  FeatureGate,
  RequireFeatures,
  UpgradePrompt,
  TrialBanner,
  type ResolvedTenantFeatures,
  type FeatureGateResult,
} from './use-tenant-features'

// Timeout utilities (BUG-008: safe setTimeout with cleanup)
export { useTimeout, useCopyTimeout, useSafeTimeout } from './use-timeout'

// Focus management (A11Y-002: Keyboard navigation)
export {
  useFocusTrap,
  useFocusTrapRef,
  getFocusableElements,
  type UseFocusTrapOptions,
} from './use-focus-trap'

// Roving focus pattern (A11Y-002: Keyboard navigation)
export {
  useRovingFocus,
  getGroupProps,
  type UseRovingFocusOptions,
  type Direction as RovingDirection,
} from './use-roving-focus'

// Modal form submission (reduces boilerplate in modal components)
export {
  useModalForm,
  useApiModalForm,
  type UseModalFormOptions,
  type UseModalFormReturn,
  type UseApiModalFormOptions,
} from './use-modal-form'

// Async data fetching
export {
  useAsyncData,
  type UseAsyncDataOptions,
  type UseAsyncDataReturn,
} from './use-async-data'
