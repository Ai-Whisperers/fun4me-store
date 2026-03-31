# Component Usage Guide

Quick reference for using the refactored and new components.

> **🏗️ New Architecture**: See [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) for the modular component architecture with shared hooks and utilities.

---

## Shared Components & Hooks

### ErrorBoundary

```typescript
import { ErrorBoundary } from '@/components/shared';

<ErrorBoundary
  fallback={<div>Custom error message</div>}
  onError={(error, info) => console.error(error, info)}
>
  <ComponentThatMightError />
</ErrorBoundary>
```

### LoadingSpinner

```typescript
import { LoadingSpinner } from '@/components/shared';

<LoadingSpinner size="md" text="Loading..." />
<LoadingSpinner fullScreen overlay />
```

### EmptyState

```typescript
import { EmptyState } from '@/components/shared';

<EmptyState
  icon={<Users className="h-12 w-12" />}
  title="No data found"
  description="Try adjusting your filters"
  action={{ label: "Clear Filters", onClick: handleClear }}
/>
```

### useAsyncData Hook

```typescript
import { useAsyncData } from '@/hooks'

const { data, isLoading, error, refetch } = useAsyncData(
  () => fetch('/api/data').then((res) => res.json()),
  [dependency],
  { retryCount: 3, refetchOnWindowFocus: true }
)
```

### useForm Hook

```typescript
import { useForm } from '@/hooks';
import { required, email } from '@/lib/utils';

const form = useForm({
  initialValues: { email: '', password: '' },
  validationRules: {
    email: required('Email required'),
    password: required('Password required')
  }
});

// In your component
const emailProps = form.getFieldProps('email');
<input {...emailProps} />

// Handle submit
const handleSubmit = form.handleSubmit(async (values) => {
  await api.save(values);
});
```

### useModal Hook

```typescript
import { useModal } from '@/hooks';

const modal = useModal();

return (
  <>
    <button onClick={modal.open}>Open Modal</button>
    <Modal isOpen={modal.isOpen} onClose={modal.close} />
  </>
);
```

### Utility Functions

```typescript
import { formatCurrency, formatDate, formatPhoneNumber } from '@/lib/utils'

formatCurrency(1000000, 'PYG') // ₲ 1.000.000
formatDate(new Date()) // "21 dic 2025"
formatPhoneNumber('0981123456') // 0981 123 456
```

---

## SearchField Component

### Basic Usage

```typescript
import { SearchField } from '@/components/ui';

<SearchField<Client>
  placeholder="Buscar clientes..."
  onSearch={async (query) => {
    const res = await fetch(`/api/clients?q=${query}`);
    return res.json();
  }}
  renderItem={(client) => (
    <div>
      <p className="font-bold">{client.name}</p>
      <p className="text-sm text-gray-500">{client.email}</p>
    </div>
  )}
  onSelect={(client) => router.push(`/dashboard/clients/${client.id}`)}
/>
```

### Advanced Options

```typescript
<SearchField
  minChars={3}              // Minimum characters before search (default: 2)
  debounceMs={500}          // Debounce delay in ms (default: 300)
  emptyMessage="Sin resultados"
  className="w-full"
  autoFocus={true}
/>
```

---

## DataTable Component

### Basic Usage

```typescript
import { DataTable } from '@/components/ui';

<DataTable<Client>
  data={clients}
  columns={[
    { key: 'full_name', label: 'Cliente', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Teléfono' },
  ]}
/>
```

### Custom Cell Rendering

```typescript
<DataTable<Client>
  data={clients}
  columns={[
    {
      key: 'full_name',
      label: 'Cliente',
      sortable: true,
      render: (client) => (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            {client.full_name[0]}
          </div>
          <div>
            <p className="font-bold">{client.full_name}</p>
            <p className="text-sm text-gray-500">{client.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'pet_count',
      label: 'Mascotas',
      sortable: true,
      render: (client) => (
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
          {client.pet_count}
        </span>
      )
    }
  ]}
/>
```

