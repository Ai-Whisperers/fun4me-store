/**
 * AI-Powered Grace Period Algorithm
 *
 * Analyzes clinic metrics to recommend flexible grace periods (30-90 days)
 * for overdue invoices based on:
 * - Payment history (past behavior)
 * - Revenue and financial health
 * - Platform engagement
 * - Account longevity and trust
 * - External economic factors
 *
 * @version v1.0
 */

/**
 * Input metrics collected from tenant data
 */
export interface GraceMetrics {
  // Revenue indicators
  monthlyRevenue: number // Clinic's invoiced revenue (PYG)
  revenueGrowthRate: number // Month-over-month % change (-1 to +1)
  averageOrderValue: number // Average transaction size

  // Activity indicators
  activeClients: number // Unique clients with activity last 30d
  appointmentsLast30d: number
  storeOrdersLast30d: number

  // Account health
  accountAgeDays: number // Days since signup
  paymentHistoryScore: number // 0-1, % of on-time payments
  totalPaidInvoices: number // Number of successfully paid invoices
  totalOverdueInstances: number // Number of times payment was late
  outstandingBalance: number // Current unpaid amount

  // Contextual factors
  seasonalityFactor: number // 0.5-1.5 based on vet industry patterns
  economicIndex: number // Paraguay economic indicator (0.5-1.5)

  // Subscription tier (affects weighting)
  tier: 'gratis' | 'profesional'
}

/**
 * Output of grace period evaluation
 */
export interface GraceEvaluation {
  recommendedGraceDays: 30 | 60 | 90
  scores: {
    paymentHistory: number
    revenue: number
    activity: number
    accountAge: number
    economic: number
  }
  totalScore: number
  confidence: number // 0-1 confidence in the recommendation
  reasoning: string // Human-readable explanation
  riskLevel: 'low' | 'medium' | 'high'
  modelVersion: string
}

/**
 * Scoring weights for each factor
 */
const WEIGHTS = {
  paymentHistory: 0.30, // Past behavior is the best predictor
  revenue: 0.25, // Ability to pay
  activity: 0.20, // Engagement with platform
  accountAge: 0.15, // Trust built over time
  economic: 0.10, // External factors
}

/**
 * Tier multipliers - higher tiers get more favorable treatment
 */
const TIER_MULTIPLIERS: Record<string, number> = {
  gratis: 1.0,
  profesional: 1.15,
}

/**
 * Paraguay vet industry seasonality by month
 * Based on typical patterns: December-February higher (holidays), July-August lower
 */
const MONTHLY_SEASONALITY: Record<number, number> = {
  1: 1.1, // January - post-holiday
  2: 1.0, // February
  3: 0.95, // March
  4: 0.9, // April
  5: 0.85, // May
  6: 0.8, // June - low season
  7: 0.75, // July - lowest
  8: 0.8, // August
  9: 0.9, // September - recovery
  10: 0.95, // October
  11: 1.0, // November
  12: 1.2, // December - peak season
}

/**
 * Calculate the current month's seasonality factor
 */
export function getCurrentSeasonality(): number {
  const month = new Date().getMonth() + 1
  return MONTHLY_SEASONALITY[month] || 1.0
}

/**
 * Calculate grace period recommendation based on tenant metrics
 */
