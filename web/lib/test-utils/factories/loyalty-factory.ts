/**
 * Loyalty Factory - Builder pattern for loyalty points and transactions
 */

import { apiClient } from '../api-client'
import { testContext } from '../context'
import { generateId, randomPastDate } from './base'

interface LoyaltyPointsData {
  id: string
  client_id: string
  tenant_id: string
  balance: number
  lifetime_earned: number
  lifetime_redeemed: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
}

interface LoyaltyTransactionData {
  id: string
  tenant_id: string
  client_id: string
  points: number
  type: 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus'
  description: string
  invoice_id: string | null
  order_id: string | null
  balance_after: number
  expires_at: string | null
}

// Loyalty rules based on questionnaire answers:
// - 10 points per Gs spent
// - 5 bonus points for appointments
// - 5 bonus points for referrals
// - Tiers: Bronze (0-499), Silver (500-1999), Gold (2000-4999), Platinum (5000+)
const POINTS_PER_GS = 0.01 // 10 points per 1000 Gs = 0.01 per Gs
const APPOINTMENT_BONUS = 5
const REFERRAL_BONUS = 5

const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
}

function calculateTier(lifetimeEarned: number): LoyaltyPointsData['tier'] {
  if (lifetimeEarned >= TIER_THRESHOLDS.platinum) return 'platinum'
  if (lifetimeEarned >= TIER_THRESHOLDS.gold) return 'gold'
  if (lifetimeEarned >= TIER_THRESHOLDS.silver) return 'silver'
  return 'bronze'
}

export class LoyaltyFactory {
  private clientId: string = ''
  private tenantId: string = 'terrapet'
  private transactions: Array<{
    points: number
    type: LoyaltyTransactionData['type']
    description: string
    invoiceId?: string
    orderId?: string
    date?: Date
  }> = []
  private shouldPersist: boolean = true

  private constructor() {}

  /**
   * Start building loyalty data for a client
   */
  static forUser(clientId: string): LoyaltyFactory {
    const factory = new LoyaltyFactory()
    factory.clientId = clientId
    return factory
  }

  /**
   * Set tenant ID
   */
  forTenant(tenantId: string): LoyaltyFactory {
    this.tenantId = tenantId
    return this
  }

  /**
   * Add points for a purchase
   */
  earnFromPurchase(amount: number, invoiceId?: string): LoyaltyFactory {
    const points = Math.floor(amount * POINTS_PER_GS)
    if (points > 0) {
      this.transactions.push({
        points,
        type: 'earn',
        description: `Puntos por compra de ${amount.toLocaleString()} Gs`,
        invoiceId,
        date: randomPastDate(3),
      })
    }
    return this
  }

  /**
   * Add bonus points for appointment
   */
  earnFromAppointment(_appointmentId?: string): LoyaltyFactory {
    this.transactions.push({
      points: APPOINTMENT_BONUS,
      type: 'bonus',
      description: 'Bonus por cita completada',
      date: randomPastDate(3),
    })
    return this
  }

  /**
   * Add bonus points for referral
   */
  earnFromReferral(): LoyaltyFactory {
    this.transactions.push({
      points: REFERRAL_BONUS,
      type: 'bonus',
      description: 'Bonus por referir un amigo',
      date: randomPastDate(3),
    })
    return this
  }

  /**
   * Add custom earn transaction
   */
  earn(points: number, description: string): LoyaltyFactory {
    this.transactions.push({
      points,
      type: 'earn',
      description,
      date: randomPastDate(3),
    })
    return this
  }

  /**
   * Add redemption transaction
   */
  redeem(points: number, description?: string): LoyaltyFactory {
    this.transactions.push({
      points: -points,
      type: 'redeem',
      description: description || `Canje de ${points} puntos`,
      date: randomPastDate(1),
    })
    return this
  }

  /**
   * Add adjustment transaction
   */
  adjust(points: number, description: string): LoyaltyFactory {
    this.transactions.push({
      points,
      type: 'adjust',
      description,
      date: new Date(),
    })
    return this
  }

  /**
   * Add expiration transaction
   */
  expire(points: number): LoyaltyFactory {
    this.transactions.push({
      points: -points,
      type: 'expire',
      description: `${points} puntos expirados`,
      date: new Date(),
    })
    return this
  }

  /**
   * Don't persist to database
   */
  inMemoryOnly(): LoyaltyFactory {
    this.shouldPersist = false
    return this
  }

