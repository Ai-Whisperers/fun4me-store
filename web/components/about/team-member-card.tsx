'use client'

import { useState } from 'react'
import { Award, Heart, Stethoscope, ChevronDown, ChevronUp } from 'lucide-react'

interface TeamMember {
  name: string
  role: string
  bio: string
  image?: string
  photo_url?: string // Legacy support
  specialties?: string[]
  education?: string[]
}

interface TeamMemberCardProps {
  member: TeamMember
  gradient: string
  badgeClass: string
  iconName: string
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Award,
  Heart,
  Stethoscope,
}

export function TeamMemberCard({ member, gradient, badgeClass, iconName }: TeamMemberCardProps) {
  const [imageError, setImageError] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const IconComponent = ICONS[iconName] || Heart

  // Support both 'image' and legacy 'photo_url' fields
  const photoUrl = member.image || member.photo_url

  // Get initials from name
  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')

  return (
    <div className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[var(--shadow-card-hover)]">
      {/* Photo area with gradient placeholder */}
      <div className={`h-48 bg-gradient-to-br ${gradient} relative w-full overflow-hidden`}>
        {/* If member has photo URL and no error, show it */}
        {photoUrl && !imageError ? (
          <img
            src={photoUrl}
            alt={`Foto de ${member.name}, ${member.role}`}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          /* Decorative placeholder with initials */
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20">
              <span className="text-4xl font-black text-white/80">{initials}</span>
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Role badge - Show full role */}
        <div
          className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold uppercase tracking-wider ${badgeClass}`}
        >
          <IconComponent className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="max-w-[200px] truncate" title={member.role}>
            {member.role}
          </span>
        </div>

        <h3 className="mb-3 text-xl font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
          {member.name}
        </h3>

        {/* Bio - With expand/collapse for mobile */}
        <div className="relative">
          <p
            className={`text-base leading-relaxed text-[var(--text-primary)] transition-all duration-300 ${
              expanded ? '' : 'line-clamp-3'
            }`}
          >
            {member.bio}
          </p>

          {/* Ver más button */}
          {member.bio.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              {expanded ? (
                <>
                  Ver menos <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Ver más <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Specialties tags */}
        {expanded && member.specialties && member.specialties.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Especialidades
            </p>
            <div className="flex flex-wrap gap-2">
              {member.specialties.map((specialty, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-[var(--bg-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)]"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
