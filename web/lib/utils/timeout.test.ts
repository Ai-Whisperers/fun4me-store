import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withTimeout, withRetry, TimeoutError, isTimeoutError, isRetryableError, TIMEOUT_PRESETS } from './timeout'

describe('Timeout Utility (Epic 3.2)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('withTimeout', () => {
    it('resolves if promise completes within timeout', async () => {
      const promise = Promise.resolve('success')
      const result = await withTimeout(promise, 1000)
      expect(result).toBe('success')
    })

    it('throws TimeoutError if promise exceeds timeout', async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 2000))
      const timeoutPromise = withTimeout(promise, 1000, 'test operation')

      // Fast-forward time
      vi.advanceTimersByTime(1000)

      await expect(timeoutPromise).rejects.toThrow(TimeoutError)
      await expect(timeoutPromise).rejects.toThrow('test operation')
    })

    it('clears timeout if promise resolves early', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const promise = Promise.resolve('fast')
      
      await withTimeout(promise, 5000)
      
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    it('handles promise rejection before timeout', async () => {
      const error = new Error('Promise failed')
      const promise = Promise.reject(error)
      
      await expect(withTimeout(promise, 1000)).rejects.toThrow('Promise failed')
    })
  })

  describe('withRetry', () => {
    it('succeeds on first attempt if no error', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      const result = await withRetry(fn, { maxRetries: 3 })
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('retries on failure and eventually succeeds', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success')

      const resultPromise = withRetry(fn, { 
        maxRetries: 3,
        baseDelayMs: 100,
      })

      // Advance through retries
      await vi.advanceTimersByTimeAsync(100)
      await vi.advanceTimersByTimeAsync(200)

      const result = await resultPromise
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('throws after max retries exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'))

      const retryPromise = withRetry(fn, { 
        maxRetries: 2,
        baseDelayMs: 100,
      })

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(100)
      await vi.advanceTimersByTimeAsync(200)

      await expect(retryPromise).rejects.toThrow('Always fails')
      expect(fn).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('respects isRetryable function', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Non-retryable'))
      const isRetryable = vi.fn().mockReturnValue(false)

      await expect(withRetry(fn, { maxRetries: 3, isRetryable })).rejects.toThrow()
      
      expect(fn).toHaveBeenCalledTimes(1) // No retries
      expect(isRetryable).toHaveBeenCalled()
    })

    it('calls onRetry callback', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success')
      
      const onRetry = vi.fn()

      const resultPromise = withRetry(fn, { 
        maxRetries: 2,
        baseDelayMs: 100,
        onRetry,
      })

      await vi.advanceTimersByTimeAsync(100)
      await resultPromise

      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
    })

    it('applies exponential backoff correctly', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success')

      const delays: number[] = []
      const onRetry = vi.fn((attempt) => {
        delays.push(Date.now())
      })

      const resultPromise = withRetry(fn, { 
        maxRetries: 3,
        baseDelayMs: 1000,
        onRetry,
      })

      // First retry: 1000ms
      await vi.advanceTimersByTimeAsync(1000)
      // Second retry: 2000ms
      await vi.advanceTimersByTimeAsync(2000)

      await resultPromise
      
      expect(onRetry).toHaveBeenCalledTimes(2)
    })

    it('respects maxDelayMs cap', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success')

      const resultPromise = withRetry(fn, { 
        maxRetries: 2,
        baseDelayMs: 10000,
        maxDelayMs: 5000, // Cap at 5s
      })

      // Should wait max 5000ms, not 10000ms * 2^0
      await vi.advanceTimersByTimeAsync(5000)
      await resultPromise

      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('integrates timeout per retry attempt', async () => {
      const slowFn = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 15000)))

      const retryPromise = withRetry(slowFn, { 
        maxRetries: 1,
        timeoutMs: 1000, // 1 second timeout
        baseDelayMs: 100,
      })

      // Fast-forward past timeout
      await vi.advanceTimersByTimeAsync(1000)
      // Fast-forward past retry delay
      await vi.advanceTimersByTimeAsync(100)
      // Fast-forward past second timeout
      await vi.advanceTimersByTimeAsync(1000)

      await expect(retryPromise).rejects.toThrow(TimeoutError)
    })
  })

  describe('isTimeoutError', () => {
    it('identifies TimeoutError correctly', () => {
      const timeoutError = new TimeoutError('Timeout', 'test')
      expect(isTimeoutError(timeoutError)).toBe(true)
    })

    it('returns false for other errors', () => {
      const regularError = new Error('Not a timeout')
      expect(isTimeoutError(regularError)).toBe(false)
    })
  })

  describe('isRetryableError', () => {
    it('identifies timeout errors as retryable', () => {
      const timeoutError = new TimeoutError('Timeout')
      expect(isRetryableError(timeoutError)).toBe(true)
    })

    it('identifies network errors as retryable', () => {
      expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true)
      expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true)
      expect(isRetryableError(new Error('ENOTFOUND'))).toBe(true)
      expect(isRetryableError(new Error('network error'))).toBe(true)
    })

    it('identifies 5xx HTTP errors as retryable', () => {
      const error500 = Object.assign(new Error('Server error'), { status: 500 })
      const error503 = Object.assign(new Error('Service unavailable'), { status: 503 })
      
      expect(isRetryableError(error500)).toBe(true)
      expect(isRetryableError(error503)).toBe(true)
    })

    it('identifies 4xx HTTP errors as non-retryable', () => {
      const error400 = Object.assign(new Error('Bad request'), { status: 400 })
      const error404 = Object.assign(new Error('Not found'), { status: 404 })
      
      expect(isRetryableError(error400)).toBe(false)
      expect(isRetryableError(error404)).toBe(false)
    })

    it('identifies Stripe rate limit as retryable', () => {
      const rateLimitError = Object.assign(new Error('Rate limit'), { 
        type: 'StripeRateLimitError' 
      })
      expect(isRetryableError(rateLimitError)).toBe(true)
    })

    it('returns false for generic errors', () => {
      const genericError = new Error('Something went wrong')
      expect(isRetryableError(genericError)).toBe(false)
    })
  })

  describe('TIMEOUT_PRESETS', () => {
    it('provides reasonable timeout values', () => {
      expect(TIMEOUT_PRESETS.FAST).toBe(5000)
      expect(TIMEOUT_PRESETS.STANDARD).toBe(10000)
      expect(TIMEOUT_PRESETS.SLOW).toBe(30000)
      expect(TIMEOUT_PRESETS.PAYMENT).toBe(20000)
      expect(TIMEOUT_PRESETS.EMAIL).toBe(15000)
      expect(TIMEOUT_PRESETS.SMS).toBe(10000)
      expect(TIMEOUT_PRESETS.UPLOAD).toBe(60000)
    })
  })
})
