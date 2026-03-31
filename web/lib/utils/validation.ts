// Common validation rules

export const required =
  (message = 'Este campo es requerido') =>
  (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return message
    }
    return null
  }

export const minLength = (min: number, message?: string) => (value: string) => {
  if (!value || value.length < min) {
    return message || `Debe tener al menos ${min} caracteres`
  }
  return null
}

export const maxLength = (max: number, message?: string) => (value: string) => {
  if (value && value.length > max) {
    return message || `No puede tener más de ${max} caracteres`
  }
  return null
}

export const email =
  (message = 'Email inválido') =>
  (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (value && !emailRegex.test(value)) {
      return message
    }
    return null
  }

export const phone =
  (message = 'Número de teléfono inválido') =>
  (value: string) => {
    // Paraguayan phone validation (9 digits)
    const phoneRegex = /^\d{9}$/
    const cleaned = value.replace(/\D/g, '')
    if (value && !phoneRegex.test(cleaned)) {
      return message
    }
    return null
  }

export const numeric =
  (message = 'Debe ser un número') =>
  (value: unknown) => {
    if (value && isNaN(Number(value))) {
      return message
    }
    return null
  }

export const min = (minValue: number, message?: string) => (value: number) => {
  if (value !== undefined && value !== null && value < minValue) {
    return message || `Debe ser mayor o igual a ${minValue}`
  }
  return null
}

export const max = (maxValue: number, message?: string) => (value: number) => {
  if (value !== undefined && value !== null && value > maxValue) {
    return message || `Debe ser menor o igual a ${maxValue}`
  }
  return null
}

// Pattern validation
export const pattern =
  (regex: RegExp, message = 'Formato inválido') =>
  (value: string) => {
    if (value && !regex.test(value)) {
      return message
    }
    return null
  }

// Validation rule type
type ValidationRule<T = unknown> = (value: T) => string | null

// Custom validation helper
export const createValidator =
  <T = unknown>(...rules: Array<ValidationRule<T>>) =>
  (value: T) => {
    for (const rule of rules) {
      const error = rule(value)
      if (error) return error
    }
    return null
  }

// Validate multiple fields
export const validateFields = <T extends Record<string, unknown>>(
  fields: T,
  rules: { [K in keyof T]?: ValidationRule<T[K]> }
): Partial<Record<keyof T, string>> => {
  const errors: Partial<Record<keyof T, string>> = {}

  ;(Object.keys(rules) as Array<keyof T>).forEach((field) => {
    const rule = rules[field]
    if (rule) {
      const error = rule(fields[field])
      if (error) {
        errors[field] = error
      }
    }
  })

  return errors
}
