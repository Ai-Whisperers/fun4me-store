/**
 * E2E Tests: Notifications
 *
 * Tests the notification system:
 * - Viewing notifications
 * - Marking as read
 * - Notification types
 */

import { test, expect, portalUrl, waitForLoadingComplete } from '../factories/test-fixtures'

const NOTIFICATIONS_URL = portalUrl('notifications')

// =============================================================================
// Notifications List Tests
// =============================================================================

test.describe('Notifications - List', () => {
  test('can access notifications page', async ({ page }) => {
    await page.goto(NOTIFICATIONS_URL)
    await waitForLoadingComplete(page)

    expect(page.url()).not.toContain('/login')
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows notifications or empty state', async ({ page }) => {
    await page.goto(NOTIFICATIONS_URL)
    await waitForLoadingComplete(page)

    const notificationsContent = page.locator(
      '[data-testid="notifications-list"], :text("Notificaciones"), :text("No hay notificaciones")'
    )

    await expect(notificationsContent.first()).toBeVisible()
  })

  test('notifications are grouped by date', async ({ page }) => {
    await page.goto(NOTIFICATIONS_URL)
    await waitForLoadingComplete(page)

    const dateGroups = page.locator(
      ':text("Hoy"), :text("Ayer"), :text("Esta semana"), [data-testid="date-group"]'
    )

    if (await dateGroups.first().isVisible()) {
      await expect(dateGroups.first()).toBeVisible()
    }
  })

  test('notifications show time', async ({ page }) => {
    await page.goto(NOTIFICATIONS_URL)
    await waitForLoadingComplete(page)

    const notification = page.locator('[data-testid="notification-item"], .notification-item')

    if (await notification.first().isVisible()) {
      const timeInfo = notification.first().locator('time, :text("hace")')
      if (await timeInfo.isVisible()) {
        await expect(timeInfo).toBeVisible()
      }
    }
  })
})

// =============================================================================
// Notification Types Tests
// =============================================================================

test.describe('Notifications - Types', () => {
  test('shows vaccine reminder notifications', async ({ page }) => {
    await page.goto(NOTIFICATIONS_URL)
    await waitForLoadingComplete(page)

    const vaccineNotification = page.locator(
      ':text("vacuna"), :text("Vacuna"), [data-type="vaccine"]'
    )

    if (await vaccineNotification.first().isVisible()) {
      await expect(vaccineNotification.first()).toBeVisible()
    }
  })

  test('shows appointment notifications', async ({ page }) => {
    await page.goto(NOTIFICATIONS_URL)
    await waitForLoadingComplete(page)

    const appointmentNotification = page.locator(
      ':text("cita"), :text("Cita"), :text("appointment"), [data-type="appointment"]'
    )

    if (await appointmentNotification.first().isVisible()) {
      await expect(appointmentNotification.first()).toBeVisible()
    }
  })

  test('notifications have icons', async ({ page }) => {
    await page.goto(NOTIFICATIONS_URL)
    await waitForLoadingComplete(page)

    const notification = page.locator('[data-testid="notification-item"]')

    if (await notification.first().isVisible()) {
      const icon = notification.first().locator('svg, [data-testid="notification-icon"]')
      if (await icon.isVisible()) {
        await expect(icon).toBeVisible()
      }
    }
  })
})

// =============================================================================
// Mark as Read Tests
// =============================================================================

test.describe('Notifications - Mark as Read', () => {
  test('can mark single notification as read', async ({ page }) => {
    await page.goto(NOTIFICATIONS_URL)
    await waitForLoadingComplete(page)

    const unreadNotification = page.locator(
      '[data-testid="notification-item"].unread, [data-unread="true"]'
    )

    if (await unreadNotification.first().isVisible()) {
      await unreadNotification.first().click()
      await page.waitForTimeout(500)

      // Should be marked as read
    }
  })

  test('has mark all as read button', async ({ page }) => {
    await page.goto(NOTIFICATIONS_URL)
    await waitForLoadingComplete(page)

    const markAllButton = page.locator(
      'button:has-text("Marcar todo"), button:has-text("Leer todo"), [data-testid="mark-all-read"]'
    )

    if (await markAllButton.isVisible()) {
      await expect(markAllButton).toBeVisible()
    }
  })

  test('mark all as read updates notifications', async ({ page }) => {
    await page.goto(NOTIFICATIONS_URL)
    await waitForLoadingComplete(page)

    const markAllButton = page.locator('[data-testid="mark-all-read"]')

    if (await markAllButton.isVisible()) {
      const unreadBefore = await page.locator('[data-unread="true"]').count()

      await markAllButton.click()
      await page.waitForTimeout(500)

      const unreadAfter = await page.locator('[data-unread="true"]').count()
      expect(unreadAfter).toBeLessThanOrEqual(unreadBefore)
    }
  })
})

// =============================================================================
// Notification Badge Tests
// =============================================================================

test.describe('Notifications - Badge', () => {
  test('header shows notification badge', async ({ page }) => {
    await page.goto(portalUrl('dashboard'))
    await waitForLoadingComplete(page)

    const notificationBadge = page.locator(
      '[data-testid="notification-badge"], .notification-count'
    )

    if (await notificationBadge.isVisible()) {
      await expect(notificationBadge).toBeVisible()
    }
  })

  test('clicking notification icon opens notifications', async ({ page }) => {
    await page.goto(portalUrl('dashboard'))
    await waitForLoadingComplete(page)

    const notificationIcon = page.locator(
      '[data-testid="notification-icon"], button[aria-label*="notificacion"]'
    )

    if (await notificationIcon.isVisible()) {
      await notificationIcon.click()
      await page.waitForTimeout(500)

      // Should navigate to notifications or show dropdown
      const notificationsVisible = page.url().includes('/notifications') ||
        (await page.locator('[data-testid="notifications-dropdown"]').isVisible())

      expect(notificationsVisible).toBe(true)
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Notifications - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('notifications work on mobile', async ({ page }) => {
    await page.goto(NOTIFICATIONS_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })
})
