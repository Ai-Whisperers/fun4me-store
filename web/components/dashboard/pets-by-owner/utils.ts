export const formatDate = (date: string | null): string => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('es-PY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const calculateAge = (dob: string | null): string => {
  if (!dob) return 'Edad desconocida'
  const birth = new Date(dob)
  const today = new Date()
  const years = today.getFullYear() - birth.getFullYear()
  const months = today.getMonth() - birth.getMonth()

  if (years === 0) {
    const adjustedMonths = months < 0 ? 12 + months : months
    return `${adjustedMonths} ${adjustedMonths === 1 ? 'mes' : 'meses'}`
  }
  const adjustedYears = months < 0 ? years - 1 : years
  return `${adjustedYears} ${adjustedYears === 1 ? 'año' : 'años'}`
}

export const isClientActive = (lastVisit: string | null): boolean => {
  if (!lastVisit) return false
  const daysSinceVisit = Math.floor(
    (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24)
  )
  return daysSinceVisit <= 90
}

export const getSpeciesEmoji = (species: string): string => {
  const speciesMap: Record<string, string> = {
    perro: '🐕',
    dog: '🐕',
    gato: '🐱',
    cat: '🐱',
    ave: '🦜',
    bird: '🦜',
    conejo: '🐰',
    rabbit: '🐰',
    hamster: '🐹',
    pez: '🐠',
    fish: '🐠',
    tortuga: '🐢',
    turtle: '🐢',
    reptil: '🦎',
    reptile: '🦎',
  }
  return speciesMap[species.toLowerCase()] || '🐾'
}
