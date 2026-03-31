import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRecentItems } from '@/hooks/use-recent-items'
import { createCommands } from './commandFactory'
import type { CommandItem, RecentPatient, GroupedCommands } from './command-types'

interface UseCommandSearchProps {
  clinic: string
  isOpen: boolean
  onClose: () => void
}

interface UseCommandSearchReturn {
  query: string
  setQuery: (query: string) => void
  groupedCommands: GroupedCommands
  flatCommands: CommandItem[]
  recentPatients: RecentPatient[]
}

export function useCommandSearch({
  clinic,
  isOpen,
  onClose,
}: UseCommandSearchProps): UseCommandSearchReturn {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [recentPatients, setRecentPatients] = useState<RecentPatient[]>([])

  // Get localStorage-based recent items
  const { items: localRecentItems } = useRecentItems(clinic || '')

  // Fetch recent patients from database
  useEffect(() => {
    if (!isOpen || !clinic) return

    const fetchRecent = async (): Promise<void> => {
      const supabase = createClient()
      const { data } = await supabase
        .from('pets')
        .select('id, name, species, profiles!inner(full_name)')
        .order('updated_at', { ascending: false })
        .limit(5)

      if (data) {
        setRecentPatients(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            species: p.species,
            ownerName: (p.profiles as unknown as { full_name: string })?.full_name || 'Sin dueño',
          }))
        )
      }
    }

    fetchRecent()
  }, [isOpen, clinic])

  // Navigate helper
  const navigate = useCallback(
    (path: string): void => {
      router.push(`/${clinic}${path}`)
      onClose()
    },
    [router, clinic, onClose]
  )

  // Navigate to external URL
  const navigateExternal = useCallback(
    (href: string): void => {
      router.push(href)
      onClose()
    },
    [router, onClose]
  )

  // Build command items
  const commands = useMemo<CommandItem[]>(() => {
    return createCommands({
      navigate,
      navigateExternal,
      recentPatients,
      localRecentItems,
    })
  }, [navigate, navigateExternal, recentPatients, localRecentItems])

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return commands
    }

    const lowerQuery = query.toLowerCase()
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowerQuery) ||
        cmd.subtitle?.toLowerCase().includes(lowerQuery) ||
        cmd.keywords?.some((k) => k.includes(lowerQuery))
    )
  }, [commands, query])

  // Group by category
  const groupedCommands = useMemo<GroupedCommands>(() => {
    const groups: GroupedCommands = {
      actions: [],
      recent: [],
      navigation: [],
      tools: [],
    }

    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd)
    })

    return groups
  }, [filteredCommands])

  // Flatten for keyboard navigation
  const flatCommands = useMemo(() => {
    return [
      ...groupedCommands.actions,
      ...groupedCommands.recent,
      ...groupedCommands.navigation,
      ...groupedCommands.tools,
    ]
  }, [groupedCommands])

  return {
    query,
    setQuery,
    groupedCommands,
    flatCommands,
    recentPatients,
  }
}