### With Pagination

```typescript
<DataTable
  data={largeDataset}
  columns={columns}
  showPagination={true}
  pageSize={20}
/>
```

### With Row Click

```typescript
<DataTable
  data={clients}
  columns={columns}
  onRowClick={(client) => router.push(`/clients/${client.id}`)}
/>
```

### Custom Mobile Layout

```typescript
<DataTable
  data={clients}
  columns={columns}
  mobileRender={(client) => (
    <div className="space-y-2">
      <h3 className="font-bold">{client.full_name}</h3>
      <p className="text-sm">{client.email}</p>
      <span className="text-xs text-gray-500">{client.pet_count} mascotas</span>
    </div>
  )}
/>
```

### Empty State

```typescript
<DataTable
  data={[]}
  columns={columns}
  emptyMessage="No hay clientes registrados"
  emptyIcon={<Users className="h-16 w-16 opacity-50" />}
/>
```

---

## Age Calculator Components

### Full Component (Easy)

```typescript
import { AgeCalculator } from '@/components/tools/age-calculator';

<AgeCalculator config={{
  contact: {
    whatsapp_number: '+595981234567'
  }
}} />
```

### Using Individual Components (Advanced)

```typescript
import { useAgeCalculation } from '@/hooks/use-age-calculation';
import { SpeciesSelector, AgeInput, ResultDisplay } from '@/components/tools/age-calculator';

function MyCustomCalculator() {
  const [species, setSpecies] = useState<Species>('dog');
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState<'years' | 'months'>('years');

  const { result, calculate } = useAgeCalculation(
    species, 'medium', 'indoor', 'parakeet', 'aquatic', 'tropical'
  );

  const ageInYears = ageUnit === 'months' ? parseFloat(age) / 12 : parseFloat(age);

  return (
    <div>
      <SpeciesSelector selected={species} onChange={setSpecies} />
      <AgeInput
        species={species}
        age={age}
        ageUnit={ageUnit}
        onAgeChange={setAge}
        onAgeUnitChange={setAgeUnit}
        onCalculate={() => calculate(ageInYears)}
      />
      {result && (
        <ResultDisplay
          result={result}
          species={species}
          ageInYears={ageInYears}
        />
      )}
    </div>
  );
}
```

### Using Just the Calculation Logic

```typescript
import { useAgeCalculation } from '@/hooks/use-age-calculation';

function AgeCalculatorAPI() {
  const { result, calculate } = useAgeCalculation(
    'dog', 'large', 'indoor', 'parakeet', 'aquatic', 'tropical'
  );

  const handleCalculate = () => {
    calculate(7, 'classic'); // 7 years old, classic formula
  };

  return (
    <div>
      <button onClick={handleCalculate}>Calculate</button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

---

## Hooks

### useDebounce

```typescript
import { useDebounce } from '@/hooks/use-debounce';

function SearchComponent() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500); // 500ms delay

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

### useAgeCalculation

```typescript
import { useAgeCalculation } from '@/hooks/use-age-calculation'

const { result, calculate, reset } = useAgeCalculation(
  species,
  dogSize,
  catType,
  birdCategory,
  turtleType,
  fishType
)

// Calculate age
calculate(ageInYears, formulaType) // formulaType: 'classic' | 'logarithmic'

// Reset result
reset()

// Access result
if (result) {
  console.log(result.humanAge) // Rounded human age
  console.log(result.exactHumanAge) // Precise decimal
  console.log(result.lifeStage) // Life stage info
  console.log(result.healthTips) // Health recommendations
  console.log(result.milestones) // Age milestones
}
```

---

## Configuration Data

### Species Config

```typescript
import { SPECIES_CONFIG, Species } from '@/lib/age-calculator/configs'

const species: Species = 'dog'
const config = SPECIES_CONFIG[species]

console.log(config.label) // "Perro"
console.log(config.emoji) // "🐕"
console.log(config.avgLifespan) // { min: 10, max: 13 }
```

### Dog Size Config

