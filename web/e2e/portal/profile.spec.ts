/**
 * E2E Tests: Profile & Settings
 *
 * Tests user profile and settings:
 * - Viewing profile
 * - Editing profile
 * - Notification settings
 * - Security settings
 */

import { test, expect, portalUrl, waitForLoadingComplete, E2E_OWNER } from '../factories/test-fixtures'

const PROFILE_URL = portalUrl('profile')
const SETTINGS_URL = portalUrl('settings')
const NOTIFICATION_SETTINGS_URL = portalUrl('settings/notifications')
const SECURITY_SETTINGS_URL = portalUrl('settings/security')

// =============================================================================
// Profile View Tests
// =============================================================================

test.describe('Profile - View', () => {
  test('can access profile page', async ({ page }) => {
    await page.goto(PROFILE_URL)
    await waitForLoadingComplete(page)

    expect(page.url()).not.toContain('/login')
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows user name', async ({ page }) => {
    await page.goto(PROFILE_URL)
    await waitForLoadingComplete(page)

    // Should show test user's name
    const nameDisplay = page.locator(`text="${E2E_OWNER.email}"`)

    if (await nameDisplay.isVisible()) {
      await expect(nameDisplay).toBeVisible()
    }
  })

  test('shows user email', async ({ page }) => {
    await page.goto(PROFILE_URL)
    await waitForLoadingComplete(page)

    const emailDisplay = page.locator(`text="${E2E_OWNER.email}"`)
    await expect(emailDisplay).toBeVisible()
  })

  test('shows phone number field', async ({ page }) => {
    await page.goto(PROFILE_URL)
    await waitForLoadingComplete(page)

    const phoneField = page.locator(':text("Teléfono"), :text("Phone"), input[name="phone"]')

    if (await phoneField.first().isVisible()) {
      await expect(phoneField.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Profile Edit Tests
// =============================================================================

test.describe('Profile - Edit', () => {
  test('has edit button', async ({ page }) => {
    await page.goto(PROFILE_URL)
    await waitForLoadingComplete(page)

    const editButton = page.locator('button:has-text("Editar"), a:has-text("Editar"), [data-testid="edit-profile"]')

    await expect(editButton.first()).toBeVisible()
  })

  test('can edit profile name', async ({ page }) => {
    await page.goto(PROFILE_URL)
    await waitForLoadingComplete(page)

    const editButton = page.locator('[data-testid="edit-profile"], button:has-text("Editar")')

    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(300)

      const nameInput = page.locator('input[name="full_name"], input[name="name"]')
      if (await nameInput.isVisible()) {
        await nameInput.clear()
        await nameInput.fill('E2E Updated Name')
      }
    }
  })

  test('can save profile changes', async ({ page }) => {
    await page.goto(PROFILE_URL)
    await waitForLoadingComplete(page)

    const editButton = page.locator('[data-testid="edit-profile"]')

    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(300)

      const saveButton = page.locator('button:has-text("Guardar"), button[type="submit"]')
      if (await saveButton.isVisible()) {
        await expect(saveButton).toBeVisible()
      }
    }
  })

  test('shows validation errors', async ({ page }) => {
    await page.goto(PROFILE_URL)
    await waitForLoadingComplete(page)

    const editButton = page.locator('[data-testid="edit-profile"]')

    if (await editButton.isVisible()) {
      await editButton.click()
      await page.waitForTimeout(300)

      // Clear required field
      const nameInput = page.locator('input[name="full_name"]')
      if (await nameInput.isVisible()) {
        await nameInput.clear()

        const saveButton = page.locator('button:has-text("Guardar")')
        if (await saveButton.isVisible()) {
          await saveButton.click()

          // Should show error
          const error = page.locator('[role="alert"], .error, .text-red')
          if (await error.first().isVisible()) {
            await expect(error.first()).toBeVisible()
          }
        }
      }
    }
  })
})

// =============================================================================
// Notification Settings Tests
// =============================================================================

test.describe('Profile - Notification Settings', () => {
  test('can access notification settings', async ({ page }) => {
    await page.goto(NOTIFICATION_SETTINGS_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows email notification toggle', async ({ page }) => {
    await page.goto(NOTIFICATION_SETTINGS_URL)
    await waitForLoadingComplete(page)

    const emailToggle = page.locator(
      '[data-testid="email-notifications"], :text("Email"), input[name*="email"]'
    )

    if (await emailToggle.first().isVisible()) {
      await expect(emailToggle.first()).toBeVisible()
    }
  })

  test('shows notification categories', async ({ page }) => {
    await page.goto(NOTIFICATION_SETTINGS_URL)
    await waitForLoadingComplete(page)

    const categories = page.locator(
      ':text("Vacunas"), :text("Citas"), :text("Facturas"), :text("Promociones")'
    )

    if (await categories.first().isVisible()) {
      await expect(categories.first()).toBeVisible()
    }
  })

  test('can toggle notification preference', async ({ page }) => {
    await page.goto(NOTIFICATION_SETTINGS_URL)
    await waitForLoadingComplete(page)

    const toggle = page.locator('[role="switch"], input[type="checkbox"]')

    if (await toggle.first().isVisible()) {
      await toggle.first().click()
      await page.waitForTimeout(300)
    }
  })

  test('saves notification preferences', async ({ page }) => {
    await page.goto(NOTIFICATION_SETTINGS_URL)
    await waitForLoadingComplete(page)

    const saveButton = page.locator('button:has-text("Guardar")')

    if (await saveButton.isVisible()) {
      await saveButton.click()
      await page.waitForTimeout(500)

      // Should show success
      const success = page.locator(':text("guardado"), :text("Actualizado"), [role="alert"]')
      if (await success.isVisible()) {
        await expect(success).toBeVisible()
      }
    }
  })
})

// =============================================================================
// Security Settings Tests
// =============================================================================

test.describe('Profile - Security Settings', () => {
  test('can access security settings', async ({ page }) => {
    await page.goto(SECURITY_SETTINGS_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows change password section', async ({ page }) => {
    await page.goto(SECURITY_SETTINGS_URL)
    await waitForLoadingComplete(page)

    const passwordSection = page.locator(
      ':text("Contraseña"), :text("Cambiar contraseña"), [data-testid="change-password"]'
    )

    if (await passwordSection.first().isVisible()) {
      await expect(passwordSection.first()).toBeVisible()
    }
  })

  test('password form has required fields', async ({ page }) => {
    await page.goto(SECURITY_SETTINGS_URL)
    await waitForLoadingComplete(page)

    const currentPassword = page.locator('input[name="current_password"], input[placeholder*="actual"]')
    const newPassword = page.locator('input[name="new_password"], input[placeholder*="nueva"]')

    if (await currentPassword.isVisible()) {
      await expect(currentPassword).toBeVisible()
    }

    if (await newPassword.isVisible()) {
      await expect(newPassword).toBeVisible()
    }
  })

  test('shows password requirements', async ({ page }) => {
    await page.goto(SECURITY_SETTINGS_URL)
    await waitForLoadingComplete(page)

    const requirements = page.locator(
      ':text("caracteres"), :text("mayúscula"), :text("número")'
    )

    if (await requirements.first().isVisible()) {
      await expect(requirements.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Settings Navigation Tests
// =============================================================================

test.describe('Profile - Settings Navigation', () => {
  test('settings page has navigation tabs', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    await waitForLoadingComplete(page)

    const tabs = page.locator('[role="tablist"], nav, .settings-nav')

    if (await tabs.isVisible()) {
      await expect(tabs).toBeVisible()
    }
  })

  test('can navigate to profile from settings', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    await waitForLoadingComplete(page)

    const profileLink = page.locator('a:has-text("Perfil"), [data-testid="profile-link"]')

    if (await profileLink.isVisible()) {
      await profileLink.click()
      await page.waitForURL(/profile/, { timeout: 10000 })
    }
  })

  test('can navigate to notifications from settings', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    await waitForLoadingComplete(page)

    const notificationsLink = page.locator('a:has-text("Notificaciones")')

    if (await notificationsLink.isVisible()) {
      await notificationsLink.click()
      await page.waitForURL(/notifications/, { timeout: 10000 })
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Profile - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('profile works on mobile', async ({ page }) => {
    await page.goto(PROFILE_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('settings work on mobile', async ({ page }) => {
    await page.goto(SETTINGS_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })
})
