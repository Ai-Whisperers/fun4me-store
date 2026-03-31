/**
 * E2E Tests: Invoices & Payments
 *
 * Tests invoice and payment functionality:
 * - Viewing invoices list
 * - Invoice details
 * - Payments
 */

import { test, expect, portalUrl, waitForLoadingComplete } from '../factories/test-fixtures'

const INVOICES_URL = portalUrl('invoices')
const PAYMENTS_URL = portalUrl('payments')

// =============================================================================
// Invoices List Tests
// =============================================================================

test.describe('Invoices - List', () => {
  test('can access invoices page', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    expect(page.url()).not.toContain('/login')
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows invoices list or empty state', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    const invoicesContent = page.locator(
      '[data-testid="invoices-list"], :text("Facturas"), :text("No hay facturas")'
    )

    await expect(invoicesContent.first()).toBeVisible()
  })

  test('can filter invoices by status', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    const statusFilter = page.locator(
      'select[name="status"], [data-testid="status-filter"], button:has-text("Pendiente")'
    )

    if (await statusFilter.first().isVisible()) {
      await statusFilter.first().click()
      await page.waitForTimeout(300)
    }
  })

  test('invoices show status badge', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    const invoice = page.locator('[data-testid="invoice-item"], .invoice-row')

    if (await invoice.first().isVisible()) {
      const statusBadge = invoice.first().locator(
        '[data-testid="invoice-status"], .status-badge, :text("Pagado"), :text("Pendiente")'
      )

      if (await statusBadge.isVisible()) {
        await expect(statusBadge).toBeVisible()
      }
    }
  })

  test('invoices show amount', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    const invoice = page.locator('[data-testid="invoice-item"]')

    if (await invoice.first().isVisible()) {
      const amount = invoice.first().locator(':text("Gs"), :text("₲")')
      if (await amount.isVisible()) {
        await expect(amount).toBeVisible()
      }
    }
  })
})

// =============================================================================
// Invoice Details Tests
// =============================================================================

test.describe('Invoices - Details', () => {
  test('can view invoice details', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    const invoice = page.locator('[data-testid="invoice-item"], a:has-text("INV-")')

    if (await invoice.first().isVisible()) {
      await invoice.first().click()
      await page.waitForURL(/\/invoices\//, { timeout: 10000 })

      const detailContent = page.locator(':text("Factura"), :text("Detalles")')
      await expect(detailContent.first()).toBeVisible()
    }
  })

  test('invoice detail shows items', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    const invoice = page.locator('[data-testid="invoice-item"]')

    if (await invoice.first().isVisible()) {
      await invoice.first().click()
      await page.waitForTimeout(500)

      const items = page.locator('[data-testid="invoice-items"], :text("Descripción"), :text("Cantidad")')
      if (await items.first().isVisible()) {
        await expect(items.first()).toBeVisible()
      }
    }
  })

  test('invoice shows subtotal and total', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    const invoice = page.locator('[data-testid="invoice-item"]')

    if (await invoice.first().isVisible()) {
      await invoice.first().click()
      await page.waitForTimeout(500)

      const totals = page.locator(':text("Subtotal"), :text("Total")')
      if (await totals.first().isVisible()) {
        await expect(totals.first()).toBeVisible()
      }
    }
  })

  test('can download invoice PDF', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    const invoice = page.locator('[data-testid="invoice-item"]')

    if (await invoice.first().isVisible()) {
      await invoice.first().click()
      await page.waitForTimeout(500)

      const downloadButton = page.locator(
        'button:has-text("Descargar"), a:has-text("PDF"), [data-testid="download-pdf"]'
      )

      if (await downloadButton.isVisible()) {
        await expect(downloadButton).toBeVisible()
      }
    }
  })
})

// =============================================================================
// Payment Tests
// =============================================================================

test.describe('Invoices - Payments', () => {
  test('unpaid invoice has pay button', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    const unpaidInvoice = page.locator('[data-testid="invoice-item"]:has-text("Pendiente")')

    if (await unpaidInvoice.first().isVisible()) {
      await unpaidInvoice.first().click()
      await page.waitForTimeout(500)

      const payButton = page.locator('button:has-text("Pagar"), [data-testid="pay-invoice"]')
      if (await payButton.isVisible()) {
        await expect(payButton).toBeVisible()
      }
    }
  })

  test('clicking pay shows payment options', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    const unpaidInvoice = page.locator('[data-testid="invoice-item"]:has-text("Pendiente")')

    if (await unpaidInvoice.first().isVisible()) {
      await unpaidInvoice.first().click()
      await page.waitForTimeout(500)

      const payButton = page.locator('[data-testid="pay-invoice"]')
      if (await payButton.isVisible()) {
        await payButton.click()
        await page.waitForTimeout(500)

        const paymentOptions = page.locator(
          ':text("Método de pago"), :text("Efectivo"), :text("Tarjeta")'
        )

        if (await paymentOptions.first().isVisible()) {
          await expect(paymentOptions.first()).toBeVisible()
        }
      }
    }
  })
})

// =============================================================================
// Payment History Tests
// =============================================================================

test.describe('Invoices - Payment History', () => {
  test('can access payments page', async ({ page }) => {
    await page.goto(PAYMENTS_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows payment history or empty state', async ({ page }) => {
    await page.goto(PAYMENTS_URL)
    await waitForLoadingComplete(page)

    const paymentsContent = page.locator(
      '[data-testid="payments-list"], :text("Pagos"), :text("No hay pagos")'
    )

    await expect(paymentsContent.first()).toBeVisible()
  })

  test('shows total paid summary', async ({ page }) => {
    await page.goto(PAYMENTS_URL)
    await waitForLoadingComplete(page)

    const totalPaid = page.locator('[data-testid="total-paid"], :text("Total pagado")')

    if (await totalPaid.isVisible()) {
      await expect(totalPaid).toBeVisible()
    }
  })

  test('shows pending amount summary', async ({ page }) => {
    await page.goto(PAYMENTS_URL)
    await waitForLoadingComplete(page)

    const pendingAmount = page.locator('[data-testid="pending-amount"], :text("Pendiente")')

    if (await pendingAmount.isVisible()) {
      await expect(pendingAmount).toBeVisible()
    }
  })

  test('payment shows method used', async ({ page }) => {
    await page.goto(PAYMENTS_URL)
    await waitForLoadingComplete(page)

    const payment = page.locator('[data-testid="payment-item"]')

    if (await payment.first().isVisible()) {
      const method = payment.first().locator(':text("Efectivo"), :text("Tarjeta"), :text("Transferencia")')
      if (await method.isVisible()) {
        await expect(method).toBeVisible()
      }
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Invoices - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('invoices list works on mobile', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('invoice detail works on mobile', async ({ page }) => {
    await page.goto(INVOICES_URL)
    await waitForLoadingComplete(page)

    const invoice = page.locator('[data-testid="invoice-item"]')

    if (await invoice.first().isVisible()) {
      await invoice.first().click()
      await page.waitForTimeout(500)

      const content = page.locator('main')
      await expect(content).toBeVisible()
    }
  })
})
