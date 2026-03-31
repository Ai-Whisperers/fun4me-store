import EpidemiologyClient from './client'
import { requireStaff } from '@/lib/auth'

export default async function Page({ params }: { params: Promise<{ clinic: string }> }) {
  const { clinic } = await params

  // SEC-008: Require staff authentication
  await requireStaff(clinic)

  return <EpidemiologyClient params={{ clinic }} />
}
