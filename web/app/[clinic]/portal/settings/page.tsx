import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function SettingsPage({ params }: Props): Promise<never> {
  const { clinic } = await params
  // Redirect to notifications settings as the default
  redirect(`/${clinic}/portal/settings/notifications`)
}
