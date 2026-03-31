/**
 * E2E Test: Critical Business Flows
 * 
 * Quick smoke tests for essential user journeys to ensure core functionality works.
 * Designed to run fast and catch critical regressions.
 */

import { test, expect } from '@playwright/test'

test.describe('Critical Business Flows - Smoke Tests', () => {
  test('public homepage loads and shows clinic info', async ({ page }) => {
    await page.goto('/')
    
    // Verify page loads successfully
    await expect(page).toHaveTitle(/Vetic|TerraPet|Vete/)
    
    // Look for key elements that indicate the app is working
    await expect(page.locator('body')).toBeVisible()
    
    // Should have some navigation or logo
    const navigation = page.locator('nav, header, [role="navigation"]').first()
    await expect(navigation).toBeVisible()
  })

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login')
    
    // Should load login form
    await expect(page.locator('body')).toBeVisible()
    
    // Look for login form elements
    const loginForm = page.locator('form, [data-testid*="login"], input[type="email"], input[type="password"]').first()
    await expect(loginForm).toBeVisible()
  })

  test('pet registration portal is accessible', async ({ page }) => {
    // Try to access a generic pet portal page
    await page.goto('/terrapet/portal')
    
    // Should either show login redirect or portal content
    await expect(page.locator('body')).toBeVisible()
    
    // Page should load without crashes
    await expect(page.locator('body')).not.toContainText('Application error')
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('appointment booking page exists', async ({ page }) => {
    // Try to access booking page
    await page.goto('/terrapet/book')
    
    // Should load some kind of booking interface or auth redirect
    await expect(page.locator('body')).toBeVisible()
    
    // Page should load without crashes
    await expect(page.locator('body')).not.toContainText('Application error')
    await expect(page.locator('body')).not.toContainText('404')
  })

  test('store/shop page exists', async ({ page }) => {
    // Try to access store page
    await page.goto('/terrapet/store')
    
    // Should load store interface or redirect
    await expect(page.locator('body')).toBeVisible()
    
    // Page should load without crashes
    await expect(page.locator('body')).not.toContainText('Application error')
    await expect(page.locator('body')).not.toContainText('404')
  })

  test('staff dashboard is protected', async ({ page }) => {
    // Try to access staff area without auth
    await page.goto('/terrapet/dashboard')
    
    // Should redirect to login or show auth error
    await expect(page.locator('body')).toBeVisible()
    
    // Should not show staff content without auth
    await page.waitForLoadState('networkidle')
    
    // Either on login page or seeing auth error
    const isLoginOrAuth = page.url().includes('/login') || 
                         page.url().includes('/auth') ||
                         await page.locator('input[type="email"], input[type="password"], [href*="login"]').isVisible()
    
    expect(isLoginOrAuth).toBe(true)
  })

  test('api health check works', async ({ page }) => {
    // Test if API is responding
    const response = await page.request.get('/api/health')
    
    // Should get a response (200 or other, but not network error)
    expect(response.status()).toBeGreaterThanOrEqual(200)
    expect(response.status()).toBeLessThan(500)
  })

  test('static assets load correctly', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Check that no critical resources failed to load
    const errors = []
    page.on('response', response => {
      if (response.status() >= 400 && (
        response.url().includes('.css') || 
        response.url().includes('.js') || 
        response.url().includes('.ico')
      )) {
        errors.push(`Failed to load: ${response.url()} (${response.status()})`)
      }
    })
    
    // Reload to trigger resource loading
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Should not have critical asset failures
    expect(errors.length).toBe(0)
  })
})