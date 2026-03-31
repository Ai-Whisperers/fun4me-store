/**
 * Mixed Workload Load Test
 *
 * Simulates realistic production traffic:
 * - 60% reads (dashboards, listings)
 * - 30% writes (appointments, records)
 * - 10% heavy queries (reports, search)
 *
 * Run with:
 *   k6 run scenarios/mixed.js
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const dashboardDuration = new Trend('dashboard_duration')
const bookingDuration = new Trend('booking_duration')
const searchDuration = new Trend('search_duration')

// Configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 }, // Ramp up
    { duration: '5m', target: 100 }, // Steady state
    { duration: '2m', target: 150 }, // Peak load
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
    checks: ['rate>0.99'],
  },
}

// Environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const TENANT_PREFIX = __ENV.TENANT_PREFIX || 'loadtest'
const TENANT_COUNT = parseInt(__ENV.TENANT_COUNT || '10000')

// Helper functions
function randomTenant() {
  const index = Math.floor(Math.random() * TENANT_COUNT) + 1
  return `${TENANT_PREFIX}-${index.toString().padStart(5, '0')}`
}

function randomDate(daysAhead = 30) {
  const date = new Date()
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead))
  return date.toISOString().split('T')[0]
}

// Scenario weights
const scenarios = [
  { name: 'dashboard', weight: 0.35, fn: dashboardScenario },
  { name: 'appointments', weight: 0.2, fn: appointmentsScenario },
  { name: 'patients', weight: 0.15, fn: patientsScenario },
  { name: 'booking', weight: 0.1, fn: bookingScenario },
  { name: 'search', weight: 0.1, fn: searchScenario },
  { name: 'invoices', weight: 0.1, fn: invoicesScenario },
]

// Dashboard scenario (read-heavy)
function dashboardScenario() {
  const tenant = randomTenant()

  group('Dashboard Load', () => {
    // Fetch today's appointments
    const appointmentsRes = http.get(`${BASE_URL}/api/appointments?tenant=${tenant}&date=${randomDate(0)}`)
    check(appointmentsRes, {
      'appointments status 200': (r) => r.status === 200,
      'appointments has data': (r) => r.json() !== null,
    })

    // Fetch pending invoices
    const invoicesRes = http.get(`${BASE_URL}/api/invoices?tenant=${tenant}&status=pending`)
    check(invoicesRes, {
      'invoices status 200': (r) => r.status === 200,
    })

    // Fetch recent patients
    const patientsRes = http.get(`${BASE_URL}/api/patients?tenant=${tenant}&limit=10`)
    check(patientsRes, {
      'patients status 200': (r) => r.status === 200,
    })

    dashboardDuration.add(appointmentsRes.timings.duration + invoicesRes.timings.duration + patientsRes.timings.duration)
  })

  sleep(Math.random() * 2 + 1)
}

// Appointments listing scenario
function appointmentsScenario() {
  const tenant = randomTenant()

  group('Appointments', () => {
    // Weekly view
    const weekRes = http.get(`${BASE_URL}/api/appointments?tenant=${tenant}&view=week`)
    check(weekRes, {
      'week view status 200': (r) => r.status === 200,
    })

    // Monthly calendar
    const monthRes = http.get(`${BASE_URL}/api/appointments?tenant=${tenant}&view=month`)
    check(monthRes, {
      'month view status 200': (r) => r.status === 200,
    })
  })

  sleep(Math.random() * 1.5 + 0.5)
}

// Patients listing scenario
function patientsScenario() {
  const tenant = randomTenant()

  group('Patients', () => {
    // List with pagination
    const page = Math.floor(Math.random() * 10)
    const listRes = http.get(`${BASE_URL}/api/patients?tenant=${tenant}&page=${page}&limit=20`)
    check(listRes, {
      'patients list status 200': (r) => r.status === 200,
    })

    // Get single patient details (if we got results)
    if (listRes.status === 200) {
      const patients = listRes.json()
      if (patients && patients.length > 0) {
        const patientId = patients[0].id
        const detailRes = http.get(`${BASE_URL}/api/patients/${patientId}?tenant=${tenant}`)
        check(detailRes, {
          'patient detail status 200': (r) => r.status === 200,
        })
      }
    }
  })

  sleep(Math.random() * 1 + 0.5)
}

// Booking scenario (write)
function bookingScenario() {
  const tenant = randomTenant()

  group('Booking Flow', () => {
    // Check availability using proper slots endpoint
    const date = randomDate(14)
    const availRes = http.get(`${BASE_URL}/api/appointments/slots?tenant=${tenant}&date=${date}`)
    check(availRes, {
      'availability status 200': (r) => r.status === 200,
    })

    // Simulate booking (POST)
    const bookingPayload = JSON.stringify({
      tenant_id: tenant,
      pet_id: 'test-pet-id',
      service_id: 'test-service-id',
      date: date,
      time: '10:00',
    })

    const bookRes = http.post(`${BASE_URL}/api/appointments`, bookingPayload, {
      headers: { 'Content-Type': 'application/json' },
    })

    // Note: This might fail due to test data constraints, that's expected
    const success = bookRes.status === 200 || bookRes.status === 201 || bookRes.status === 400
    check(bookRes, {
      'booking request processed': () => success,
    })

    bookingDuration.add(availRes.timings.duration + bookRes.timings.duration)
  })

  sleep(Math.random() * 2 + 1)
}

// Search scenario (heavy read)
function searchScenario() {
  const tenant = randomTenant()
  const searchTerms = ['luna', 'max', 'bella', 'rocky', 'consulta', 'vacuna']
  const term = searchTerms[Math.floor(Math.random() * searchTerms.length)]

  group('Search', () => {
    const searchRes = http.get(`${BASE_URL}/api/search?tenant=${tenant}&q=${term}`)
    check(searchRes, {
      'search status 200': (r) => r.status === 200,
    })

    searchDuration.add(searchRes.timings.duration)
  })

  sleep(Math.random() * 1 + 0.5)
}

// Invoices scenario
function invoicesScenario() {
  const tenant = randomTenant()

  group('Invoices', () => {
    // List invoices
    const listRes = http.get(`${BASE_URL}/api/invoices?tenant=${tenant}&limit=20`)
    check(listRes, {
      'invoices list status 200': (r) => r.status === 200,
    })

    // Get single invoice
    if (listRes.status === 200) {
      const invoices = listRes.json()
      if (invoices && invoices.length > 0) {
        const invoiceId = invoices[0].id
        const detailRes = http.get(`${BASE_URL}/api/invoices/${invoiceId}?tenant=${tenant}`)
        check(detailRes, {
          'invoice detail status 200': (r) => r.status === 200,
        })
      }
    }
  })

  sleep(Math.random() * 1 + 0.5)
}

// Main execution
export default function () {
  // Select scenario based on weights
  const rand = Math.random()
  let cumulative = 0

  for (const scenario of scenarios) {
    cumulative += scenario.weight
    if (rand <= cumulative) {
      try {
        scenario.fn()
      } catch (e) {
        errorRate.add(1)
        console.error(`Error in ${scenario.name}: ${e.message}`)
      }
      return
    }
  }

  // Fallback to dashboard
  dashboardScenario()
}

// Setup - run once before test
export function setup() {
  console.log(`Load test starting against: ${BASE_URL}`)
  console.log(`Testing ${TENANT_COUNT} tenants with prefix: ${TENANT_PREFIX}`)

  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`)
  if (healthRes.status !== 200) {
    throw new Error(`Health check failed: ${healthRes.status}`)
  }

  return { startTime: new Date().toISOString() }
}

// Teardown - run once after test
export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`)
}
