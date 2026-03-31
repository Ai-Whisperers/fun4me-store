import { requireStaff } from '@/lib/auth'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import InventoryClient from './client'
import { getClinicData } from '@/lib/clinics'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function DashboardInventoryPage({ params }: Props) {
  const { clinic } = await params

  // SEC-010: Require staff authentication with tenant verification
  await requireStaff(clinic)

  // Get clinic config for Google Sheet URL
  const clinicData = await getClinicData(clinic)
  const googleSheetUrl = clinicData?.config?.settings?.inventory_template_google_sheet_url || null

  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="flex min-h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
          </div>
        }
      >
        <InventoryClient googleSheetUrl={googleSheetUrl} />
      </Suspense>
    </div>
  )
}
