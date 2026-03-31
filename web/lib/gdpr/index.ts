/**
 * GDPR Module Exports
 *
 * COMP-001: GDPR Data Subject Rights implementation
 */

// Types
export * from './types'

// Data collection (Article 15 & 20)
export { collectUserData, generateExportJson, calculateExportSize } from './collect-data'

// Data deletion (Article 17)
export { deleteUserData, logGDPRDeletion, canDeleteUser } from './delete-data'

// Identity verification
export {
  generateVerificationToken,
  verifyPassword,
  createEmailVerification,
  verifyEmailToken,
  sendVerificationEmail,
  isIdentityVerified,
  checkRateLimit,
  verifyAdminPermission,
} from './verify-identity'
