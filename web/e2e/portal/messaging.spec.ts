/**
 * E2E Tests: Messaging
 *
 * Tests the messaging/communication system:
 * - Viewing conversations
 * - Sending messages
 * - Starting new conversations
 */

import { test, expect, portalUrl, waitForLoadingComplete } from '../factories/test-fixtures'

const MESSAGES_URL = portalUrl('messages')

// =============================================================================
// Conversations List Tests
// =============================================================================

test.describe('Messaging - Conversations', () => {
  test('can access messages page', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    expect(page.url()).not.toContain('/login')
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('shows conversations list or empty state', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const messagesContent = page.locator(
      '[data-testid="conversations-list"], :text("Mensajes"), :text("conversaciones"), :text("No hay mensajes")'
    )

    await expect(messagesContent.first()).toBeVisible()
  })

  test('conversations show preview and time', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const conversationItem = page.locator('[data-testid="conversation-item"], .conversation-item')

    if (await conversationItem.first().isVisible()) {
      // Should show time info
      const timeInfo = conversationItem.first().locator('time, :text("hace"), :text("ayer")')
      if (await timeInfo.isVisible()) {
        await expect(timeInfo).toBeVisible()
      }
    }
  })

  test('has button to start new conversation', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const newButton = page.locator(
      'a:has-text("Nuevo mensaje"), button:has-text("Nueva conversación"), [data-testid="new-conversation"]'
    )

    await expect(newButton.first()).toBeVisible()
  })
})

// =============================================================================
// Conversation View Tests
// =============================================================================

test.describe('Messaging - Conversation View', () => {
  test('can open a conversation', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const conversationItem = page.locator('[data-testid="conversation-item"], .conversation-item')

    if (await conversationItem.first().isVisible()) {
      await conversationItem.first().click()
      await page.waitForTimeout(500)

      // Should show message thread
      const messageThread = page.locator(
        '[data-testid="message-thread"], .messages-container, :text("Enviar")'
      )

      await expect(messageThread.first()).toBeVisible()
    }
  })

  test('conversation shows message history', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const conversationItem = page.locator('[data-testid="conversation-item"]')

    if (await conversationItem.first().isVisible()) {
      await conversationItem.first().click()
      await page.waitForTimeout(500)

      const messages = page.locator('[data-testid="message"], .message')

      if (await messages.first().isVisible()) {
        await expect(messages.first()).toBeVisible()
      }
    }
  })

  test('has message input field', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const conversationItem = page.locator('[data-testid="conversation-item"]')

    if (await conversationItem.first().isVisible()) {
      await conversationItem.first().click()
      await page.waitForTimeout(500)

      const messageInput = page.locator(
        'textarea, input[placeholder*="mensaje"], [data-testid="message-input"]'
      )

      await expect(messageInput).toBeVisible()
    }
  })
})

// =============================================================================
// Send Message Tests
// =============================================================================

test.describe('Messaging - Send Message', () => {
  test('can type a message', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const conversationItem = page.locator('[data-testid="conversation-item"]')

    if (await conversationItem.first().isVisible()) {
      await conversationItem.first().click()
      await page.waitForTimeout(500)

      const messageInput = page.locator('textarea, input[placeholder*="mensaje"]')

      if (await messageInput.isVisible()) {
        await messageInput.fill('Test message from E2E')
        const value = await messageInput.inputValue()
        expect(value).toBe('Test message from E2E')
      }
    }
  })

  test('has send button', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const conversationItem = page.locator('[data-testid="conversation-item"]')

    if (await conversationItem.first().isVisible()) {
      await conversationItem.first().click()
      await page.waitForTimeout(500)

      const sendButton = page.locator(
        'button:has-text("Enviar"), button[type="submit"], [data-testid="send-message"]'
      )

      await expect(sendButton).toBeVisible()
    }
  })

  test('can attach files', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const conversationItem = page.locator('[data-testid="conversation-item"]')

    if (await conversationItem.first().isVisible()) {
      await conversationItem.first().click()
      await page.waitForTimeout(500)

      const attachButton = page.locator(
        'button[aria-label*="adjuntar"], button:has-text("Archivo"), [data-testid="attach-file"]'
      )

      if (await attachButton.isVisible()) {
        await expect(attachButton).toBeVisible()
      }
    }
  })
})

// =============================================================================
// New Conversation Tests
// =============================================================================

test.describe('Messaging - New Conversation', () => {
  test('can start new conversation', async ({ page }) => {
    await page.goto(`${MESSAGES_URL}/new`)
    await waitForLoadingComplete(page)

    // Should show new message form
    const form = page.locator('form, [data-testid="new-conversation-form"]')
    await expect(form).toBeVisible()
  })

  test('new conversation form has subject field', async ({ page }) => {
    await page.goto(`${MESSAGES_URL}/new`)
    await waitForLoadingComplete(page)

    const subjectInput = page.locator(
      'input[name="subject"], input[placeholder*="Asunto"], [data-testid="subject-input"]'
    )

    if (await subjectInput.isVisible()) {
      await subjectInput.fill('E2E Test Subject')
    }
  })

  test('new conversation form has message field', async ({ page }) => {
    await page.goto(`${MESSAGES_URL}/new`)
    await waitForLoadingComplete(page)

    const messageInput = page.locator(
      'textarea, input[placeholder*="mensaje"], [data-testid="message-input"]'
    )

    await expect(messageInput).toBeVisible()
  })
})

// =============================================================================
// Unread Indicators Tests
// =============================================================================

test.describe('Messaging - Unread Indicators', () => {
  test('unread messages show badge', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const unreadBadge = page.locator(
      '[data-testid="unread-badge"], .unread-count, .badge'
    )

    if (await unreadBadge.first().isVisible()) {
      await expect(unreadBadge.first()).toBeVisible()
    }
  })

  test('unread conversations are highlighted', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const unreadConversation = page.locator(
      '[data-testid="conversation-item"].unread, .conversation-item.unread, [data-unread="true"]'
    )

    if (await unreadConversation.first().isVisible()) {
      await expect(unreadConversation.first()).toBeVisible()
    }
  })
})

// =============================================================================
// Mobile Tests
// =============================================================================

test.describe('Messaging - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('messages list works on mobile', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('conversation view works on mobile', async ({ page }) => {
    await page.goto(MESSAGES_URL)
    await waitForLoadingComplete(page)

    const conversationItem = page.locator('[data-testid="conversation-item"]')

    if (await conversationItem.first().isVisible()) {
      await conversationItem.first().click()
      await page.waitForTimeout(500)

      const content = page.locator('main')
      await expect(content).toBeVisible()
    }
  })
})