export function calculateGracePeriod(metrics: GraceMetrics): GraceEvaluation {
  // Calculate individual scores (0-1)
  const scores = {
    paymentHistory: scorePaymentHistory(metrics),
    revenue: scoreRevenue(metrics),
    activity: scoreActivity(metrics),
    accountAge: scoreAccountAge(metrics),
    economic: scoreEconomicFactors(metrics),
  }

  // Calculate weighted total
  let totalScore =
    scores.paymentHistory * WEIGHTS.paymentHistory +
    scores.revenue * WEIGHTS.revenue +
    scores.activity * WEIGHTS.activity +
    scores.accountAge * WEIGHTS.accountAge +
    scores.economic * WEIGHTS.economic

  // Apply tier multiplier
  const tierMultiplier = TIER_MULTIPLIERS[metrics.tier] || 1.0
  totalScore = Math.min(totalScore * tierMultiplier, 1.0)

  // Determine grace period
  const recommendedGraceDays = mapScoreToGraceDays(totalScore)

  // Calculate confidence based on data completeness
  const confidence = calculateConfidence(metrics)

  // Determine risk level
  const riskLevel = totalScore >= 0.6 ? 'low' : totalScore >= 0.35 ? 'medium' : 'high'

  // Generate reasoning
  const reasoning = generateReasoning(scores, totalScore, metrics, recommendedGraceDays)

  return {
    recommendedGraceDays,
    scores,
    totalScore: Math.round(totalScore * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
    riskLevel,
    modelVersion: 'v1.0',
  }
}

/**
 * Score payment history (0-1)
 */
function scorePaymentHistory(metrics: GraceMetrics): number {
  // Base score from on-time payment percentage
  let score = metrics.paymentHistoryScore

  // Boost for having paid invoices at all
  if (metrics.totalPaidInvoices > 0) {
    const successRatio =
      metrics.totalPaidInvoices / (metrics.totalPaidInvoices + metrics.totalOverdueInstances)
    score = score * 0.7 + successRatio * 0.3
  }

  // Penalty for large outstanding balance relative to monthly revenue
  if (metrics.monthlyRevenue > 0 && metrics.outstandingBalance > 0) {
    const balanceRatio = metrics.outstandingBalance / metrics.monthlyRevenue
    if (balanceRatio > 0.5) {
      score *= 0.8 // Significant penalty
    } else if (balanceRatio > 0.25) {
      score *= 0.9 // Minor penalty
    }
  }

  return Math.max(0, Math.min(1, score))
}

/**
 * Score revenue/financial health (0-1)
 */
function scoreRevenue(metrics: GraceMetrics): number {
  // Normalize revenue (assuming 5M-50M PYG monthly is healthy range)
  const revenueScore = normalizeValue(metrics.monthlyRevenue, 5_000_000, 50_000_000)

  // Factor in growth rate
  const growthScore = (metrics.revenueGrowthRate + 1) / 2 // Convert -1,1 to 0,1
  const clampedGrowth = Math.max(0, Math.min(1, growthScore))

  // Average order value indicates business health
  const aovScore = normalizeValue(metrics.averageOrderValue, 50_000, 500_000)

  return revenueScore * 0.5 + clampedGrowth * 0.3 + aovScore * 0.2
}

/**
 * Score platform activity/engagement (0-1)
 */
function scoreActivity(metrics: GraceMetrics): number {
  // Active clients (assuming 10-100 is healthy range)
  const clientScore = normalizeValue(metrics.activeClients, 10, 100)

  // Appointments (assuming 20-200 per month is healthy)
  const appointmentScore = normalizeValue(metrics.appointmentsLast30d, 20, 200)

  // Store orders (assuming 5-50 per month is healthy)
  const orderScore = normalizeValue(metrics.storeOrdersLast30d, 5, 50)

  return clientScore * 0.4 + appointmentScore * 0.4 + orderScore * 0.2
}

/**
 * Score account age/trust (0-1)
 */
function scoreAccountAge(metrics: GraceMetrics): number {
  // Age score - max out at 2 years (730 days)
  const ageScore = Math.min(metrics.accountAgeDays / 730, 1)

  // Boost for longer accounts with good history
  if (metrics.accountAgeDays > 365 && metrics.paymentHistoryScore > 0.8) {
    return Math.min(ageScore * 1.2, 1)
  }

  return ageScore
}

/**
 * Score economic/external factors (0-1)
 */
function scoreEconomicFactors(metrics: GraceMetrics): number {
  // Combine seasonality and economic index
  const seasonScore = metrics.seasonalityFactor / 1.5 // Normalize to 0-1 range
  const economicScore = metrics.economicIndex / 1.5

  return seasonScore * 0.5 + economicScore * 0.5
}

/**
 * Map total score to grace period days
 */
function mapScoreToGraceDays(score: number): 30 | 60 | 90 {
  if (score >= 0.7) return 90 // High trust - 3 months
  if (score >= 0.4) return 60 // Medium trust - 2 months
  return 30 // Low trust or new - 1 month
}

/**
 * Calculate confidence based on data completeness
 */
function calculateConfidence(metrics: GraceMetrics): number {
  let confidence = 0.5 // Base confidence

  // More data = higher confidence
  if (metrics.totalPaidInvoices > 0) confidence += 0.1
  if (metrics.totalPaidInvoices > 5) confidence += 0.1
  if (metrics.accountAgeDays > 90) confidence += 0.1
  if (metrics.accountAgeDays > 365) confidence += 0.1
  if (metrics.appointmentsLast30d > 0) confidence += 0.05
  if (metrics.activeClients > 0) confidence += 0.05

  return Math.min(confidence, 1)
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(
  scores: GraceEvaluation['scores'],
  totalScore: number,
  metrics: GraceMetrics,
  graceDays: number
): string {
  const parts: string[] = []

  // Payment history assessment
  if (scores.paymentHistory >= 0.8) {
    parts.push('Excelente historial de pagos')
  } else if (scores.paymentHistory >= 0.5) {
    parts.push('Historial de pagos aceptable')
  } else {
    parts.push('Historial de pagos limitado o con retrasos')
  }

  // Revenue assessment
  if (scores.revenue >= 0.7) {
    parts.push('buena salud financiera')
  } else if (scores.revenue >= 0.4) {
    parts.push('ingresos moderados')
  } else {
    parts.push('ingresos en desarrollo')
  }

  // Activity assessment
  if (scores.activity >= 0.6) {
    parts.push('alta actividad en la plataforma')
  } else if (scores.activity >= 0.3) {
    parts.push('actividad regular')
  } else {
    parts.push('actividad baja')
  }

  // Account age
  if (metrics.accountAgeDays > 365) {
    parts.push('cliente establecido')
  } else if (metrics.accountAgeDays > 180) {
    parts.push('relacion en crecimiento')
  } else {
    parts.push('cuenta reciente')
  }

  // Build reasoning
  const reasoningBase = parts.join(', ')
  const conclusion = totalScore >= 0.6
    ? `Se recomienda periodo de gracia extendido de ${graceDays} dias.`
    : `Se recomienda periodo de gracia estandar de ${graceDays} dias.`

  return `${reasoningBase}. ${conclusion}`
}

/**
 * Normalize a value to 0-1 range
 */
function normalizeValue(value: number, min: number, max: number): number {
  if (value <= min) return 0
  if (value >= max) return 1
  return (value - min) / (max - min)
}

/**
 * Collect metrics for a tenant from the database
 */
export async function collectTenantMetrics(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient> extends Promise<infer T> ? T : never,
  tenantId: string
): Promise<GraceMetrics> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString()

  // Get tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('subscription_tier, created_at')
    .eq('id', tenantId)
    .single()

  // Calculate account age
  const accountAgeDays = tenant?.created_at
    ? Math.floor((now.getTime() - new Date(tenant.created_at).getTime()) / (24 * 60 * 60 * 1000))
    : 0

  // Get revenue from invoices (client invoices, not platform invoices)
  const { data: revenueData } = await supabase
    .from('invoices')
    .select('total, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'paid')
    .gte('created_at', thirtyDaysAgoStr)

  const monthlyRevenue = revenueData?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0
  const averageOrderValue = revenueData && revenueData.length > 0
    ? monthlyRevenue / revenueData.length
    : 0

  // Get previous month revenue for growth calculation
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const { data: prevRevenueData } = await supabase
    .from('invoices')
    .select('total')
    .eq('tenant_id', tenantId)
    .eq('status', 'paid')
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgoStr)

  const prevMonthRevenue = prevRevenueData?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0
  const revenueGrowthRate = prevMonthRevenue > 0
    ? (monthlyRevenue - prevMonthRevenue) / prevMonthRevenue
    : 0

  // Get active clients
  const { count: activeClients } = await supabase
    .from('appointments')
    .select('client_id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgoStr)

  // Get appointments last 30 days
  const { count: appointmentsLast30d } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('start_time', thirtyDaysAgoStr)

  // Get store orders last 30 days
  const { count: storeOrdersLast30d } = await supabase
    .from('store_orders')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgoStr)

  // Get platform invoice payment history
  const { data: platformInvoices } = await supabase
    .from('platform_invoices')
    .select('status, paid_at, due_date')
    .eq('tenant_id', tenantId)

  const totalPaidInvoices = platformInvoices?.filter(i => i.status === 'paid').length || 0
  const totalOverdueInstances = platformInvoices?.filter(i => {
    if (i.status === 'paid' && i.paid_at && i.due_date) {
      return new Date(i.paid_at) > new Date(i.due_date)
    }
    return i.status === 'overdue'
  }).length || 0

  const paymentHistoryScore = totalPaidInvoices > 0
    ? (totalPaidInvoices - totalOverdueInstances) / totalPaidInvoices
    : 0.5 // Neutral for new accounts

  // Get outstanding balance
  const { data: unpaidInvoices } = await supabase
    .from('platform_invoices')
    .select('total')
    .eq('tenant_id', tenantId)
    .in('status', ['sent', 'overdue'])

  const outstandingBalance = unpaidInvoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0

  return {
    monthlyRevenue,
    revenueGrowthRate,
    averageOrderValue,
    activeClients: activeClients || 0,
    appointmentsLast30d: appointmentsLast30d || 0,
    storeOrdersLast30d: storeOrdersLast30d || 0,
    accountAgeDays,
    paymentHistoryScore: Math.max(0, Math.min(1, paymentHistoryScore)),
    totalPaidInvoices,
    totalOverdueInstances,
    outstandingBalance,
    seasonalityFactor: getCurrentSeasonality(),
    economicIndex: 1.0, // Default; could integrate external API
    tier: (tenant?.subscription_tier as GraceMetrics['tier']) || 'gratis',
  }
}
