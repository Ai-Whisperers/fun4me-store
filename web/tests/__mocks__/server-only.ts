/**
 * Mock for 'server-only' package
 *
 * The server-only package throws an error when imported in client components.
 * In test environments, we mock it as a no-op to allow testing server-only code.
 */

// No-op - just prevents the error
export default {}
