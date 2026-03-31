'use client'

import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Check, Folder, FolderOpen } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  parent_slug?: string
  count?: number
}

interface CategoryNode extends Category {
  children: CategoryNode[]
  level: number
}

interface Props {
  categories: Category[]
  selectedCategory?: string
  onCategorySelect: (slug: string | undefined, includeChildren: boolean) => void
}

function buildTree(categories: Category[]): CategoryNode[] {
  const categoryMap = new Map<string, CategoryNode>()
  const roots: CategoryNode[] = []

  // First pass: create nodes
  categories.forEach((cat) => {
    categoryMap.set(cat.slug, { ...cat, children: [], level: 0 })
  })

  // Second pass: build tree
  // Non-null assertions safe: node exists from first pass, parent checked with has()
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  categories.forEach((cat) => {
    const node = categoryMap.get(cat.slug)!
    if (cat.parent_slug && categoryMap.has(cat.parent_slug)) {
      const parent = categoryMap.get(cat.parent_slug)!
      node.level = parent.level + 1
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  // Sort children alphabetically
  const sortNodes = (nodes: CategoryNode[]): CategoryNode[] => {
    return nodes
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((node) => ({
        ...node,
        children: sortNodes(node.children),
      }))
  }

  return sortNodes(roots)
}

function CategoryNodeComponent({
  node,
  selectedCategory,
  onSelect,
  expandedSlugs,
  onToggleExpand,
}: {
  node: CategoryNode
  selectedCategory?: string
  onSelect: (slug: string | undefined, includeChildren: boolean) => void
  expandedSlugs: Set<string>
  onToggleExpand: (slug: string) => void
}) {
  const isExpanded = expandedSlugs.has(node.slug)
  const isSelected = selectedCategory === node.slug
  const hasChildren = node.children.length > 0

  // Check if any descendant is selected
  const isAncestorOfSelected = useMemo(() => {
    if (!selectedCategory) return false
    const checkDescendants = (n: CategoryNode): boolean => {
      if (n.slug === selectedCategory) return true
      return n.children.some(checkDescendants)
    }
    return checkDescendants(node)
  }, [node, selectedCategory])

  const handleClick = () => {
    if (isSelected) {
      onSelect(undefined, false)
    } else {
      onSelect(node.slug, hasChildren)
    }
  }

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpand(node.slug)
  }

  return (
    <div>
      <div
        className={`flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 transition-all ${
          isSelected
            ? 'bg-[var(--primary)] text-white'
            : isAncestorOfSelected
              ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
              : 'text-[var(--text-secondary)] hover:bg-gray-100'
        } `}
        style={{ paddingLeft: `${node.level * 12 + 8}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            onClick={handleExpandClick}
            className={`flex-shrink-0 rounded p-0.5 transition-colors hover:bg-black/10 ${
              isSelected ? 'text-white/80' : ''
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Category Icon */}
        {hasChildren ? (
          isExpanded ? (
            <FolderOpen
              className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-white/80' : 'text-[var(--primary)]'}`}
            />
          ) : (
            <Folder
              className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-white/80' : 'text-[var(--primary)]'}`}
            />
          )
        ) : null}

        {/* Category Name */}
        <button onClick={handleClick} className="flex-1 truncate text-left text-sm font-medium">
          {node.name}
        </button>

        {/* Count Badge */}
        {node.count !== undefined && node.count > 0 && (
          <span
            className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-xs ${
              isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-[var(--text-muted)]'
            }`}
          >
            {node.count}
          </span>
        )}

        {/* Selected Indicator */}
        {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <CategoryNodeComponent
              key={child.slug}
              node={child}
              selectedCategory={selectedCategory}
              onSelect={onSelect}
              expandedSlugs={expandedSlugs}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CategoryTree({ categories, selectedCategory, onCategorySelect }: Props) {
  const tree = useMemo(() => buildTree(categories), [categories])

  // Auto-expand parents of selected category
  const [expandedSlugs, setExpandedSlugs] = useState<Set<string>>(() => {
    const expanded = new Set<string>()
    if (selectedCategory) {
      // Find and expand all ancestors
      const findAndExpand = (
        nodes: CategoryNode[],
        target: string,
        path: string[] = []
      ): boolean => {
        for (const node of nodes) {
          if (node.slug === target) {
            path.forEach((slug) => expanded.add(slug))
            return true
          }
          if (node.children.length > 0) {
            if (findAndExpand(node.children, target, [...path, node.slug])) {
              return true
            }
          }
        }
        return false
      }
      findAndExpand(tree, selectedCategory)
    }
    return expanded
  })

  const handleToggleExpand = (slug: string) => {
    setExpandedSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      return next
    })
  }

  if (tree.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-[var(--text-muted)]">
        No hay categorías disponibles
      </p>
    )
  }

  return (
    <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
      {/* "All Categories" option */}
      <div
        onClick={() => onCategorySelect(undefined, false)}
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-all ${
          !selectedCategory
            ? 'bg-[var(--primary)] text-white'
            : 'text-[var(--text-secondary)] hover:bg-gray-100'
        } `}
      >
        <span className="w-5" />
        <span className="text-sm font-medium">Todas las categorías</span>
        {!selectedCategory && <Check className="ml-auto h-4 w-4" />}
      </div>

      {/* Category Tree */}
      {tree.map((node) => (
        <CategoryNodeComponent
          key={node.slug}
          node={node}
          selectedCategory={selectedCategory}
          onSelect={onCategorySelect}
          expandedSlugs={expandedSlugs}
          onToggleExpand={handleToggleExpand}
        />
      ))}
    </div>
  )
}
