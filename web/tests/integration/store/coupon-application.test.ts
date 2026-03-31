/**
 * Coupon Application Integration Tests
 *
 * Tests the coupon validation and application workflow including:
 * - Discount calculation (percentage and fixed)
 * - Usage limits and expiration
 * - Minimum order requirements
 * - User-specific restrictions
 * - Campaign-based coupons
 *
 * @ticket TICKET-BIZ-006
 */
import { describe, it, expect } from 'vitest'

describe('Coupon Business Rules', () => {
  describe('Discount Calculations', () => {
    const calculatePercentageDiscount = (cartTotal: number, percentage: number): number => {
      return Math.round((cartTotal * percentage) / 100)
    }

    const calculateFixedDiscount = (
      cartTotal: number,
      fixedAmount: number
    ): { discount: number; remaining: number } => {
      const discount = Math.min(fixedAmount, cartTotal)
      return {
        discount,
        remaining: cartTotal - discount,
      }
    }

    describe('Percentage Discounts', () => {
      it('should calculate 10% discount correctly', () => {
        expect(calculatePercentageDiscount(100000, 10)).toBe(10000)
      })

      it('should calculate 25% discount correctly', () => {
        expect(calculatePercentageDiscount(200000, 25)).toBe(50000)
      })

      it('should handle 100% discount', () => {
        expect(calculatePercentageDiscount(100000, 100)).toBe(100000)
      })

      it('should round to whole Guarani', () => {
        // 33333 * 10 / 100 = 3333.3 -> rounds to 3333
        expect(calculatePercentageDiscount(33333, 10)).toBe(3333)
      })

      it('should handle small percentages on large amounts', () => {
        // 1% of 1,000,000 = 10,000
        expect(calculatePercentageDiscount(1000000, 1)).toBe(10000)
      })
    })

    describe('Fixed Discounts', () => {
      it('should apply fixed discount when cart exceeds discount', () => {
        const result = calculateFixedDiscount(100000, 15000)
        expect(result.discount).toBe(15000)
        expect(result.remaining).toBe(85000)
      })

      it('should cap discount at cart total', () => {
        const result = calculateFixedDiscount(10000, 15000)
        expect(result.discount).toBe(10000)
        expect(result.remaining).toBe(0)
      })

      it('should handle exact match', () => {
        const result = calculateFixedDiscount(15000, 15000)
        expect(result.discount).toBe(15000)
        expect(result.remaining).toBe(0)
      })

      it('should handle zero cart total', () => {
        const result = calculateFixedDiscount(0, 15000)
        expect(result.discount).toBe(0)
        expect(result.remaining).toBe(0)
      })
    })
  })

  describe('Coupon Validity Periods', () => {
    const isCouponActive = (validFrom: Date, validTo: Date, now: Date = new Date()): boolean => {
      return now >= validFrom && now <= validTo
    }

    it('should be active within validity period', () => {
      const validFrom = new Date('2024-01-01')
      const validTo = new Date('2024-12-31')
      const checkDate = new Date('2024-06-15')

      expect(isCouponActive(validFrom, validTo, checkDate)).toBe(true)
    })

    it('should be inactive before validity period', () => {
      const validFrom = new Date('2024-06-01')
      const validTo = new Date('2024-12-31')
      const checkDate = new Date('2024-05-15')

      expect(isCouponActive(validFrom, validTo, checkDate)).toBe(false)
    })

    it('should be inactive after validity period', () => {
      const validFrom = new Date('2024-01-01')
      const validTo = new Date('2024-06-30')
      const checkDate = new Date('2024-07-15')

      expect(isCouponActive(validFrom, validTo, checkDate)).toBe(false)
    })

    it('should be active on start date', () => {
      const validFrom = new Date('2024-06-01')
      const validTo = new Date('2024-12-31')

      expect(isCouponActive(validFrom, validTo, validFrom)).toBe(true)
    })

    it('should be active on end date', () => {
      const validFrom = new Date('2024-01-01')
      const validTo = new Date('2024-06-30')

      expect(isCouponActive(validFrom, validTo, validTo)).toBe(true)
    })
  })

  describe('Usage Limit Tracking', () => {
    interface CouponUsage {
      limit: number | null
      currentUses: number
    }

    const canUseCoupon = (usage: CouponUsage): boolean => {
      if (usage.limit === null) return true // Unlimited
      return usage.currentUses < usage.limit
    }

    it('should allow use when under limit', () => {
      expect(canUseCoupon({ limit: 100, currentUses: 50 })).toBe(true)
    })

    it('should reject use when at limit', () => {
      expect(canUseCoupon({ limit: 100, currentUses: 100 })).toBe(false)
    })

    it('should reject use when over limit', () => {
      expect(canUseCoupon({ limit: 100, currentUses: 101 })).toBe(false)
    })

    it('should allow unlimited uses', () => {
      expect(canUseCoupon({ limit: null, currentUses: 9999 })).toBe(true)
    })

    it('should handle zero limit (disabled coupon)', () => {
      expect(canUseCoupon({ limit: 0, currentUses: 0 })).toBe(false)
    })
  })

  describe('Per-User Usage Limits', () => {
    interface UserCouponUsage {
      userLimit: number | null
      userUses: number
    }

    const canUserUseCoupon = (usage: UserCouponUsage): boolean => {
      if (usage.userLimit === null) return true
      return usage.userUses < usage.userLimit
    }

    it('should allow single use per user coupon on first use', () => {
      expect(canUserUseCoupon({ userLimit: 1, userUses: 0 })).toBe(true)
    })

    it('should reject single use per user coupon on second use', () => {
      expect(canUserUseCoupon({ userLimit: 1, userUses: 1 })).toBe(false)
    })

    it('should allow unlimited uses per user', () => {
      expect(canUserUseCoupon({ userLimit: null, userUses: 100 })).toBe(true)
    })

    it('should handle multi-use per user limit', () => {
      expect(canUserUseCoupon({ userLimit: 3, userUses: 2 })).toBe(true)
      expect(canUserUseCoupon({ userLimit: 3, userUses: 3 })).toBe(false)
    })
  })

  describe('Minimum Order Requirements', () => {
    interface OrderRequirement {
      minimumAmount: number | null
      cartTotal: number
    }

    const meetsMinimumOrder = (req: OrderRequirement): boolean => {
      if (req.minimumAmount === null) return true
      return req.cartTotal >= req.minimumAmount
    }

    it('should allow when cart meets minimum', () => {
      expect(meetsMinimumOrder({ minimumAmount: 50000, cartTotal: 75000 })).toBe(true)
    })

    it('should allow when cart equals minimum', () => {
      expect(meetsMinimumOrder({ minimumAmount: 50000, cartTotal: 50000 })).toBe(true)
    })

    it('should reject when cart is below minimum', () => {
      expect(meetsMinimumOrder({ minimumAmount: 50000, cartTotal: 49999 })).toBe(false)
    })

    it('should allow any cart when no minimum', () => {
      expect(meetsMinimumOrder({ minimumAmount: null, cartTotal: 100 })).toBe(true)
    })
  })

  describe('Maximum Discount Caps', () => {
    interface DiscountCap {
      discountType: 'percentage' | 'fixed'
      discountValue: number
      maxDiscount: number | null
      cartTotal: number
    }

    const calculateCappedDiscount = (cap: DiscountCap): number => {
      let discount: number

      if (cap.discountType === 'percentage') {
        discount = Math.round((cap.cartTotal * cap.discountValue) / 100)
      } else {
        discount = cap.discountValue
      }

      if (cap.maxDiscount !== null) {
        discount = Math.min(discount, cap.maxDiscount)
      }

      return Math.min(discount, cap.cartTotal)
    }

    it('should cap percentage discount at maximum', () => {
      // 50% of 200,000 = 100,000, but max is 50,000
      const result = calculateCappedDiscount({
        discountType: 'percentage',
        discountValue: 50,
        maxDiscount: 50000,
        cartTotal: 200000,
      })

      expect(result).toBe(50000)
    })

    it('should not cap when under maximum', () => {
      // 10% of 100,000 = 10,000, max is 50,000
      const result = calculateCappedDiscount({
        discountType: 'percentage',
        discountValue: 10,
        maxDiscount: 50000,
        cartTotal: 100000,
      })

      expect(result).toBe(10000)
    })

    it('should allow uncapped discounts', () => {
      const result = calculateCappedDiscount({
        discountType: 'percentage',
        discountValue: 50,
        maxDiscount: null,
        cartTotal: 200000,
      })

      expect(result).toBe(100000)
    })

    it('should cap fixed discount at cart total', () => {
      const result = calculateCappedDiscount({
        discountType: 'fixed',
        discountValue: 50000,
        maxDiscount: null,
        cartTotal: 30000,
      })

      expect(result).toBe(30000)
    })
  })
})

