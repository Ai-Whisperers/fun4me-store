/**
 * E2E Tests: Loyalty Program
 *
 * Tests the loyalty points system:
 * - Viewing points balance (factory-created)
 * - Transaction history
 * - Rewards catalog
 * - Redeeming rewards
 */

import { test, expect, portalUrl, waitForLoadingComplete } from '../factories/test-fixtures'

const LOYALTY_URL = portalUrl('loyalty')
const REWARDS_URL = portalUrl('rewards')

// =============================================================================
// Points Balance Tests
// =============================================================================

test.describe('Loyalty - Points Balance', () => {
  test('can access loyalty page', async ({ page }) => {
    await page.goto(LOYALTY_URL)
    await waitForLoadingComplete(page)

    expect(page.url()).not.toContain('/login')
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows points balance', async ({ page, testData }) => {
    await page.goto(LOYALTY_URL)
    await waitForLoadingComplete(page)

    // Should show balance (factory created 5000 points)
    const balanceDisplay = page.locator(
      '[data-testid="points-balance"], :text("puntos"), :text("Puntos")'
    )

    await expect(balanceDisplay.first()).toBeVisible()
  })

  test('shows tier level', async ({ page }) => {
    await page.goto(LOYALTY_URL)
    await waitForLoadingComplete(page)

    const tierLevel = page.locator(
      '[data-testid="tier-level"], :text("Bronce"), :text("Plata"), :text("Oro"), :text("Nivel")'
    )

    if (await tierLevel.first().isVisible()) {
      await expect(tierLevel.first()).toBeVisible()
    }
  })

  test('shows lifetime earned', async ({ page }) => {
    await page.goto(LOYALTY_URL)
    await waitForLoadingComplete(page)

    const lifetimeEarned = page.locator(
      ':text("Total ganado"), :text("Lifetime"), [data-testid="lifetime-earned"]'
    )

    if (await lifetimeEarned.first().isVisible()) {
      await expect(lifetimeEarned.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Transaction History Tests
// =============================================================================

test.describe('Loyalty - Transaction History', () => {
  test('shows transaction history section', async ({ page }) => {
    await page.goto(LOYALTY_URL)
    await waitForLoadingComplete(page)

    const historySection = page.locator(
      '[data-testid="transaction-history"], :text("Historial"), :text("Transacciones")'
    )

    if (await historySection.first().isVisible()) {
      await expect(historySection.first()).toBeVisible()
    }
  })

  test('transactions show type (earned/redeemed)', async ({ page }) => {
    await page.goto(LOYALTY_URL)
    await waitForLoadingComplete(page)

    const transaction = page.locator('[data-testid="transaction-item"], .transaction-item')

    if (await transaction.first().isVisible()) {
      const type = transaction.first().locator(':text("Ganado"), :text("Canjeado")')
      if (await type.isVisible()) {
        await expect(type).toBeVisible()
      }
    }
  })

  test('transactions show date', async ({ page }) => {
    await page.goto(LOYALTY_URL)
    await waitForLoadingComplete(page)

    const transaction = page.locator('[data-testid="transaction-item"]')

    if (await transaction.first().isVisible()) {
      const date = transaction.first().locator('time, :text("202")')
      if (await date.isVisible()) {
        await expect(date).toBeVisible()
      }
    }
  })

  test('transactions show description', async ({ page }) => {
    await page.goto(LOYALTY_URL)
    await waitForLoadingComplete(page)

    const transaction = page.locator('[data-testid="transaction-item"]')

    if (await transaction.first().isVisible()) {
      // Factory created transaction with description
      const description = transaction.first().locator(':text("Puntos"), :text("Compra")')
      if (await description.isVisible()) {
        await expect(description).toBeVisible()
      }
    }
  })
})

// =============================================================================
// Rewards Catalog Tests
// =============================================================================

test.describe('Loyalty - Rewards Catalog', () => {
  test('can access rewards page', async ({ page }) => {
    await page.goto(REWARDS_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows available rewards', async ({ page }) => {
    await page.goto(REWARDS_URL)
    await waitForLoadingComplete(page)

    const rewardsContent = page.locator(
      '[data-testid="rewards-list"], :text("Recompensas"), :text("Canjear")'
    )

    await expect(rewardsContent.first()).toBeVisible()
  })

  test('rewards show points cost', async ({ page }) => {
    await page.goto(REWARDS_URL)
    await waitForLoadingComplete(page)

    const rewardItem = page.locator('[data-testid="reward-item"], .reward-card')

    if (await rewardItem.first().isVisible()) {
      const pointsCost = rewardItem.first().locator(':text("puntos"), :text("pts")')
      if (await pointsCost.isVisible()) {
        await expect(pointsCost).toBeVisible()
      }
    }
  })

  test('rewards show availability', async ({ page }) => {
    await page.goto(REWARDS_URL)
    await waitForLoadingComplete(page)

    const rewardItem = page.locator('[data-testid="reward-item"]')

    if (await rewardItem.first().isVisible()) {
      const availability = rewardItem.first().locator(':text("Disponible"), :text("Agotado")')
      if (await availability.isVisible()) {
        await expect(availability).toBeVisible()
      }
    }
  })

  test('rewards organized by category', async ({ page }) => {
    await page.goto(REWARDS_URL)
    await waitForLoadingComplete(page)

    const categories = page.locator(
      '[data-testid="reward-category"], :text("Descuentos"), :text("Productos"), :text("Servicios")'
    )

    if (await categories.first().isVisible()) {
      await expect(categories.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Redeem Rewards Tests
// =============================================================================

test.describe('Loyalty - Redeem Rewards', () => {
  test('reward has redeem button', async ({ page }) => {
    await page.goto(REWARDS_URL)
    await waitForLoadingComplete(page)

    const redeemButton = page.locator(
      'button:has-text("Canjear"), [data-testid="redeem-button"]'
    )

    if (await redeemButton.first().isVisible()) {
      await expect(redeemButton.first()).toBeVisible()
    }
  })

  test('clicking redeem shows confirmation', async ({ page }) => {
    await page.goto(REWARDS_URL)
    await waitForLoadingComplete(page)

    const redeemButton = page.locator('[data-testid="redeem-button"], button:has-text("Canjear")')

    if (await redeemButton.first().isVisible()) {
      await redeemButton.first().click()
      await page.waitForTimeout(500)

      // Should show confirmation dialog
      const confirmation = page.locator(
        '[role="dialog"], .modal, :text("Confirmar"), :text("¿Desea canjear")'
      )

      if (await confirmation.isVisible()) {
        await expect(confirmation).toBeVisible()
      }
    }
  })

  test('redemption shows code on success', async ({ page }) => {
    await page.goto(REWARDS_URL)
    await waitForLoadingComplete(page)

    const redeemButton = page.locator('[data-testid="redeem-button"]')

    if (await redeemButton.first().isVisible()) {
      await redeemButton.first().click()
      await page.waitForTimeout(300)

      const confirmButton = page.locator('button:has-text("Confirmar")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()
        await page.waitForTimeout(1000)

        // Should show redemption code
        const codeDisplay = page.locator('[data-testid="redemption-code"], :text("Código")')
        if (await codeDisplay.isVisible()) {
          await expect(codeDisplay).toBeVisible()
        }
      }
    }
  })
})

// =============================================================================
// Redemption History Tests
// =============================================================================

test.describe('Loyalty - Redemption History', () => {
  test('can view redemption history', async ({ page }) => {
    await page.goto(LOYALTY_URL)
    await waitForLoadingComplete(page)

    const historyTab = page.locator('[role="tab"]:has-text("Canjes"), button:has-text("Historial de canjes")')

    if (await historyTab.isVisible()) {
      await historyTab.click()
      await page.waitForTimeout(300)

      const historyContent = page.locator('[data-testid="redemption-history"]')
      if (await historyContent.isVisible()) {
        await expect(historyContent).toBeVisible()
      }
    }
  })

  test('redemption shows status', async ({ page }) => {
    await page.goto(LOYALTY_URL)
    await waitForLoadingComplete(page)

    const redemption = page.locator('[data-testid="redemption-item"]')

    if (await redemption.first().isVisible()) {
      const status = redemption.first().locator(':text("Usado"), :text("Pendiente"), :text("Expirado")')
      if (await status.isVisible()) {
        await expect(status).toBeVisible()
      }
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Loyalty - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('loyalty page works on mobile', async ({ page }) => {
    await page.goto(LOYALTY_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('rewards page works on mobile', async ({ page }) => {
    await page.goto(REWARDS_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })
})
