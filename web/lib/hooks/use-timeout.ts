/**
 * Custom useTimeout hook with proper cleanup
 *
 * Safely handles setTimeout in React components by:
 * - Cleaning up the timer when dependencies change
 * - Cleaning up the timer when the component unmounts
 * - Preventing state updates on unmounted components
 *
 * @example
 * ```typescript
 * // Reset "copied" state after 2 seconds
 * const [copied, setCopied] = useState(false)
 * useCopyTimeout(copied, () => setCopied(false))
 * ```
 */

import { useEffect, useRef, useCallback } from 'react'

/**
 * Executes a callback after a delay with proper cleanup
 *
 * @param callback - Function to call after the delay
 * @param delay - Delay in milliseconds
 * @param enabled - Whether the timeout should be active (default: true)
 */
export function useTimeout(
  callback: () => void,
  delay: number,
  enabled: boolean = true
): void {
  const savedCallback = useRef(callback)

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    const timer = setTimeout(() => {
      savedCallback.current()
    }, delay)

    return () => clearTimeout(timer)
  }, [delay, enabled])
}

/**
 * Specialized hook for "copied to clipboard" feedback
 * Automatically resets state after a timeout
 *
 * @param isCopied - Current copied state
 * @param onReset - Callback to reset the state
 * @param delay - Delay before reset (default: 2000ms)
 */
export function useCopyTimeout(
  isCopied: boolean,
  onReset: () => void,
  delay: number = 2000
): void {
  useTimeout(onReset, delay, isCopied)
}

/**
 * Returns a function to safely set a timeout that will be cleared on unmount
 * Useful when you need to set timeouts in event handlers
 *
 * @example
 * ```typescript
 * const safeTimeout = useSafeTimeout()
 *
 * const handleCopy = () => {
 *   setCopied(true)
 *   safeTimeout(() => setCopied(false), 2000)
 * }
 * ```
 */
export function useSafeTimeout(): (callback: () => void, delay: number) => void {
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set())

  // Clear all timeouts on unmount
  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach(clearTimeout)
      timeouts.clear()
    }
  }, [])

  return useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      callback()
      timeoutsRef.current.delete(timer)
    }, delay)
    timeoutsRef.current.add(timer)
  }, [])
}