```typescript
import { DOG_SIZE_CONFIG } from '@/lib/age-calculator/configs'

const sizeConfig = DOG_SIZE_CONFIG['large']
console.log(sizeConfig.multiplier) // 5.5 years per year after age 2
console.log(sizeConfig.seniorAge) // 7 years
console.log(sizeConfig.year1Equiv) // 15 human years
```

### Age Presets

```typescript
import { getAgePresets } from '@/lib/age-calculator/configs'

const presets = getAgePresets('dog')
// [{ value: 6, unit: 'months' }, { value: 1, unit: 'years' }, ...]

const hamsterPresets = getAgePresets('hamster')
// [{ value: 3, unit: 'months' }, { value: 6, unit: 'months' }, ...]
```

---

## TypeScript Types

### SearchField

```typescript
interface SearchFieldProps<T> {
  placeholder?: string
  onSearch: (query: string) => Promise<T[]>
  renderItem: (item: T, index: number) => React.ReactNode
  onSelect: (item: T) => void
  minChars?: number
  debounceMs?: number
  emptyMessage?: string
  className?: string
  autoFocus?: boolean
}
```

### DataTable

```typescript
interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T, index: number) => React.ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor?: (item: T, index: number) => string
  onRowClick?: (item: T) => void
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  pageSize?: number
  showPagination?: boolean
  className?: string
  rowClassName?: string | ((item: T, index: number) => string)
  mobileRender?: (item: T, index: number) => React.ReactNode
}
```

### Age Calculator

```typescript
interface CalculationResult {
  humanAge: number
  exactHumanAge: number
  breakdown: CalculationStep[]
  formula: string
  lifeStage: LifeStage
  healthTips: string[]
  milestones: Milestone[]
  lifeExpectancy: {
    min: number
    max: number
    remaining: { min: number; max: number }
  }
}

type Species =
  | 'dog'
  | 'cat'
  | 'rabbit'
  | 'hamster'
  | 'guinea_pig'
  | 'bird'
  | 'ferret'
  | 'horse'
  | 'turtle'
  | 'fish'
type DogSize = 'toy' | 'small' | 'medium' | 'large' | 'giant'
type FormulaType = 'classic' | 'logarithmic'
```

---

## Examples in the Codebase

### SearchField Usage

- See `web/app/[clinic]/dashboard/clients/client-search.tsx` (can be refactored to use SearchField)

### DataTable Usage

- Replace manual tables in:
  - `web/app/[clinic]/dashboard/clients/page.tsx`
  - `web/app/[clinic]/dashboard/appointments/page.tsx`
  - `web/app/[clinic]/dashboard/audit/audit-logs-list.tsx`

### Age Calculator Usage

- Current: `web/app/[clinic]/tools/age-calculator/page.tsx`

---

## Best Practices

1. **Always specify generic types**

   ```typescript
   // Good
   <SearchField<Client> ... />

   // Bad (TypeScript can't infer)
   <SearchField ... />
   ```

2. **Extract render functions for complex cells**

   ```typescript
   // Good - Readable
   const renderClientCell = (client: Client) => (
     <div>...</div>
   );

   <DataTable columns={[
     { key: 'name', render: renderClientCell }
   ]} />

   // Bad - Hard to read
   <DataTable columns={[
     { key: 'name', render: (client) => <div>...</div> }
   ]} />
   ```

3. **Use memoization for expensive renders**

   ```typescript
   const columns = useMemo(() => [{ key: 'name', label: 'Name', render: expensiveRender }], [])
   ```

4. **Provide meaningful empty states**

   ```typescript
   <DataTable
     emptyMessage="No se encontraron clientes. Intenta agregar uno nuevo."
     emptyIcon={<Users />}
   />
   ```

5. **Use TypeScript interfaces for data shapes**

   ```typescript
   interface Client {
     id: string;
     full_name: string;
     email: string;
     pet_count: number;
   }

   <DataTable<Client> data={clients} columns={columns} />
   ```

---

**Last Updated**: December 19, 2025
