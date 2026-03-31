# Data Fetching Standard

This document outlines the standard patterns for data fetching to be used across the application. Following these patterns will ensure consistency, performance, and a good developer experience.

## 1. Server-Side Fetching (Initial Data Loads)

For initial data loads on a page, use **React Server Components** with the native `fetch()` API. This is the most performant way to get data to the user quickly, as it runs on the server and streams the result to the client.

**When to use:**
*   Fetching data that is essential for the initial render of a page.
*   Fetching data in components that do not require interactivity.

**Example:**
```tsx
// app/[clinic]/dashboard/page.tsx (Server Component)

async function getTodayAppointments(clinic: string): Promise<TodayAppointment[]> {
  const res = await fetch(`http://localhost:3000/api/dashboard/today-appointments?clinic=${clinic}`, {
    next: { revalidate: 60 }, // Revalidate every minute
  });

  if (!res.ok) {
    console.error("Failed to fetch today's appointments:", await res.text());
    return [];
  }
  return res.json();
}

export default async function ClinicalDashboardPage({ params }: { params: { clinic: string } }) {
  const { clinic } = params;
  const todayAppointments = await getTodayAppointments(clinic);

  return (
    <div>
      <h1>Dashboard</h1>
      <TodayScheduleWidget appointments={todayAppointments} clinic={clinic} />
    </div>
  );
}
```

## 2. Data Mutations (Create, Update, Delete)

For all data mutations, use **Server Actions**. Server Actions allow client components to securely call server-side code, making it easy to perform mutations without having to create separate API endpoints.

**When to use:**
*   Submitting forms (e.g., creating a new appointment).
*   Performing any action that modifies data on the server.

**Example:**
```tsx
// app/actions/update-appointment-status.ts (Server Action)
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateAppointmentStatus(appointmentId: string, newStatus: string, clinic: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', appointmentId);

  if (error) {
    console.error('Error updating appointment status:', error);
    return { success: false, error: 'Failed to update appointment status' };
  }

  revalidatePath(`/${clinic}/dashboard`);
  return { success: true };
}
```

## 3. Client-Side Fetching (Dynamic/Interactive Data)

For dynamic, interactive, or real-time data needs on the client, use **TanStack Query**. It provides excellent caching, revalidation, and other features that make it ideal for managing server state in client components.

**When to use:**
*   Fetching data in response to user interaction (e.g., filtering a list).
*   Fetching data that changes frequently (e.g., a real-time dashboard).
*   Fetching data in components that are used in multiple places and can benefit from a shared cache.

**Example:**
```tsx
// app/components/dashboard/waiting-room.tsx (Client Component)
'use client';

import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { updateAppointmentStatus } from '@/app/actions/update-appointment-status';

const queryClient = new QueryClient();

function WaitingRoom({ clinic }: { clinic: string }) {
  const queryClient = useQueryClient();

  const { data: appointments = [] } = useQuery<WaitingPatient[]>({
    queryKey: ['waitingRoom', clinic],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/waiting-room?clinic=${clinic}`);
      if (!res.ok) {
        throw new Error('Failed to fetch waiting room appointments');
      }
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ appointmentId, newStatus }: { appointmentId: string; newStatus: string; }) => 
      updateAppointmentStatus(appointmentId, newStatus, clinic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitingRoom', clinic] });
    },
  });

  return (
    <div>
      {/* ... JSX to display appointments and call updateStatus on button clicks ... */}
    </div>
  );
}

export function WaitingRoomWrapper({ clinic }: { clinic: string }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WaitingRoom clinic={clinic} />
    </QueryClientProvider>
  );
}
```
