// Server component wrapper for Reproductive Cycles page
import ReproductiveCyclesClient from '@/app/[clinic]/reproductive_cycles/client'

export const generateMetadata = async () => ({
  title: 'Reproductive Cycles',
  description: 'Manage reproductive cycles',
  openGraph: { title: 'Reproductive Cycles', description: 'Manage reproductive cycles' },
  twitter: { card: 'summary_large_image' },
})

export default async function ReproductiveCyclesPage({
  params,
}: {
  params: Promise<{ clinic: string }>
}) {
  const { clinic } = await params
  return <ReproductiveCyclesClient clinic={clinic} />
}