  /**
   * Build and persist loyalty data
   */
  async build(): Promise<{ points: LoyaltyPointsData; transactions: LoyaltyTransactionData[] }> {
    if (!this.clientId) {
      throw new Error('Client ID is required. Use LoyaltyFactory.forUser(clientId)')
    }

    // Calculate totals
    let balance = 0
    let lifetimeEarned = 0
    let lifetimeRedeemed = 0

    for (const tx of this.transactions) {
      balance += tx.points
      if (tx.points > 0) {
        lifetimeEarned += tx.points
      } else {
        lifetimeRedeemed += Math.abs(tx.points)
      }
    }

    // Ensure balance is not negative
    balance = Math.max(0, balance)

    const tier = calculateTier(lifetimeEarned)

    const pointsData: LoyaltyPointsData = {
      id: generateId(),
      client_id: this.clientId,
      tenant_id: this.tenantId,
      balance,
      lifetime_earned: lifetimeEarned,
      lifetime_redeemed: lifetimeRedeemed,
      tier,
    }

    const transactionRecords: LoyaltyTransactionData[] = []

    if (!this.shouldPersist) {
      return { points: pointsData, transactions: transactionRecords }
    }

    // Check if loyalty_points record exists
    const { data: existing } = await apiClient.dbSelect('loyalty_points', {
      eq: { client_id: this.clientId, tenant_id: this.tenantId },
      limit: 1,
    })

    if (existing && existing.length > 0) {
      // Update existing record
      const existingRecord = existing[0] as LoyaltyPointsData
      const newBalance = existingRecord.balance + balance
      const newLifetimeEarned = existingRecord.lifetime_earned + lifetimeEarned
      const newLifetimeRedeemed = existingRecord.lifetime_redeemed + lifetimeRedeemed
      const newTier = calculateTier(newLifetimeEarned)

      await apiClient.dbUpdate('loyalty_points', existingRecord.id, {
        balance: newBalance,
        lifetime_earned: newLifetimeEarned,
        lifetime_redeemed: newLifetimeRedeemed,
        tier: newTier,
      })

      pointsData.id = existingRecord.id
      pointsData.balance = newBalance
      pointsData.lifetime_earned = newLifetimeEarned
      pointsData.lifetime_redeemed = newLifetimeRedeemed
      pointsData.tier = newTier
    } else {
      // Create new record
      const { error } = await apiClient.dbInsert('loyalty_points', {
        id: pointsData.id,
        client_id: pointsData.client_id,
        tenant_id: pointsData.tenant_id,
        balance: pointsData.balance,
        lifetime_earned: pointsData.lifetime_earned,
        lifetime_redeemed: pointsData.lifetime_redeemed,
        tier: pointsData.tier,
      })

      if (error) {
        throw new Error(`Failed to create loyalty points: ${error}`)
      }

      testContext.track('loyalty_points', pointsData.id, this.tenantId)
    }

    // Create transaction records
    let runningBalance = 0
    for (const tx of this.transactions) {
      runningBalance += tx.points
      runningBalance = Math.max(0, runningBalance)

      const txData: LoyaltyTransactionData = {
        id: generateId(),
        tenant_id: this.tenantId,
        client_id: this.clientId,
        points: tx.points,
        type: tx.type,
        description: tx.description,
        invoice_id: tx.invoiceId || null,
        order_id: tx.orderId || null,
        balance_after: runningBalance,
        expires_at: tx.type === 'earn' ? this.getExpirationDate(tx.date || new Date()) : null,
      }

      const { error } = await apiClient.dbInsert(
        'loyalty_transactions',
        txData as unknown as Record<string, unknown>
      )
      if (error) {
        console.warn(`Failed to create loyalty transaction: ${error}`)
        continue
      }

      testContext.track('loyalty_transactions', txData.id, this.tenantId)
      transactionRecords.push(txData)
    }

    return { points: pointsData, transactions: transactionRecords }
  }

  /**
   * Calculate expiration date (points expire after 12 months)
   */
  private getExpirationDate(earnDate: Date): string {
    const expDate = new Date(earnDate)
    expDate.setMonth(expDate.getMonth() + 12)
    return expDate.toISOString()
  }
}

/**
 * Calculate and create loyalty points based on purchase history
 */
export async function createLoyaltyFromPurchases(
  clientId: string,
  purchases: Array<{ amount: number; invoiceId?: string }>,
  appointments: Array<{ id?: string }> = [],
  tenantId: string = 'terrapet'
): Promise<{ points: LoyaltyPointsData; transactions: LoyaltyTransactionData[] }> {
  const factory = LoyaltyFactory.forUser(clientId).forTenant(tenantId)

  // Add points from purchases
  for (const purchase of purchases) {
    factory.earnFromPurchase(purchase.amount, purchase.invoiceId)
  }

  // Add bonus points from appointments
  for (const appointment of appointments) {
    factory.earnFromAppointment(appointment.id)
  }

  return factory.build()
}

/**
 * Create loyalty data for different owner personas
 */
export async function createLoyaltyForPersona(
  clientId: string,
  persona: 'vip' | 'budget' | 'new' | 'loyal' | 'standard',
  tenantId: string = 'terrapet'
): Promise<{ points: LoyaltyPointsData; transactions: LoyaltyTransactionData[] }> {
  const factory = LoyaltyFactory.forUser(clientId).forTenant(tenantId)

  switch (persona) {
    case 'vip':
      // VIP client - lots of points, platinum tier
      for (let i = 0; i < 20; i++) {
        factory.earnFromPurchase(500000 + Math.random() * 500000)
        factory.earnFromAppointment()
      }
      factory.earnFromReferral()
      factory.earnFromReferral()
      factory.earnFromReferral()
      break

    case 'loyal':
      // Long-term client - gold tier
      for (let i = 0; i < 15; i++) {
        factory.earnFromPurchase(200000 + Math.random() * 300000)
        factory.earnFromAppointment()
      }
      factory.earnFromReferral()
      break

    case 'budget':
      // Budget client - minimal points, bronze tier
      for (let i = 0; i < 3; i++) {
        factory.earnFromPurchase(80000 + Math.random() * 50000)
      }
      break

    case 'new':
      // New client - very few points
      factory.earnFromPurchase(150000)
      factory.earnFromAppointment()
      break

    default:
      // Standard client - silver tier
      for (let i = 0; i < 8; i++) {
        factory.earnFromPurchase(150000 + Math.random() * 200000)
        factory.earnFromAppointment()
      }
  }

  return factory.build()
}
