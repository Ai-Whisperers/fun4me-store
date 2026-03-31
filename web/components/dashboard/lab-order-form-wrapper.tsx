'use client'

import { useRouter } from 'next/navigation'
import { LabOrderForm } from '@/components/lab/order-form'

interface LabOrderFormWrapperProps {
  clinic: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function LabOrderFormWrapper({
  clinic,
  onSuccess,
  onCancel,
}: LabOrderFormWrapperProps): React.ReactElement {
  const router = useRouter()

  const handleSuccess = (orderId: string): void => {
    router.push(`/${clinic}/dashboard/lab/${orderId}`)
    onSuccess?.()
  }

  const handleCancel = (): void => {
    if (onCancel) {
      onCancel()
    } else {
      // Default behavior: navigate back to lab page
      router.push(`/${clinic}/dashboard/lab`)
    }
  }

  return <LabOrderForm onSuccess={handleSuccess} onCancel={handleCancel} />
}
