import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ clinic: string }>
}

/**
 * Portal Finance Page - Redirects to Invoices
 *
 * Financial reports (P&L, expenses) are staff-only features available
 * in the dashboard. Pet owners are redirected to their invoices page
 * where they can see their own financial history.
 */
export default async function FinancePage({ params }: Props) {
  const { clinic } = await params

  // Redirect pet owners to their invoices page
  redirect(`/${clinic}/portal/invoices`)
}
