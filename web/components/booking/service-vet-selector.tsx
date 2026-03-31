'use client'

import React, { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Service {
  id: string
  name: string
  compatible_vet_ids?: string[] // Optional: if a service is only offered by certain vets
}

interface Veterinarian {
  id: string
  name: string
}

interface ServiceVetSelectorProps {
  services: Service[]
  veterinarians: Veterinarian[]
  onServiceChange: (serviceId: string) => void
  onVeterinarianChange: (vetId: string) => void
  selectedServiceId?: string
  selectedVeterinarianId?: string
}

export function ServiceVetSelector({
  services,
  veterinarians,
  onServiceChange,
  onVeterinarianChange,
  selectedServiceId,
  selectedVeterinarianId,
}: ServiceVetSelectorProps) {
  const [internalSelectedService, setInternalSelectedService] = useState(selectedServiceId || '')
  const [internalSelectedVeterinarian, setInternalSelectedVeterinarian] = useState(
    selectedVeterinarianId || ''
  )
  const [filteredVeterinarians, setFilteredVeterinarians] = useState<Veterinarian[]>(veterinarians)

  useEffect(() => {
    if (internalSelectedService) {
      const selectedService = services.find((s) => s.id === internalSelectedService)
      if (selectedService?.compatible_vet_ids) {
        setFilteredVeterinarians(
          veterinarians.filter((vet) => selectedService.compatible_vet_ids?.includes(vet.id))
        )
      } else {
        setFilteredVeterinarians(veterinarians)
      }
    } else {
      setFilteredVeterinarians(veterinarians)
    }
  }, [internalSelectedService, services, veterinarians])

  const handleServiceChange = (value: string) => {
    setInternalSelectedService(value)
    onServiceChange(value)
    // Reset veterinarian selection if service changes
    setInternalSelectedVeterinarian('')
    onVeterinarianChange('')
  }

  const handleVeterinarianChange = (value: string) => {
    setInternalSelectedVeterinarian(value)
    onVeterinarianChange(value)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="service-select">Servicio</Label>
        <Select value={internalSelectedService} onValueChange={handleServiceChange}>
          <SelectTrigger id="service-select">
            <SelectValue placeholder="Seleccionar servicio" />
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

      <div>
        <Label htmlFor="vet-select">Veterinario (Opcional)</Label>
        <Select value={internalSelectedVeterinarian} onValueChange={handleVeterinarianChange}>
          <SelectTrigger id="vet-select">
            <SelectValue placeholder="Cualquiera" />
          </SelectTrigger>
          <SelectContent>
            {filteredVeterinarians.map((vet) => (
              <SelectItem key={vet.id} value={vet.id}>
                {vet.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
