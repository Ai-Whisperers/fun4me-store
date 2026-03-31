import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ clinic: string }>
}

export default async function SettingsIndexPage({ params }: Props): Promise<never> {
  const { clinic } = await params
  redirect(`/${clinic}/dashboard/settings/general`)
}
