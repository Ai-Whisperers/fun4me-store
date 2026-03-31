import { Suspense } from 'react'
import InventoryClient from './client'
import { Loader2 } from 'lucide-react'
import { getClinicData } from '@/lib/clinics'
import { requireStaff } from '@/lib/auth'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function InventoryPage({ params }: Props) {
  const { clinic } = await params

  // SEC-007: Require staff authentication
  await requireStaff(clinic)

  const clinicData = await getClinicData(clinic)

  const googleSheetUrl = clinicData?.config?.settings?.inventory_template_google_sheet_url || null

  return (
    <div className="container mx-auto px-4 py-8">
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
