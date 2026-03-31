import { NextRequest } from 'next/server';
import { createMockSupabase } from './mocks';

export function createMockApiContext({
  method = 'GET',
  body = null,
  params = {},
  searchParams = {},
  user = { id: 'test-user' },
  profile = { id: 'test-user', tenant_id: 'test-tenant', role: 'owner' },
  headers = {}
} = {}) {
  const url = new URL('http://localhost:3000/api/test');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value as string);
  });

  const req = new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: new Headers({
        ...headers,
        'x-test-context': JSON.stringify({ user, profile })
    })
  });

  const supabase = createMockSupabase();

  return {
    request: req,
    context: {
        user,
        profile,
        supabase,
        request: req,
        scoped: null // Mock if needed
    },
    supabase
  };
}
