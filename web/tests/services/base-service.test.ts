/**
 * BaseService Tests
 *
 * Tests the abstract base class functionality:
 * - Error handling
 * - Tenant validation
 * - Transaction execution
 * - Database error mapping
 * - Required field validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseService, type ServiceResult } from '@/lib/services/base-service';
import { createMockSupabaseClient, type MockSupabaseClient } from './__mocks__/supabase-mock';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Concrete implementation for testing
class TestService extends BaseService {
  async testHandleError<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<ServiceResult<T>> {
    return this.handleError(operation, errorMessage);
  }

  testValidateTenantAccess(
    resourceTenantId: string,
    requestTenantId: string,
    resourceType?: string
  ): void {
    return this.validateTenantAccess(resourceTenantId, requestTenantId, resourceType);
  }

  async testExecuteTransaction<T>(
    operations: () => Promise<T>
  ): Promise<ServiceResult<T>> {
    return this.executeTransaction(operations);
  }

  testMapDatabaseError(error: unknown): string {
    return this.mapDatabaseError(error);
  }

  testValidateRequiredFields(
    data: Record<string, unknown>,
    requiredFields: string[]
  ): void {
    return this.validateRequiredFields(data, requiredFields);
  }
}

describe('BaseService', () => {
  let mockClient: MockSupabaseClient;
  let service: TestService;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new TestService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // handleError Tests
  // ===========================================================================

  describe('handleError', () => {
    it('should return success result when operation succeeds', async () => {
      const result = await service.testHandleError(
        async () => ({ id: '123', name: 'Test' }),
        'Operation failed'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: '123', name: 'Test' });
      }
    });

    it('should return error result when operation throws Error', async () => {
      const result = await service.testHandleError(
        async () => {
          throw new Error('Database connection failed');
        },
        'Failed to fetch data'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service returns specific error message from the thrown Error
        expect(result.error).toBe('Database connection failed');
        expect(result.details?.message).toBe('Database connection failed');
      }
    });

    it('should handle non-Error thrown values', async () => {
      const result = await service.testHandleError(
        async () => {
          throw 'String error';
        },
        'Operation failed'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        // String thrown values are converted to string
        expect(result.error).toBe('String error');
        expect(result.details?.message).toBe('String error');
      }
    });

    it('should handle null/undefined thrown values', async () => {
      const result = await service.testHandleError(
        async () => {
          throw null;
        },
        'Operation failed'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        // null becomes 'null' via String()
        expect(result.error).toBe('null');
      }
    });

    it('should return correct data types', async () => {
      // Test with array
      const arrayResult = await service.testHandleError(
        async () => [1, 2, 3],
        'Failed'
      );
      expect(arrayResult.success).toBe(true);
      if (arrayResult.success) {
        expect(arrayResult.data).toEqual([1, 2, 3]);
      }

      // Test with object
      const objectResult = await service.testHandleError(
        async () => ({ nested: { value: true } }),
        'Failed'
      );
      expect(objectResult.success).toBe(true);
      if (objectResult.success) {
        expect(objectResult.data).toEqual({ nested: { value: true } });
      }

      // Test with null
      const nullResult = await service.testHandleError(
        async () => null,
        'Failed'
      );
      expect(nullResult.success).toBe(true);
      if (nullResult.success) {
        expect(nullResult.data).toBeNull();
      }
    });
  });

  // ===========================================================================
  // validateTenantAccess Tests
  // ===========================================================================

  describe('validateTenantAccess', () => {
    it('should not throw when tenant IDs match', () => {
      expect(() => {
        service.testValidateTenantAccess('tenant-123', 'tenant-123', 'pet');
      }).not.toThrow();
    });

    it('should throw when tenant IDs do not match', () => {
      expect(() => {
        service.testValidateTenantAccess('tenant-123', 'tenant-456', 'pet');
      }).toThrow('No puede acceder a datos de otra clínica.');
    });

    it('should use default resource type when not provided', () => {
      expect(() => {
        service.testValidateTenantAccess('tenant-123', 'tenant-456');
      }).toThrow('No puede acceder a datos de otra clínica.');
    });

    it('should handle empty string tenant IDs', () => {
      expect(() => {
        service.testValidateTenantAccess('', 'tenant-456', 'pet');
      }).toThrow();
    });
  });

  // ===========================================================================
  // executeTransaction Tests
  // ===========================================================================

  describe('executeTransaction', () => {
    it('should return success result when transaction succeeds', async () => {
      const result = await service.testExecuteTransaction(async () => {
        return { id: 'new-123', created: true };
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: 'new-123', created: true });
      }
    });

    it('should return error result when transaction fails', async () => {
      const result = await service.testExecuteTransaction(async () => {
        throw new Error('Transaction rollback');
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service returns specific error message
        expect(result.error).toBe('Transaction rollback');
      }
    });
  });

  // ===========================================================================
  // mapDatabaseError Tests
  // ===========================================================================

  describe('mapDatabaseError', () => {
    it('should map unique violation error', () => {
      const error = { code: '23505', message: 'unique_violation' };
      const result = service.testMapDatabaseError(error);
      expect(result).toBe('Este registro ya existe en el sistema');
    });

    it('should map foreign key violation error', () => {
      const error = { code: '23503', message: 'foreign_key_violation' };
      const result = service.testMapDatabaseError(error);
      expect(result).toBe('Operación no permitida: registro relacionado no existe');
    });

    it('should map not null violation error', () => {
      const error = { code: '23502', message: 'not_null_violation' };
      const result = service.testMapDatabaseError(error);
      expect(result).toBe('Faltan campos requeridos');
    });

    it('should map invalid text representation error', () => {
      const error = { code: '22P02', message: 'invalid_text_representation' };
      const result = service.testMapDatabaseError(error);
      expect(result).toBe('Formato de datos inválido');
    });

    it('should map RLS violation error', () => {
      const error = { code: 'PGRST116', message: 'RLS violation' };
      const result = service.testMapDatabaseError(error);
      expect(result).toBe('No tiene permisos para realizar esta operación');
    });

    it('should return error message for unknown error codes', () => {
      const error = { code: 'UNKNOWN', message: 'Something went wrong' };
      const result = service.testMapDatabaseError(error);
      expect(result).toBe('Something went wrong');
    });

    it('should handle Error instances', () => {
      const error = new Error('Standard error message');
      const result = service.testMapDatabaseError(error);
      expect(result).toBe('Standard error message');
    });

    it('should handle non-object errors', () => {
      // Non-Error, non-object values return 'Error desconocido'
      const result = service.testMapDatabaseError('string error');
      expect(result).toBe('Error desconocido');
    });

    it('should handle null/undefined errors', () => {
      const result = service.testMapDatabaseError(null);
      expect(result).toBe('Error desconocido');
    });
  });

  // ===========================================================================
  // validateRequiredFields Tests
  // ===========================================================================

  describe('validateRequiredFields', () => {
    it('should not throw when all required fields are present', () => {
      const data = { name: 'Test', email: 'test@example.com', age: 25 };
      expect(() => {
        service.testValidateRequiredFields(data, ['name', 'email']);
      }).not.toThrow();
    });

    it('should throw when required field is missing', () => {
      const data = { name: 'Test' };
      expect(() => {
        service.testValidateRequiredFields(data, ['name', 'email']);
      }).toThrow('Campos requeridos faltantes: email');
    });

    it('should throw when multiple required fields are missing', () => {
      const data = { age: 25 };
      expect(() => {
        service.testValidateRequiredFields(data, ['name', 'email', 'phone']);
      }).toThrow('Campos requeridos faltantes: name, email, phone');
    });

    it('should throw when required field is empty string', () => {
      const data = { name: '', email: 'test@example.com' };
      expect(() => {
        service.testValidateRequiredFields(data, ['name', 'email']);
      }).toThrow('Campos requeridos faltantes: name');
    });

    it('should throw when required field is whitespace only', () => {
      const data = { name: '   ', email: 'test@example.com' };
      expect(() => {
        service.testValidateRequiredFields(data, ['name', 'email']);
      }).toThrow('Campos requeridos faltantes: name');
    });

    it('should accept null values as missing', () => {
      const data = { name: null, email: 'test@example.com' };
      expect(() => {
        service.testValidateRequiredFields(data, ['name', 'email']);
      }).toThrow('Campos requeridos faltantes: name');
    });

    it('should accept undefined values as missing', () => {
      const data = { name: undefined, email: 'test@example.com' };
      expect(() => {
        service.testValidateRequiredFields(data, ['name', 'email']);
      }).toThrow('Campos requeridos faltantes: name');
    });

    it('should accept zero as valid value', () => {
      const data = { count: 0, name: 'Test' };
      expect(() => {
        service.testValidateRequiredFields(data, ['count', 'name']);
      }).not.toThrow();
    });

    it('should accept false as valid value', () => {
      const data = { active: false, name: 'Test' };
      expect(() => {
        service.testValidateRequiredFields(data, ['active', 'name']);
      }).not.toThrow();
    });

    it('should handle empty required fields array', () => {
      const data = {};
      expect(() => {
        service.testValidateRequiredFields(data, []);
      }).not.toThrow();
    });
  });

  // ===========================================================================
  // Integration-style Tests
  // ===========================================================================

  describe('Integration scenarios', () => {
    it('should handle complete success flow', async () => {
      const result = await service.testHandleError(async () => {
        // Simulate fetching and validating
        const data = { id: '123', tenant_id: 'tenant-abc' };
        service.testValidateTenantAccess(data.tenant_id, 'tenant-abc', 'resource');
        service.testValidateRequiredFields(data, ['id', 'tenant_id']);
        return data;
      }, 'Operation failed');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: '123', tenant_id: 'tenant-abc' });
      }
    });

    it('should handle tenant validation failure within handleError', async () => {
      const result = await service.testHandleError(async () => {
        const data = { id: '123', tenant_id: 'tenant-abc' };
        service.testValidateTenantAccess(data.tenant_id, 'tenant-xyz', 'resource');
        return data;
      }, 'Operation failed');

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service returns specific error from the thrown exception
        expect(result.error).toBe('No puede acceder a datos de otra clínica.');
        expect(result.details?.message).toBe('No puede acceder a datos de otra clínica.');
      }
    });

    it('should handle required fields validation failure within handleError', async () => {
      const result = await service.testHandleError(async () => {
        const data = { id: '123' };
        service.testValidateRequiredFields(data, ['id', 'name']);
        return data;
      }, 'Validation failed');

      expect(result.success).toBe(false);
      if (!result.success) {
        // Service returns specific error message
        expect(result.error).toContain('Campos requeridos faltantes');
        expect(result.details?.message).toContain('Campos requeridos faltantes');
      }
    });
  });
});
