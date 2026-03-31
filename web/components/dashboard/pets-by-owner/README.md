# Pets by Owner Component

Component refactorizado para gestionar la visualización de propietarios y sus mascotas en el dashboard.

## Estructura

```
pets-by-owner/
├── index.tsx                  # Componente principal (orquestador)
├── types.ts                   # Definiciones de tipos TypeScript
├── utils.ts                   # Funciones de utilidad
├── useOwnerFiltering.ts       # Hook personalizado para filtrado
├── SearchHeader.tsx           # Componente de búsqueda
├── OwnerList.tsx              # Lista de propietarios
├── OwnerListItem.tsx          # Item individual de propietario
├── OwnerDetailsCard.tsx       # Tarjeta con detalles del propietario
├── PetsSection.tsx            # Sección de mascotas
├── PetCard.tsx                # Tarjeta individual de mascota
├── EmptyState.tsx             # Estado vacío (sin selección)
└── README.md                  # Esta documentación
```

## Componentes

### index.tsx (Principal)

Componente orquestador que maneja:

- Estado de selección de propietario
- Estado de búsqueda
- Composición de subcomponentes

**Props:**

- `clinic: string` - Identificador de la clínica
- `owners: Owner[]` - Array de propietarios con sus mascotas

### SearchHeader.tsx

Barra de búsqueda con contador de resultados.

**Props:**

- `searchQuery: string`
- `onSearchChange: (value: string) => void`
- `resultCount: number`

### OwnerList.tsx

Renderiza la lista de propietarios filtrados.

**Props:**

- `owners: Owner[]`
- `selectedOwnerId: string | null`
- `onSelectOwner: (ownerId: string) => void`
- `searchQuery: string`

### OwnerListItem.tsx

Item individual clickeable en la lista de propietarios.

**Props:**

- `owner: Owner`
- `isSelected: boolean`
- `onClick: () => void`

### OwnerDetailsCard.tsx

Muestra información detallada del propietario seleccionado:

- Nombre y estado (activo/inactivo)
- Email, teléfono, dirección
- Última visita
- Acciones rápidas (nueva cita, ver ficha)

**Props:**

- `owner: Owner`
- `clinic: string`

### PetsSection.tsx

Sección que muestra las mascotas del propietario.

**Props:**

- `owner: Owner`
- `clinic: string`

### PetCard.tsx

Tarjeta individual de mascota con:

- Foto o emoji de especie
- Información básica (nombre, especie, raza)
- Edad calculada
- Badges (esterilizado, microchip)
- Acciones rápidas (nueva cita, vacunas)

**Props:**

- `pet: Pet`
- `clinic: string`

### EmptyState.tsx

Estado mostrado cuando no hay propietario seleccionado.

## Hooks Personalizados

### useOwnerFiltering.ts

Hook que filtra propietarios basándose en la búsqueda.

**Parámetros:**

- `owners: Owner[]`
- `searchQuery: string`

**Retorna:** `Owner[]` - Propietarios filtrados

**Lógica de búsqueda:**

- Nombre del propietario
- Email
- Teléfono
- Nombre de mascota
- Especie de mascota
- Raza de mascota

## Utilidades

### utils.ts

**formatDate(date: string | null): string**
Formatea fechas al formato español de Paraguay.

**calculateAge(dob: string | null): string**
Calcula edad de mascotas en años o meses.

**isClientActive(lastVisit: string | null): boolean**
Determina si un cliente está activo (última visita ≤ 90 días).

**getSpeciesEmoji(species: string): string**
Retorna emoji correspondiente a la especie de mascota.

## Tipos

### Pet

```typescript
interface Pet {
  id: string
  name: string
  species: string
  breed: string | null
  date_of_birth: string | null
  photo_url: string | null
  sex: string | null
  neutered: boolean | null
  microchip_id: string | null
}
```

### Owner

```typescript
interface Owner {
  id: string
  full_name: string
  email: string
  phone: string | null
  address: string | null
  created_at: string
  last_visit: string | null
  pets: Pet[]
}
```

## Uso

```tsx
import { PetsByOwner } from '@/components/dashboard/pets-by-owner'

export default function Page() {
  const owners = await fetchOwners()

  return <PetsByOwner clinic="terrapet" owners={owners} />
}
```

## Características

- **Búsqueda en tiempo real** - Filtra propietarios y mascotas
- **Responsive** - Diseño adaptable a móvil y desktop
- **Tema dinámico** - Usa variables CSS del tema
- **Estado activo** - Indica clientes activos/inactivos
- **Acciones rápidas** - Links directos a citas y vacunas
- **Performance** - Hook useMemo para filtrado eficiente

## Mejoras vs. Versión Original

1. **Separación de responsabilidades** - Cada componente tiene una función única
2. **Reutilización** - Componentes como PetCard y OwnerListItem son reutilizables
3. **Mantenibilidad** - Más fácil localizar y modificar funcionalidad
4. **Testing** - Componentes pequeños más fáciles de testear
5. **Performance** - Hooks optimizados reducen re-renders innecesarios
6. **Legibilidad** - Código más claro y autodocumentado
