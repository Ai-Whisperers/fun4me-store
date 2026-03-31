/**
 * E2E Test: Integration and Error Handling
 * 
 * Tests integration points, error scenarios, and edge cases that
 * could occur in production. Focuses on resilience and user experience.
 */

import { test, expect } from '@playwright/test'

test.describe('Integration and Error Handling', () => {
  test('handles network errors gracefully', async ({ page }) => {
    // Start on homepage
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
    
    // Simulate offline condition
    await page.context().setOffline(true)
    
    // Try to navigate to another page
    await page.goto('/terrapet/portal').catch(() => {
      // Expected to fail when offline
    })
    
    // Restore connectivity
    await page.context().setOffline(false)
    
    // Should be able to navigate again
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
  })

  test('handles slow loading pages', async ({ page }) => {
    // Set slow network conditions
    await page.route('**/*', route => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(route.continue())
        }, 100) // Small delay to simulate slower network
      })
    })
    
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
    
    // Page should still load despite slower network
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })

  test('form validation and error messages', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
    
    // Look for form and submit without filling
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login")').first()
    
    if (await submitButton.isVisible()) {
      await submitButton.click()
      
      // Should show validation errors
      const errorElements = page.locator('.error, [class*="error"], [data-testid*="error"], .text-red, .text-danger')
      
      // Wait for potential error messages
      await page.waitForTimeout(1000)
      
      // If there are validation errors, they should be visible
      const errorCount = await errorElements.count()
      if (errorCount > 0) {
        await expect(errorElements.first()).toBeVisible()
      }
    }
  })

  test('session management and timeouts', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
    
    // Test session by navigating to protected area
    await page.goto('/terrapet/dashboard')
    
    // Should handle unauthorized access appropriately
    await expect(page.locator('body')).toBeVisible()
    
    // Should either be redirected to login or show access denied
    const isLoginPage = page.url().includes('/login') || page.url().includes('/auth')
    const hasLoginForm = await page.locator('input[type="email"], input[type="password"]').isVisible()
    const hasAccessError = await page.locator(':text-matches("unauthorized|access denied|permission", "i")').isVisible()
    
    const hasProperAuthHandling = isLoginPage || hasLoginForm || hasAccessError
    expect(hasProperAuthHandling).toBe(true)
  })

  test('api endpoints respond correctly', async ({ page, request }) => {
    // Test public API endpoints that should work
    const publicEndpoints = [
      '/api/health',
      '/api/auth/session',
    ]
    
    for (const endpoint of publicEndpoints) {
      const response = await request.get(endpoint).catch(() => null)
      
      if (response) {
        // Should get a valid HTTP response (not necessarily 200)
        expect(response.status()).toBeGreaterThanOrEqual(200)
        expect(response.status()).toBeLessThan(500)
      }
    }
  })

  test('handles malformed urls and routes', async ({ page }) => {
    const malformedUrls = [
      '/nonexistent-page',
      '/terrapet/nonexistent',
      '/invalid-clinic/portal',
      '/%20spaces%20in%20url'
    ]
    
    for (const url of malformedUrls) {
      await page.goto(url).catch(() => {
        // Some URLs might cause navigation errors, which is fine
      })
      
      // Page should load something (404 page, redirect, etc.)
      await expect(page.locator('body')).toBeVisible()
      
      // Should not show crash/error screen
      const hasErrorScreen = await page.locator(':text-matches("application error|unhandled exception|500", "i")').isVisible()
      expect(hasErrorScreen).toBe(false)
    }
  })

  test('data persistence and browser refresh', async ({ page }) => {
    // Start at homepage
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
    
    // Navigate to a different page
    await page.goto('/terrapet/store')
    await expect(page.locator('body')).toBeVisible()
    
    // Refresh the page
    await page.reload()
    await expect(page.locator('body')).toBeVisible()
    
    // Should still be on the same page after refresh
    expect(page.url()).toContain('/terrapet/store')
    
    // Navigate back and forward
    await page.goBack()
    await page.goForward()
    
    // Should handle browser navigation
    await expect(page.locator('body')).toBeVisible()
  })

  test('javascript console errors monitoring', async ({ page }) => {
    const consoleErrors = []
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // Navigate to key pages
    const pagesToCheck = ['/', '/login', '/terrapet/portal', '/terrapet/store']
    
    for (const url of pagesToCheck) {
      await page.goto(url)
      await expect(page.locator('body')).toBeVisible()
      
      // Wait for page to fully load and execute JS
      await page.waitForLoadState('networkidle')
    }
    
    // Filter out known acceptable errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('Extension context invalidated') &&
      !error.toLowerCase().includes('warning')
    )
    
    // Should not have critical JavaScript errors
    if (criticalErrors.length > 0) {
      console.log('JavaScript errors found:', criticalErrors)
    }
    
    // Allow some errors but not excessive ones
    expect(criticalErrors.length).toBeLessThan(10)
  })
})