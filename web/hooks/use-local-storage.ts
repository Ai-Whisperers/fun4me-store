import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prevValue: T) => T)) => void, () => void] {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error: unknown) {
      logger.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((prevValue: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value

        // Save state
        setStoredValue(valueToStore)

        // Save to local storage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error: unknown) {
        logger.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  // Remove from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error: unknown) {
      logger.warn(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}

// Hook for simple localStorage access without state management
export function useLocalStorageValue<T>(key: string, defaultValue?: T): T | null {
  const [value] = useLocalStorage(key, defaultValue || null)
  return value
}

// Hook for managing localStorage with error handling and type safety
export function useTypedLocalStorage<T>(
  key: string,
  initialValue: T,
  validator?: (value: unknown) => value is T
): [T, (value: T | ((prevValue: T) => T)) => void, () => void] {
  const [storedValue, setValue, removeValue] = useLocalStorage(key, initialValue)

  // Validate stored value if validator provided
  useEffect(() => {
    if (validator && !validator(storedValue)) {
      logger.warn(`Invalid value in localStorage for key "${key}", resetting to initial value`)
      setValue(initialValue)
    }
  }, [storedValue, validator, initialValue, setValue, key])

  return [storedValue, setValue, removeValue]
}
