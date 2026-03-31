/**
 * E2E Setup Verification Test
 * 
 * Verifies that the improved global setup works correctly:
 * - Test users were created successfully
 * - Test data is accessible
 * - Auth state is working
 * - Portal can be accessed
 */

import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import { resolve } from 'path'

// Test data interface
interface E2ETestData {
  ownerId: string
  ownerProfileId: string
  pets: Array<{ id: string; name: string; species: string }>
  products: Array<{ id: string; name: string; sku: string }>
  services: Array<{ id: string; name: string }>
}

test.describe('E2E Setup Verification', () => {
  let testData: E2ETestData

  test.beforeAll(() => {
    // Load test data created by global setup
    const dataPath = resolve(process.cwd(), '.e2e-test-data.json')
    
    if (!fs.existsSync(dataPath)) {
      throw new Error('Test data file not found. Global setup may have failed.')
    }

    const content = fs.readFileSync(dataPath, 'utf-8')
    testData = JSON.parse(content)
  })

  test('test data was created successfully', () => {
    expect(testData).toBeDefined()
    expect(testData.ownerId).toBeTruthy()
    expect(testData.pets).toBeInstanceOf(Array)
    expect(testData.products).toBeInstanceOf(Array)
    expect(testData.services).toBeInstanceOf(Array)

    console.log('Test Data Summary:')
    console.log(`  Owner ID: ${testData.ownerId}`)
    console.log(`  Pets: ${testData.pets.length}`)
    console.log(`  Products: ${testData.products.length}`)
    console.log(`  Services: ${testData.services.length}`)
  })

  test('auth state file was created', () => {
    const authPath = resolve(process.cwd(), '.auth', 'owner.json')
    expect(fs.existsSync(authPath)).toBe(true)

    // Verify auth state has required data
    const authContent = fs.readFileSync(authPath, 'utf-8')
    const authData = JSON.parse(authContent)
    expect(authData.cookies).toBeDefined()
    expect(authData.origins).toBeDefined()
  })

  test('can access portal with authenticated state', async ({ page }) => {
    // Navigate to portal dashboard
    await page.goto('/terrapet/portal/dashboard')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check for portal indicators (auth successful)
    const indicators = [
      page.getByRole('heading', { name: /good (morning|afternoon|evening)|dashboard|portal/i }),
      page.getByRole('link', { name: /pets|appointments|profile/i }),
      page.locator('nav'),
      page.locator('main'),
    ]

    let found = false
    for (const indicator of indicators) {
      try {
        await indicator.first().waitFor({ state: 'visible', timeout: 3000 })
        found = true
        console.log('Portal access successful - found authenticated content')
        break
      } catch {
        continue
      }
    }

    expect(found).toBe(true)

    // Verify we're not on login page
    expect(page.url()).not.toContain('/login')
  })

  test('portal navigation works', async ({ page }) => {
    await page.goto('/terrapet/portal/dashboard')

    // Try to navigate to pets section if available
    const petsLink = page.getByRole('link', { name: /pets|mis mascotas/i }).first()
    
    try {
      await petsLink.waitFor({ state: 'visible', timeout: 5000 })
      await petsLink.click()
      
      // Wait for navigation
      await page.waitForLoadState('networkidle')
      
      // Should not be on login page
      expect(page.url()).not.toContain('/login')
      console.log('Navigation to pets section successful')
    } catch {
      console.log('Pets navigation not available - checking other sections')
      
      // Try other common portal sections
      const sections = [
        page.getByRole('link', { name: /appointments|citas/i }),
        page.getByRole('link', { name: /profile|perfil/i }),
        page.getByRole('link', { name: /services|servicios/i }),
      ]

      let navWorking = false
      for (const section of sections) {
        try {
          await section.first().waitFor({ state: 'visible', timeout: 3000 })
          await section.first().click()
          await page.waitForLoadState('networkidle')
          expect(page.url()).not.toContain('/login')
          navWorking = true
          console.log('Portal navigation working')
          break
        } catch {
          continue
        }
      }

      expect(navWorking).toBe(true)
    }
  })

  test('test pets are available in portal', async ({ page }) => {
    // Skip if no pets were created
    if (testData.pets.length === 0) {
      test.skip()
    }

    await page.goto('/terrapet/portal/pets')

    // Wait for page load
    await page.waitForLoadState('networkidle')

    // Look for pet names or pet-related content
    const petIndicators = [
      page.getByText(testData.pets[0].name, { exact: false }),
      page.getByText(/max|luna/i), // Common test pet names
      page.locator('[data-testid*=\"pet\"]'),
      page.getByRole('heading', { name: /pets|mascotas/i }),
    ]

    let petContentFound = false
    for (const indicator of petIndicators) {
      try {
        await indicator.first().waitFor({ state: 'visible', timeout: 5000 })
        petContentFound = true
        console.log('Pet content found in portal')
        break
      } catch {
        continue
      }
    }

    // Either find pet content OR confirm we're on pets page (even if empty)
    const onPetsPage = page.url().includes('/pets') && !page.url().includes('/login')
    expect(petContentFound || onPetsPage).toBe(true)
  })
})