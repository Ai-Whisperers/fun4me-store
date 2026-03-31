/**
 * API Documentation Page
 *
 * OPS-001: Swagger UI for API documentation
 *
 * Platform admin page displaying interactive API documentation
 */

import { Metadata } from 'next'
import { ApiDocsClient } from './client'

export const metadata: Metadata = {
  title: 'API Documentation | Vete Platform',
  description: 'Interactive API documentation for the Vete Platform',
}

export default function ApiDocsPage() {
  return <ApiDocsClient />
}
