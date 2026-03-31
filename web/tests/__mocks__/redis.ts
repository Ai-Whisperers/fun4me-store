/**
 * Mock Redis client for testing
 * Since redis is an optional dependency, we provide a mock
 */

export function createClient(_config?: any) {
  return {
    connect: async () => {},
    disconnect: async () => {},
    get: async (_key: string) => null,
    set: async (_key: string, _value: string) => {},
    setEx: async (_key: string, _ttl: number, _value: string) => {},
    del: async (_key: string) => {},
  }
}
