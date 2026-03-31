# Data Fetching Standard

This document outlines the official standards for fetching and mutating data in this project. Adhering to these patterns is crucial for maintaining a consistent, performant, and maintainable codebase.

## 1. Server-Side Data Fetching (The Default)

For fetching data required for the initial render of a page, **always** call your data-fetching functions directly from `async` React Server Components (RSCs). Avoid making `fetch` calls to your own application's API routes from server components.

- **When to use:** Fetching the primary, initial data for a page or server-side layout.
- **Why:** This is the most performant method. It avoids an unnecessary network hop and keeps data fetching logic close to where it's used.

**Example:**
```tsx
// app/[clinic]/dashboard/page.tsx
import { getTodayAppointmentsForClinic } from '@/lib/appointments';

export default async function DashboardPage({ params }) {
  const { clinic } = params;
  // Good: Directly calling the data function.
  const appointments = await getTodayAppointmentsForClinic(clinic);

  return <TodayScheduleWidget appointments={appointments} />;
}
```
```ts
// lib/appointments.ts
export async function getTodayAppointmentsForClinic(clinicId: string) {
  const supabase = await createClient();
  // ... logic to fetch appointments from Supabase
  return data;
}
```

## 2. Client-Side Data Fetching

For data that is dynamic, needs to be re-fetched on the client based on user interaction, or polled periodically, use **`@tanstack/react-query`**.

- **When to use:**
  - Data that changes frequently (e.g., a real-time waiting room).
  - Fetching data in response to user events (e.g., clicking a filter button).
  - Managing complex cache invalidation.
- **Why:** It provides a robust solution for caching, re-fetching, and managing server state on the client, avoiding complex manual `useState` and `useEffect` logic.

**Example (from `WaitingRoom.tsx`):**
```tsx
'use client';
import { useQuery } from '@tanstack/react-query';

// This requires a <QueryClientProvider> wrapper further up the tree.

function WaitingRoom({ clinic }: { clinic: string }) {
  const { isPending, error, data } = useQuery({
    queryKey: ['waitingRoom', clinic],
    queryFn: () => 
      fetch(`/api/dashboard/waiting-room?clinic=${clinic}`).then((res) => 
        res.json()
      ),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // ... render logic
}
```

## 3. Data Mutations (Creating, Updating, Deleting)

For all data mutations, **always** use **Server Actions**.

### 3.1. Basic Mutations (From Forms)

For simple mutations originating from a `<form>`, you can pass the Server Action directly to the `action` prop.

**Example:**
```ts
// app/actions.ts
'use server';

export async function createItem(formData: FormData) {
  // ... logic to save to database
  revalidatePath('/items');
}
```
```tsx
// app/some-form-component.tsx
import { createItem } from './actions';

export function ItemForm() {
  return (
    <form action={createItem}>
      <input type="text" name="name" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### 3.2. Client-Side Mutations (From `onClick` Handlers)

For mutations that are not tied to a form or require more complex client-side logic (like updating UI state on success), use the **`useMutation`** hook from `@tanstack/react-query` to call your Server Action.

- **Why:** This pattern elegantly handles loading/pending states for the mutation and, most importantly, allows you to **invalidate and refetch** client-side queries upon success, ensuring the UI stays up-to-date.

**Example (from `WaitingRoom.tsx`):**
```tsx
'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateAppointmentStatus } from '@/app/actions/update-appointment-status';

function WaitingRoom({ clinic }: { clinic: string }) {
  const queryClient = useQueryClient();

  const { mutate: updateStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: (variables: { appointmentId: string, newStatus: string }) => 
      updateAppointmentStatus(variables.appointmentId, variables.newStatus, clinic),
    
    onSuccess: () => {
      // When the mutation is successful, invalidate the 'waitingRoom' query
      // to force it to refetch the latest data.
      queryClient.invalidateQueries({ queryKey: ['waitingRoom', clinic] });
    },
  });

  return (
    <button onClick={() => updateStatus({ appointmentId: '123', newStatus: 'completed' })}>
      Complete
    </button>
  );
}
```
