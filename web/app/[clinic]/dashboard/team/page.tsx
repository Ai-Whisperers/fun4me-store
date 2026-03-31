import { createClient } from '@/lib/supabase/server'
import * as Icons from 'lucide-react'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { removeInvite } from '@/app/actions/invite-staff'
import { InviteStaffForm } from '@/components/team/invite-staff-form'

interface Props {
  params: Promise<{ clinic: string }>
}

interface ClinicInvite {
  id: string
  email: string
  role: 'admin' | 'vet'
  created_at: string
}

export default async function DashboardTeamPage({ params }: Props) {
  const { clinic } = await params
  const t = await getTranslations('dashboard.team')
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Admin check - team management is admin only
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.tenant_id !== clinic) {
    redirect(`/${clinic}/dashboard`)
  }

  // Fetch invites
  const { data: invites } = await supabase
    .from('clinic_invites')
    .select('*')
    .eq('tenant_id', clinic)
    .order('created_at', { ascending: false })

  // Fetch team members
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('tenant_id', clinic)
    .in('role', ['vet', 'admin'])
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h1>
        <p className="text-[var(--text-secondary)]">
          {t('subtitle')}
        </p>
      </div>

      {/* Invite Form */}
      <div className="mb-8 rounded-xl border border-[var(--border)] bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <Icons.UserPlus className="h-5 w-5 text-[var(--primary)]" />
          {t('inviteNewMember')}
        </h2>
        <InviteStaffForm clinic={clinic} />
      </div>

      {/* Team Members */}
      <div className="mb-8 rounded-xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] p-4">
          <h3 className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
            <Icons.Users className="h-5 w-5 text-[var(--primary)]" />
            {t('teamMembers')}
          </h3>
        </div>
        <div className="divide-y divide-[var(--border-light)]">
          {teamMembers && teamMembers.length > 0 ? (
            teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-[var(--primary)]/10 flex h-10 w-10 items-center justify-center rounded-full">
                    <Icons.User className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{member.full_name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{member.email}</p>
                  </div>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={
                    member.role === 'admin'
                      ? {
                          backgroundColor: 'var(--accent-purple-light)',
                          color: 'var(--accent-purple-dark)',
                        }
                      : {
                          backgroundColor: 'var(--accent-blue-light)',
                          color: 'var(--accent-blue-dark)',
                        }
                  }
                >
                  {member.role === 'admin' ? t('roles.admin') : t('roles.vet')}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              {t('noTeamMembers')}
            </div>
          )}
        </div>
      </div>

      {/* Pending Invites */}
      <div className="rounded-xl border border-[var(--border)] bg-white">
        <div className="border-b border-[var(--border-light)] p-4">
          <h3 className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
            <Icons.Mail className="h-5 w-5 text-[var(--primary)]" />
            {t('pendingInvites')}
          </h3>
        </div>
        <div className="divide-y divide-[var(--border-light)]">
          {invites && invites.length > 0 ? (
            (invites as ClinicInvite[]).map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'var(--status-warning-bg)' }}
                  >
                    <Icons.Clock
                      className="h-5 w-5"
                      style={{ color: 'var(--status-warning-dark)' }}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{invite.email}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t('role')}: {invite.role === 'admin' ? t('roles.admin') : t('roles.vet')}
                    </p>
                  </div>
                </div>
                {/* @ts-expect-error - Server action returns ActionResult which conflicts with form action types */}
                <form action={removeInvite}>
                  <input type="hidden" name="id" value={invite.id} />
                  <input type="hidden" name="clinic" value={clinic} />
                  <button
                    type="submit"
                    className="rounded-lg p-2 transition-colors hover:opacity-80"
                    style={{ color: 'var(--status-error)' }}
                    title={t('cancelInvite')}
                  >
                    <Icons.Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              {t('noPendingInvites')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
