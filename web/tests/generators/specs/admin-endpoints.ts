/**
 * Admin API Endpoint Specifications
 *
 * These endpoints are accessible only by admin users for clinic management,
 * analytics, staff management, and system administration.
 */

import { EndpointSpec } from '../permission-test-generator'

export const adminEndpoints: EndpointSpec[] = [
  // Analytics and Reporting
  {
    method: 'GET',
    path: '/api/admin/analytics/dashboard',
    description: 'Get dashboard analytics',
    allowedRoles: ['admin'],
  },
  {
    method: 'GET',
    path: '/api/admin/analytics/revenue',
    description: 'Get revenue analytics',
    allowedRoles: ['admin'],
    requestBody: {
      date_start: '2025-01-01',
      date_end: '2025-12-31',
      group_by: 'month',
    },
  },
  {
    method: 'GET',
    path: '/api/admin/analytics/appointments',
    description: 'Get appointment analytics',
    allowedRoles: ['admin'],
    requestBody: {
      date_start: '2025-01-01',
      date_end: '2025-12-31',
      group_by: 'week',
    },
  },
  {
    method: 'GET',
    path: '/api/admin/analytics/patients',
    description: 'Get patient analytics',
    allowedRoles: ['admin'],
  },
  {
    method: 'GET',
    path: '/api/admin/analytics/services',
    description: 'Get service analytics',
    allowedRoles: ['admin'],
  },
  {
    method: 'GET',
    path: '/api/admin/analytics/products',
    description: 'Get product analytics',
    allowedRoles: ['admin'],
  },
  {
    method: 'GET',
    path: '/api/admin/reports/financial',
    description: 'Generate financial reports',
    allowedRoles: ['admin'],
    requestBody: {
      report_type: 'monthly_pnl',
      date_start: '2025-01-01',
      date_end: '2025-01-31',
      format: 'pdf',
    },
  },
  {
    method: 'GET',
    path: '/api/admin/reports/patients',
    description: 'Generate patient reports',
    allowedRoles: ['admin'],
    requestBody: {
      report_type: 'patient_demographics',
      date_start: '2025-01-01',
      date_end: '2025-01-31',
      format: 'excel',
    },
  },

  // Staff Management
  {
    method: 'GET',
    path: '/api/admin/staff',
    description: 'List all staff members',
    allowedRoles: ['admin'],
  },
  {
    method: 'GET',
    path: '/api/admin/staff/:id',
    description: 'Get staff member details',
    allowedRoles: ['admin'],
    pathParams: { id: () => 'staff-member-id' },
  },
  {
    method: 'POST',
    path: '/api/admin/staff/invite',
    description: 'Invite new staff member',
    allowedRoles: ['admin'],
    requestBody: {
      email: 'newstaff@vete.com.py',
      full_name: 'New Staff Member',
      role: 'vet',
      specialties: ['general_practice'],
      phone: '+595981234567',
      schedule_settings: {
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        working_hours: {
          start: '08:00',
          end: '18:00',
        },
      },
    },
  },
  {
    method: 'PUT',
    path: '/api/admin/staff/:id',
    description: 'Update staff member',
    allowedRoles: ['admin'],
    pathParams: { id: () => 'staff-member-id' },
    requestBody: {
      full_name: 'Updated Name',
      role: 'admin',
      specialties: ['surgery'],
      phone: '+595981234568',
      status: 'active',
    },
  },
  {
    method: 'DELETE',
    path: '/api/admin/staff/:id',
    description: 'Remove staff member',
    allowedRoles: ['admin'],
    pathParams: { id: () => 'staff-member-id' },
  },
  {
    method: 'GET',
    path: '/api/admin/staff/schedules',
    description: 'Get staff schedules',
    allowedRoles: ['admin'],
    requestBody: {
      date_start: '2025-01-01',
      date_end: '2025-01-31',
      staff_ids: ['staff-id-1', 'staff-id-2'],
    },
  },
  {
    method: 'PUT',
    path: '/api/admin/staff/:id/schedule',
    description: 'Update staff schedule',
    allowedRoles: ['admin'],
    pathParams: { id: () => 'staff-member-id' },
    requestBody: {
      schedule: [
        {
          day_of_week: 'monday',
          start_time: '08:00',
          end_time: '18:00',
          break_start: '12:00',
          break_end: '13:00',
        },
        {
          day_of_week: 'tuesday',
          start_time: '08:00',
          end_time: '18:00',
          break_start: '12:00',
          break_end: '13:00',
        },
      ],
      effective_date: '2025-01-01',
    },
  },

  // Clinic Settings
  {
    method: 'GET',
    path: '/api/admin/settings',
    description: 'Get clinic settings',
    allowedRoles: ['admin'],
  },
  {
    method: 'PUT',
    path: '/api/admin/settings',
    description: 'Update clinic settings',
    allowedRoles: ['admin'],
    requestBody: {
      clinic_name: 'Updated Clinic Name',
      clinic_phone: '+595981234567',
      clinic_email: 'info@clinic.com.py',
      clinic_address: {
        street: 'Updated Street 123',
        city: 'Asunción',
        country: 'Paraguay',
        postal_code: '12345',
      },
      business_hours: {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' },
        saturday: { open: '09:00', close: '13:00' },
        sunday: { open: null, close: null },
      },
      appointment_settings: {
        minimum_notice_hours: 24,
        maximum_advance_days: 90,
        auto_reminder_hours: [24, 2],
        cancellation_policy_hours: 24,
      },
      payment_settings: {
        accepted_methods: ['card', 'cash', 'transfer'],
        currency: 'PYG',
        tax_rate: 10,
      },
    },
  },
  {
    method: 'GET',
    path: '/api/admin/settings/services',
    description: 'Get service settings',
    allowedRoles: ['admin'],
  },
  {
    method: 'POST',
    path: '/api/admin/settings/services',
    description: 'Add new service',
    allowedRoles: ['admin'],
    requestBody: {
      name: 'New Service',
      description: 'Service description',
      category: 'consultation',
      duration_minutes: 30,
      price: 100000, // In Guaraní
      requires_vet: true,
      active: true,
      booking_settings: {
        online_booking: true,
        phone_booking: true,
        walk_in: false,
      },
    },
  },
  {
    method: 'PUT',
    path: '/api/admin/settings/services/:id',
    description: 'Update service',
    allowedRoles: ['admin'],
    pathParams: { id: () => 'service-id' },
    requestBody: {
      name: 'Updated Service',
      price: 120000,
      active: false,
    },
  },
  {
    method: 'DELETE',
    path: '/api/admin/settings/services/:id',
    description: 'Delete service',
    allowedRoles: ['admin'],
    pathParams: { id: () => 'service-id' },
  },

  // Tax and Legal Settings
  {
    method: 'GET',
    path: '/api/admin/settings/tax',
    description: 'Get tax settings',
    allowedRoles: ['admin'],
  },
  {
    method: 'PUT',
    path: '/api/admin/settings/tax',
    description: 'Update tax settings',
    allowedRoles: ['admin'],
    requestBody: {
      tax_enabled: true,
      tax_rate: 10,
      tax_id: 'RUC-12345678',
      tax_name: 'IVA',
      tax_inclusive_pricing: false,
    },
  },
  {
    method: 'GET',
    path: '/api/admin/settings/legal',
    description: 'Get legal and privacy settings',
    allowedRoles: ['admin'],
  },
  {
    method: 'PUT',
    path: '/api/admin/settings/legal',
    description: 'Update legal and privacy settings',
    allowedRoles: ['admin'],
    requestBody: {
      privacy_policy: 'Updated privacy policy content',
      terms_of_service: 'Updated terms of service',
      consent_settings: {
        require_data_consent: true,
        require_marketing_consent: false,
        consent_expiry_months: 12,
      },
      gdpr_settings: {
        data_retention_days: 365,
        auto_delete_inactive_days: 730,
        allow_data_export: true,
        allow_data_deletion: true,
      },
    },
  },

  // Integration Settings
  {
    method: 'GET',
    path: '/api/admin/settings/integrations',
    description: 'Get integration settings',
    allowedRoles: ['admin'],
  },
  {
    method: 'PUT',
    path: '/api/admin/settings/integrations/payment',
    description: 'Update payment integration settings',
    allowedRoles: ['admin'],
    requestBody: {
      stripe_enabled: false,
      bancard_enabled: true,
      tigo_money_enabled: true,
      bancard_settings: {
        merchant_id: 'TEST-123',
        secret_key: 'test-secret-key',
        environment: 'sandbox',
      },
      tigo_money_settings: {
        api_key: 'test-tigo-key',
        secret: 'test-tigo-secret',
        environment: 'sandbox',
      },
    },
  },
  {
    method: 'PUT',
    path: '/api/admin/settings/integrations/sms',
    description: 'Update SMS integration settings',
    allowedRoles: ['admin'],
    requestBody: {
      tigo_enabled: true,
      personal_enabled: true,
      tigo_settings: {
        api_key: 'test-tigo-sms-key',
        sender_id: 'VETE',
        environment: 'sandbox',
      },
      personal_settings: {
        api_key: 'test-personal-sms-key',
        sender_id: 'VETE',
        environment: 'sandbox',
      },
    },
  },
  {
    method: 'PUT',
    path: '/api/admin/settings/integrations/email',
    description: 'Update email integration settings',
    allowedRoles: ['admin'],
    requestBody: {
      provider: 'resend',
      api_key: 'test-resend-key',
      from_email: 'noreply@vete.com.py',
      from_name: 'Vete Clinic',
      settings: {
        enable_tracking: true,
        enable_sandbox: false,
      },
    },
  },

  // Security Settings
  {
    method: 'GET',
    path: '/api/admin/settings/security',
    description: 'Get security settings',
    allowedRoles: ['admin'],
  },
  {
    method: 'PUT',
    path: '/api/admin/settings/security',
    description: 'Update security settings',
    allowedRoles: ['admin'],
    requestBody: {
      authentication_settings: {
        require_email_verification: true,
        require_phone_verification: false,
        session_timeout_minutes: 120,
        max_login_attempts: 5,
        lockout_duration_minutes: 30,
        password_requirements: {
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_special_chars: false,
        },
      },
      api_settings: {
        rate_limiting: {
          enabled: true,
          requests_per_minute: 60,
          requests_per_hour: 1000,
          burst_limit: 100,
        },
        cors_settings: {
          allowed_origins: ['https://vete.com.py'],
          allowed_methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          allowed_headers: ['Content-Type', 'Authorization'],
        },
      },
    },
  },

  // Audit Logs
  {
    method: 'GET',
    path: '/api/admin/audit-logs',
    description: 'View audit logs',
    allowedRoles: ['admin'],
    requestBody: {
      date_start: '2025-01-01',
      date_end: '2025-01-31',
      user_id: 'specific-user-id',
      action_type: 'login',
      limit: 100,
      offset: 0,
    },
  },
  {
    method: 'GET',
    path: '/api/admin/audit-logs/:id',
    description: 'Get audit log details',
    allowedRoles: ['admin'],
    pathParams: { id: () => 'audit-log-id' },
  },
  {
    method: 'POST',
    path: '/api/admin/audit-logs/export',
    description: 'Export audit logs',
    allowedRoles: ['admin'],
    requestBody: {
      date_start: '2025-01-01',
      date_end: '2025-01-31',
      format: 'csv',
      fields: ['timestamp', 'user_id', 'action', 'ip_address', 'user_agent'],
    },
  },

  // System Maintenance
  {
    method: 'GET',
    path: '/api/admin/system/health',
    description: 'Get system health status',
    allowedRoles: ['admin'],
  },
  {
    method: 'POST',
    path: '/api/admin/system/backup',
    description: 'Trigger system backup',
    allowedRoles: ['admin'],
    requestBody: {
      backup_type: 'full',
      include_files: true,
      include_database: true,
      description: 'Manual backup by admin',
    },
  },
  {
    method: 'POST',
    path: '/api/admin/system/maintenance',
    description: 'Toggle maintenance mode',
    allowedRoles: ['admin'],
    requestBody: {
      enabled: true,
      message: 'System under maintenance for updates',
      estimated_duration_minutes: 30,
      allow_staff_access: true,
    },
  },
  {
    method: 'GET',
    path: '/api/admin/system/logs',
    description: 'Get system logs',
    allowedRoles: ['admin'],
    requestBody: {
      level: 'error',
      date_start: '2025-01-01',
      date_end: '2025-01-31',
      limit: 1000,
    },
  },

  // Data Management
  {
    method: 'GET',
    path: '/api/admin/data/export',
    description: 'Get data export options',
    allowedRoles: ['admin'],
  },
  {
    method: 'POST',
    path: '/api/admin/data/export/patients',
    description: 'Export patient data',
    allowedRoles: ['admin'],
    requestBody: {
      format: 'excel',
      date_range: {
        start: '2025-01-01',
        end: '2025-01-31',
      },
      include_fields: ['name', 'email', 'phone', 'pets', 'appointments'],
      include_inactive: false,
    },
  },
  {
    method: 'POST',
    path: '/api/admin/data/import/patients',
    description: 'Import patient data',
    allowedRoles: ['admin'],
    requestBody: {
      file_data: 'base64-encoded-file-data',
      format: 'excel',
      mapping: {
        name: 'full_name',
        email: 'email_address',
        phone: 'mobile_phone',
        pet_name: 'animal_name',
      },
      validation_options: {
        skip_duplicates: true,
        create_missing_fields: true,
        send_welcome_email: false,
      },
    },
  },
  {
    method: 'POST',
    path: '/api/admin/data/cleanup',
    description: 'Run data cleanup operations',
    allowedRoles: ['admin'],
    requestBody: {
      operations: [
        {
          type: 'remove_duplicate_appointments',
          date_cutoff: '2025-01-01',
        },
        {
          type: 'archive_old_medical_records',
          days_inactive: 365,
        },
        {
          type: 'cleanup_temp_files',
          older_than_days: 7,
        },
      ],
    },
  },
]