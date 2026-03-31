'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * Result of useModal hook
 */
export interface ModalState {
  /** Whether the modal is currently open */
  isOpen: boolean
  /** Open the modal */
  open: () => void
  /** Close the modal */
  close: () => void
  /** Toggle the modal state */
  toggle: () => void
  /** Props to spread on the modal component */
  modalProps: {
    isOpen: boolean
    onClose: () => void
  }
}

/**
 * Options for useModal hook
 */
export interface UseModalOptions {
  /** Initial open state (default: false) */
  defaultOpen?: boolean
  /** Called when modal opens */
  onOpen?: () => void
  /** Called when modal closes */
  onClose?: () => void
  /** Close on Escape key press (default: true) */
  closeOnEscape?: boolean
}

/**
 * Hook for managing modal/dialog open/close state.
 * Provides a clean interface for modal state management.
 *
 * @example
 * ```typescript
 * // Basic usage
 * function MyComponent() {
 *   const modal = useModal()
 *
 *   return (
 *     <>
 *       <button onClick={modal.open}>Open Modal</button>
 *       <Modal {...modal.modalProps}>
 *         <h2>Modal Content</h2>
 *         <button onClick={modal.close}>Close</button>
 *       </Modal>
 *     </>
 *   )
 * }
 *
 * // With callbacks
 * const confirmModal = useModal({
 *   onClose: () => console.log('Modal closed'),
 *   closeOnEscape: true,
 * })
 *
 * // Multiple modals
 * const editModal = useModal()
 * const deleteModal = useModal()
 * ```
 */
export function useModal(options: UseModalOptions = {}): ModalState {
  const { defaultOpen = false, onOpen, onClose, closeOnEscape = true } = options

  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Track callback refs to avoid stale closures
  const onOpenRef = useRef(onOpen)
  const onCloseRef = useRef(onClose)
  onOpenRef.current = onOpen
  onCloseRef.current = onClose

  const open = useCallback(() => {
    setIsOpen(true)
    onOpenRef.current?.()
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    onCloseRef.current?.()
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev
      if (next) {
        onOpenRef.current?.()
      } else {
        onCloseRef.current?.()
      }
      return next
    })
  }, [])

  // Handle Escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeOnEscape, isOpen, close])

  return {
    isOpen,
    open,
    close,
    toggle,
    modalProps: {
      isOpen,
      onClose: close,
    },
  }
}

/**
 * Extended modal state with data payload
 */
export interface ModalWithDataState<T> extends Omit<ModalState, 'open'> {
  /** Data associated with the modal (e.g., item being edited) */
  data: T | undefined
  /** Open the modal with data */
  open: (data: T) => void
  /** Open without data */
  openEmpty: () => void
}

/**
 * Hook for managing modal state with associated data.
 * Useful for edit/delete confirmation modals where you need context.
 *
 * @example
 * ```typescript
 * interface Pet { id: string; name: string }
 *
 * function PetList() {
 *   const editModal = useModalWithData<Pet>()
 *
 *   return (
 *     <>
 *       {pets.map(pet => (
 *         <button onClick={() => editModal.open(pet)}>
 *           Edit {pet.name}
 *         </button>
 *       ))}
 *
 *       <EditPetModal {...editModal.modalProps} pet={editModal.data} />
 *     </>
 *   )
 * }
 * ```
 */
export function useModalWithData<T>(
  options: UseModalOptions = {}
): ModalWithDataState<T> {
  const baseModal = useModal(options)
  const [data, setData] = useState<T | undefined>(undefined)

  const open = useCallback(
    (newData: T) => {
      setData(newData)
      baseModal.open()
    },
    [baseModal]
  )

  const openEmpty = useCallback(() => {
    setData(undefined)
    baseModal.open()
  }, [baseModal])

  const close = useCallback(() => {
    baseModal.close()
    // Clear data after close animation (optional - could be immediate)
    setTimeout(() => setData(undefined), 200)
  }, [baseModal])

  return {
    ...baseModal,
    data,
    open,
    openEmpty,
    close,
    modalProps: {
      isOpen: baseModal.isOpen,
      onClose: close,
    },
  }
}

/**
 * Hook for managing confirmation dialog state.
 * Provides a promise-based interface for confirm/cancel flow.
 *
 * @example
 * ```typescript
 * function DeleteButton({ petId }: { petId: string }) {
 *   const confirm = useConfirmation()
 *
 *   const handleDelete = async () => {
 *     const confirmed = await confirm.ask('Are you sure you want to delete this pet?')
 *     if (confirmed) {
 *       await deletePet(petId)
 *     }
 *   }
 *
 *   return (
 *     <>
 *       <button onClick={handleDelete}>Delete</button>
 *       <ConfirmDialog
 *         isOpen={confirm.isOpen}
 *         message={confirm.message}
 *         onConfirm={confirm.onConfirm}
 *         onCancel={confirm.onCancel}
 *       />
 *     </>
 *   )
 * }
 * ```
 */
export interface ConfirmationState {
  isOpen: boolean
  message: string
  ask: (message: string) => Promise<boolean>
  onConfirm: () => void
  onCancel: () => void
}

export function useConfirmation(): ConfirmationState {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const ask = useCallback((newMessage: string): Promise<boolean> => {
    setMessage(newMessage)
    setIsOpen(true)

    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const onConfirm = useCallback(() => {
    setIsOpen(false)
    resolveRef.current?.(true)
    resolveRef.current = null
  }, [])

  const onCancel = useCallback(() => {
    setIsOpen(false)
    resolveRef.current?.(false)
    resolveRef.current = null
  }, [])

  return {
    isOpen,
    message,
    ask,
    onConfirm,
    onCancel,
  }
}
