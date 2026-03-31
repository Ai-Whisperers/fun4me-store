/**
 * Load Test Configuration
 *
 * Adjust these parameters based on your testing needs.
 */

export const config = {
  // Target environment
  baseUrl: process.env.LOAD_TEST_URL || 'http://localhost:3000',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_ANON_KEY || '',

  // Scale parameters for data generation
  tenants: {
    count: 10000,
    prefix: 'loadtest',
  },

  users: {
    perTenant: 10,
    distribution: {
      owner: 7, // 70% pet owners
      vet: 2, // 20% veterinarians
      admin: 1, // 10% admins
    },
  },

  pets: {
    perTenant: 100,
    species: ['dog', 'cat', 'bird', 'rabbit', 'hamster'],
    speciesDistribution: [0.5, 0.35, 0.05, 0.05, 0.05],
  },

  appointments: {
    perTenant: 50,
    statusDistribution: {
      scheduled: 0.3,
      confirmed: 0.2,
      completed: 0.4,
      cancelled: 0.1,
    },
  },

  medicalRecords: {
    perTenant: 200,
  },

  invoices: {
    perTenant: 100,
    statusDistribution: {
      draft: 0.1,
      sent: 0.2,
      paid: 0.6,
      overdue: 0.1,
    },
  },

  // Load test parameters
  scenarios: {
    dashboard: {
      vus: 50,
      duration: '5m',
      thresholds: {
        http_req_duration: ['p(95)<200'],
        http_req_failed: ['rate<0.01'],
      },
    },

    booking: {
      vus: 30,
      duration: '5m',
      thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
      },
    },

    medicalRecords: {
      vus: 40,
      duration: '5m',
      thresholds: {
        http_req_duration: ['p(95)<300'],
        http_req_failed: ['rate<0.01'],
      },
    },

    checkout: {
      vus: 20,
      duration: '5m',
      thresholds: {
        http_req_duration: ['p(95)<1000'],
        http_req_failed: ['rate<0.02'],
      },
    },

    mixed: {
      vus: 100,
      duration: '10m',
      stages: [
        { duration: '2m', target: 50 }, // Ramp up
        { duration: '5m', target: 100 }, // Steady state
        { duration: '2m', target: 150 }, // Peak
        { duration: '1m', target: 0 }, // Ramp down
      ],
      thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'],
        http_req_failed: ['rate<0.01'],
        checks: ['rate>0.99'],
      },
    },
  },

  // Database connection for data generation
  database: {
    connectionString: process.env.DATABASE_URL || '',
    poolSize: 20,
  },

  // Output configuration
  output: {
    reportsDir: './reports',
    format: ['json', 'html'],
  },
}

export type Config = typeof config
