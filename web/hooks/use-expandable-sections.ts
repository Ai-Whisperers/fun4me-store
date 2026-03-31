import { useState } from 'react'

export type ExpandableSections<T extends Record<string, boolean>> = T

export interface UseExpandableSectionsResult<T extends Record<string, boolean>> {
  expandedSections: T
  toggleSection: (section: keyof T) => void
  expandSection: (section: keyof T) => void
  collapseSection: (section: keyof T) => void
  expandAll: () => void
  collapseAll: () => void
}

export function useExpandableSections<T extends Record<string, boolean>>(
  initialState: T
): UseExpandableSectionsResult<T> {
  const [expandedSections, setExpandedSections] = useState<T>(initialState)

  const toggleSection = (section: keyof T) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const expandSection = (section: keyof T) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: true,
    }))
  }

  const collapseSection = (section: keyof T) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: false,
    }))
  }

  const expandAll = () => {
    const allExpanded = Object.keys(expandedSections).reduce((acc, key) => {
      ;(acc as Record<string, boolean>)[key] = true
      return acc
    }, {} as T)
    setExpandedSections(allExpanded)
  }

  const collapseAll = () => {
    const allCollapsed = Object.keys(expandedSections).reduce((acc, key) => {
      ;(acc as Record<string, boolean>)[key] = false
      return acc
    }, {} as T)
    setExpandedSections(allCollapsed)
  }

  return {
    expandedSections,
    toggleSection,
    expandSection,
    collapseSection,
    expandAll,
    collapseAll,
  }
}
