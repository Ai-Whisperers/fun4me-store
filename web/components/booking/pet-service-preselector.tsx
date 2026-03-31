'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Pet {
  id: string
  name: string
  species: string
  photo_url?: string
}

interface Service {
  id: string
  name: string
}

interface PetServicePreselectorProps {
  pets: Pet[]
  services: Service[]
  initialPetId?: string
  initialServiceId?: string
  petServiceHistory?: Record<string, string> // petId -> serviceId of last used service
  onPetChange: (petId: string) => void
  onServiceChange: (serviceId: string) => void
}

export function PetServicePreselector({
  pets,
  services,
  initialPetId,
  initialServiceId,
  petServiceHistory,
  onPetChange,
  onServiceChange,
}: PetServicePreselectorProps) {
  const t = useTranslations('booking.petServiceSelector')
  const [selectedPet, setSelectedPet] = useState<string>(initialPetId || '')
  const [selectedService, setSelectedService] = useState<string>(initialServiceId || '')

  // Effect to handle initial pet and service selection, including history-based pre-filling
  useEffect(() => {
    if (initialPetId && !selectedPet) {
      setSelectedPet(initialPetId)
      onPetChange(initialPetId)
    }

    if (initialServiceId && !selectedService) {
      setSelectedService(initialServiceId)
      onServiceChange(initialServiceId)
    } else if (
      initialPetId &&
      petServiceHistory &&
      petServiceHistory[initialPetId] &&
      !selectedService
    ) {
      // Pre-fill service based on pet history if no initialServiceId is provided
      setSelectedService(petServiceHistory[initialPetId])
      onServiceChange(petServiceHistory[initialPetId])
    }
  }, [
    initialPetId,
    initialServiceId,
    petServiceHistory,
    onPetChange,
    onServiceChange,
    selectedPet,
    selectedService,
  ])

  const handlePetChange = (value: string) => {
    setSelectedPet(value)
    onPetChange(value)
    // Optionally reset service or re-evaluate history-based pre-fill
    // For simplicity, we'll keep current selected service or clear it.
    // A more complex logic might trigger another useEffect for service.
  }

  const handleServiceChange = (value: string) => {
    setSelectedService(value)
    onServiceChange(value)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="pet-select">{t('petLabel')}</Label>
        <Select value={selectedPet} onValueChange={handlePetChange}>
          <SelectTrigger id="pet-select">
            <SelectValue placeholder={t('selectPet')} />
          </SelectTrigger>
          <SelectContent>
            {pets.map((pet) => (
              <SelectItem key={pet.id} value={pet.id}>
                {pet.name} ({pet.species})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="service-select">{t('serviceLabel')}</Label>
        <Select value={selectedService} onValueChange={handleServiceChange}>
          <SelectTrigger id="service-select">
            <SelectValue placeholder={t('selectService')} />
          </SelectTrigger>
          <SelectContent>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