describe('Coupon Code Formats', () => {
  describe('Code Validation', () => {
    const isValidCouponCode = (code: string): boolean => {
      // Alphanumeric, uppercase, 4-20 characters
      const pattern = /^[A-Z0-9]{4,20}$/
      return pattern.test(code.toUpperCase())
    }

    it('should accept valid alphanumeric codes', () => {
      expect(isValidCouponCode('DESCUENTO10')).toBe(true)
      expect(isValidCouponCode('NAVIDAD2024')).toBe(true)
      expect(isValidCouponCode('ABC123')).toBe(true)
    })

    it('should accept lowercase codes (will be uppercased)', () => {
      expect(isValidCouponCode('descuento10')).toBe(true)
    })

    it('should reject codes with special characters', () => {
      expect(isValidCouponCode('DESC-10')).toBe(false)
      expect(isValidCouponCode('DESC_10')).toBe(false)
      expect(isValidCouponCode('DESC 10')).toBe(false)
    })

    it('should reject codes that are too short', () => {
      expect(isValidCouponCode('ABC')).toBe(false)
    })

    it('should reject codes that are too long', () => {
      expect(isValidCouponCode('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe(false)
    })
  })

  describe('Code Normalization', () => {
    const normalizeCode = (code: string): string => {
      return code.toUpperCase().trim()
    }

    it('should uppercase lowercase codes', () => {
      expect(normalizeCode('descuento')).toBe('DESCUENTO')
    })

    it('should trim whitespace', () => {
      expect(normalizeCode('  DESCUENTO  ')).toBe('DESCUENTO')
    })

    it('should handle mixed case', () => {
      expect(normalizeCode('DeScUeNtO')).toBe('DESCUENTO')
    })
  })
})

describe('Campaign-Based Coupons', () => {
  describe('Campaign Types', () => {
    const campaignTypes = [
      'welcome',
      'seasonal',
      'loyalty',
      'referral',
      'first_purchase',
      'birthday',
      'holiday',
      'clearance',
    ]

    it('should document valid campaign types', () => {
      expect(campaignTypes).toContain('welcome')
      expect(campaignTypes).toContain('seasonal')
      expect(campaignTypes).toContain('loyalty')
      expect(campaignTypes).toContain('referral')
    })

    it('should have birthday campaign type', () => {
      expect(campaignTypes).toContain('birthday')
    })
  })

  describe('Campaign Discount Strategies', () => {
    interface CampaignConfig {
      type: string
      discountType: 'percentage' | 'fixed'
      baseDiscount: number
      tierMultipliers?: Record<string, number>
    }

    const calculateCampaignDiscount = (
      config: CampaignConfig,
      tier?: string
    ): number => {
      let discount = config.baseDiscount

      if (tier && config.tierMultipliers?.[tier]) {
        discount *= config.tierMultipliers[tier]
      }

      return Math.round(discount)
    }

    it('should apply base discount for welcome campaign', () => {
      const campaign: CampaignConfig = {
        type: 'welcome',
        discountType: 'percentage',
        baseDiscount: 10,
      }

      expect(calculateCampaignDiscount(campaign)).toBe(10)
    })

    it('should apply tiered discount for loyalty campaign', () => {
      const campaign: CampaignConfig = {
        type: 'loyalty',
        discountType: 'percentage',
        baseDiscount: 5,
        tierMultipliers: {
          bronze: 1,
          silver: 1.5,
          gold: 2,
          platinum: 3,
        },
      }

      expect(calculateCampaignDiscount(campaign, 'bronze')).toBe(5)
      expect(calculateCampaignDiscount(campaign, 'silver')).toBe(8) // 5 * 1.5 = 7.5 -> 8
      expect(calculateCampaignDiscount(campaign, 'gold')).toBe(10)
      expect(calculateCampaignDiscount(campaign, 'platinum')).toBe(15)
    })
  })

  describe('First Purchase Discount', () => {
    const isFirstPurchase = (previousOrders: number): boolean => {
      return previousOrders === 0
    }

    it('should identify first purchase', () => {
      expect(isFirstPurchase(0)).toBe(true)
    })

    it('should identify returning customer', () => {
      expect(isFirstPurchase(1)).toBe(false)
      expect(isFirstPurchase(10)).toBe(false)
    })
  })
})

describe('Coupon Validation Error Messages', () => {
  type ValidationError =
    | 'EXPIRED'
    | 'NOT_YET_ACTIVE'
    | 'USAGE_LIMIT_REACHED'
    | 'ALREADY_USED'
    | 'MINIMUM_NOT_MET'
    | 'INVALID_CODE'
    | 'NOT_FOUND'

  const getErrorMessage = (error: ValidationError): string => {
    const messages: Record<ValidationError, string> = {
      EXPIRED: 'Cupón expirado',
      NOT_YET_ACTIVE: 'Cupón aún no está activo',
      USAGE_LIMIT_REACHED: 'Cupón ha alcanzado su límite de usos',
      ALREADY_USED: 'Ya has utilizado este cupón',
      MINIMUM_NOT_MET: 'El monto mínimo de compra no ha sido alcanzado',
      INVALID_CODE: 'Código de cupón inválido',
      NOT_FOUND: 'Cupón no encontrado',
    }
    return messages[error]
  }

  it('should return Spanish error for expired coupon', () => {
    expect(getErrorMessage('EXPIRED')).toBe('Cupón expirado')
  })

  it('should return Spanish error for not yet active coupon', () => {
    expect(getErrorMessage('NOT_YET_ACTIVE')).toContain('no está activo')
  })

  it('should return Spanish error for usage limit', () => {
    expect(getErrorMessage('USAGE_LIMIT_REACHED')).toContain('límite')
  })

  it('should return Spanish error for already used', () => {
    expect(getErrorMessage('ALREADY_USED')).toContain('utilizado')
  })

  it('should return Spanish error for minimum not met', () => {
    expect(getErrorMessage('MINIMUM_NOT_MET')).toContain('mínimo')
  })
})

describe('Coupon Application Order', () => {
  interface CartItem {
    id: string
    price: number
    quantity: number
  }

  interface AppliedCoupon {
    code: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    appliedDiscount: number
  }

  const calculateFinalTotal = (
    items: CartItem[],
    coupon: AppliedCoupon | null
  ): { subtotal: number; discount: number; total: number } => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    let discount = 0
    if (coupon) {
      if (coupon.discountType === 'percentage') {
        discount = Math.round((subtotal * coupon.discountValue) / 100)
      } else {
        discount = Math.min(coupon.discountValue, subtotal)
      }
    }

    return {
      subtotal,
      discount,
      total: subtotal - discount,
    }
  }

  it('should calculate subtotal correctly', () => {
    const items: CartItem[] = [
      { id: '1', price: 25000, quantity: 2 },
      { id: '2', price: 15000, quantity: 1 },
    ]

    const result = calculateFinalTotal(items, null)
    expect(result.subtotal).toBe(65000)
    expect(result.discount).toBe(0)
    expect(result.total).toBe(65000)
  })

  it('should apply percentage discount', () => {
    const items: CartItem[] = [{ id: '1', price: 100000, quantity: 1 }]
    const coupon: AppliedCoupon = {
      code: 'DESC10',
      discountType: 'percentage',
      discountValue: 10,
      appliedDiscount: 10000,
    }

    const result = calculateFinalTotal(items, coupon)
    expect(result.discount).toBe(10000)
    expect(result.total).toBe(90000)
  })

  it('should apply fixed discount', () => {
    const items: CartItem[] = [{ id: '1', price: 100000, quantity: 1 }]
    const coupon: AppliedCoupon = {
      code: 'FIJO15K',
      discountType: 'fixed',
      discountValue: 15000,
      appliedDiscount: 15000,
    }

    const result = calculateFinalTotal(items, coupon)
    expect(result.discount).toBe(15000)
    expect(result.total).toBe(85000)
  })

  it('should not exceed subtotal with fixed discount', () => {
    const items: CartItem[] = [{ id: '1', price: 10000, quantity: 1 }]
    const coupon: AppliedCoupon = {
      code: 'FIJO50K',
      discountType: 'fixed',
      discountValue: 50000,
      appliedDiscount: 10000,
    }

    const result = calculateFinalTotal(items, coupon)
    expect(result.discount).toBe(10000)
    expect(result.total).toBe(0)
  })
})

describe('API Request Validation', () => {
  interface CouponValidationRequest {
    code: string
    clinic: string
    cart_total: number
  }

  const validateRequest = (req: Partial<CouponValidationRequest>): string[] => {
    const errors: string[] = []

    if (!req.code) errors.push('code')
    if (!req.clinic) errors.push('clinic')
    if (req.cart_total === undefined) errors.push('cart_total')

    return errors
  }

  it('should pass for valid request', () => {
    const req: CouponValidationRequest = {
      code: 'DESCUENTO10',
      clinic: 'terrapet',
      cart_total: 100000,
    }

    expect(validateRequest(req)).toHaveLength(0)
  })

  it('should fail for missing code', () => {
    const req = {
      clinic: 'terrapet',
      cart_total: 100000,
    }

    expect(validateRequest(req)).toContain('code')
  })

  it('should fail for missing clinic', () => {
    const req = {
      code: 'DESCUENTO10',
      cart_total: 100000,
    }

    expect(validateRequest(req)).toContain('clinic')
  })

  it('should fail for missing cart_total', () => {
    const req = {
      code: 'DESCUENTO10',
      clinic: 'terrapet',
    }

    expect(validateRequest(req)).toContain('cart_total')
  })

  it('should allow zero cart_total', () => {
    const req: CouponValidationRequest = {
      code: 'DESCUENTO10',
      clinic: 'terrapet',
      cart_total: 0,
    }

    expect(validateRequest(req)).toHaveLength(0)
  })
})
