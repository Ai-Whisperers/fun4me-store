/**
 * Staff API Endpoint Specifications
 *
 * These endpoints are accessible by veterinary staff for clinical operations,
 * patient management, appointments, and medical records.
 */

import { EndpointSpec } from '../permission-test-generator'

let testPatientId = 'test-patient-id'
let testMedicalRecordId = 'test-medical-record-id'
let testPrescriptionId = 'test-prescription-id'
let testLabOrderId = 'test-lab-order-id'
let testAppointmentId = 'test-appointment-id'
let testInvoiceId = 'test-invoice-id'
let testKennelId = 'test-kennel-id'
let testProductId = 'test-product-id'
let testServiceId = 'test-service-id'

export const staffEndpoints: EndpointSpec[] = [
  // Patient Management (vet + admin)
  {
    method: 'GET',
    path: '/api/staff/patients',
    description: 'List all patients',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      search: 'John Doe',
      species: 'dog',
      limit: 50,
      offset: 0,
      sort_by: 'created_at',
      sort_direction: 'desc',
    },
  },
  {
    method: 'GET',
    path: '/api/staff/patients/:id',
    description: 'Get patient details',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testPatientId },
  },
  {
    method: 'POST',
    path: '/api/staff/patients',
    description: 'Create new patient',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      name: 'Test Patient',
      owner_id: 'owner-uuid',
      species: 'dog',
      breed: 'Mixed',
      gender: 'male',
      birth_date: '2022-01-01',
      weight: 25.5,
      microchip_number: '123456789012345',
      notes: 'Created via API test',
      medical_alerts: ['allergies', 'medications'],
    },
  },
  {
    method: 'PUT',
    path: '/api/staff/patients/:id',
    description: 'Update patient information',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testPatientId },
    requestBody: {
      weight: 27.0,
      notes: 'Updated weight via API test',
      medical_alerts: ['allergies'],
    },
  },
  {
    method: 'GET',
    path: '/api/staff/patients/search',
    description: 'Search patients by criteria',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      query: 'Buddy',
      search_fields: ['name', 'microchip_number', 'owner_name'],
      species_filter: ['dog', 'cat'],
      limit: 20,
    },
  },

  // Medical Records (vet + admin)
  {
    method: 'GET',
    path: '/api/staff/medical-records',
    description: 'List medical records',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      patient_id: testPatientId,
      date_range: {
        start: '2025-01-01',
        end: '2025-01-31',
      },
      record_types: ['consultation', 'vaccination'],
      limit: 50,
    },
  },
  {
    method: 'POST',
    path: '/api/staff/medical-records',
    description: 'Create medical record',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      patient_id: testPatientId,
      record_type: 'consultation',
      diagnosis: 'Healthy dog',
      symptoms: ['No symptoms, routine checkup'],
      treatment: 'No treatment needed',
      veterinarian_id: 'vet-uuid',
      appointment_id: testAppointmentId,
      notes: 'Annual wellness check',
      follow_up_required: false,
      files: [],
    },
  },
  {
    method: 'GET',
    path: '/api/staff/medical-records/:id',
    description: 'Get specific medical record',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testMedicalRecordId },
  },
  {
    method: 'PUT',
    path: '/api/staff/medical-records/:id',
    description: 'Update medical record',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testMedicalRecordId },
    requestBody: {
      diagnosis: 'Updated diagnosis',
      treatment: 'Updated treatment plan',
      notes: 'Updated after follow-up visit',
      files: [
        {
          type: 'xray',
          filename: 'xray-image.jpg',
          url: 'https://storage.xray.jpg',
          uploaded_at: new Date().toISOString(),
        },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/api/staff/medical-records/:id',
    description: 'Delete medical record',
    allowedRoles: ['admin'],
    pathParams: { id: () => testMedicalRecordId },
  },

  // Prescriptions (vet + admin)
  {
    method: 'GET',
    path: '/api/staff/prescriptions',
    description: 'List prescriptions',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      patient_id: testPatientId,
      status: 'active',
      date_range: {
        start: '2025-01-01',
        end: '2025-01-31',
      },
      limit: 50,
    },
  },
  {
    method: 'POST',
    path: '/api/staff/prescriptions',
    description: 'Create prescription',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      patient_id: testPatientId,
      veterinarian_id: 'vet-uuid',
      medications: [
        {
          name: 'Antibiotic',
          dosage: '10mg',
          frequency: 'twice daily',
          duration: '7 days',
          instructions: 'Take with food',
          refills: 0,
        },
        {
          name: 'Pain reliever',
          dosage: '5mg',
          frequency: 'as needed',
          duration: '3 days',
          instructions: 'Every 6 hours if needed',
          refills: 0,
        },
      ],
      diagnosis: 'Bacterial infection',
      notes: 'Prescribed after consultation',
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    method: 'GET',
    path: '/api/staff/prescriptions/:id',
    description: 'Get specific prescription',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testPrescriptionId },
  },
  {
    method: 'PUT',
    path: '/api/staff/prescriptions/:id',
    description: 'Update prescription',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testPrescriptionId },
    requestBody: {
      medications: [
        {
          id: 'medication-uuid',
          dosage: '15mg', // Updated dosage
          notes: 'Updated dosage after follow-up',
        },
      ],
      notes: 'Updated prescription after patient check-in',
    },
  },
  {
    method: 'DELETE',
    path: '/api/staff/prescriptions/:id',
    description: 'Cancel prescription',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testPrescriptionId },
    requestBody: {
      cancellation_reason: 'Patient no longer needs medication',
      notify_owner: true,
    },
  },

  // Vaccinations (vet + admin)
  {
    method: 'GET',
    path: '/api/staff/vaccines',
    description: 'List vaccination records',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      patient_id: testPatientId,
      status: 'all',
      date_range: {
        start: '2024-01-01',
        end: '2025-01-31',
      },
      limit: 50,
    },
  },
  {
    method: 'POST',
    path: '/api/staff/vaccines',
    description: 'Record vaccination',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      patient_id: testPatientId,
      vaccine_name: 'DHPP',
      vaccine_type: 'core',
      manufacturer: 'Test Manufacturer',
      batch_number: 'BATCH-123456',
      administration_date: new Date().toISOString(),
      next_due_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      veterinarian_id: 'vet-uuid',
      clinic_location: 'Main Clinic',
      reactions: null,
      notes: 'Routine annual vaccination',
    },
  },
  {
    method: 'PUT',
    path: '/api/staff/vaccines/:id',
    description: 'Update vaccination record',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      next_due_date: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString(),
      reactions: [
        {
          type: 'mild',
          description: 'Slight swelling at injection site',
          duration_hours: 24,
          treatment: 'Cold compress',
        },
      ],
      notes: 'Updated after owner reported mild reaction',
    },
  },

  // Lab Orders (vet + admin)
  {
    method: 'GET',
    path: '/api/staff/lab-orders',
    description: 'List lab orders',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      patient_id: testPatientId,
      status: 'all',
      date_range: {
        start: '2025-01-01',
        end: '2025-01-31',
      },
      limit: 50,
    },
  },
  {
    method: 'POST',
    path: '/api/staff/lab-orders',
    description: 'Create lab order',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      patient_id: testPatientId,
      veterinarian_id: 'vet-uuid',
      urgent: false,
      tests: [
        {
          test_type: 'blood_work',
          name: 'Complete Blood Count (CBC)',
          code: 'CBC-001',
        },
        {
          test_type: 'urinalysis',
          name: 'Basic Urinalysis',
          code: 'UR-001',
        },
      ],
      notes: 'Pre-surgical blood work',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    method: 'GET',
    path: '/api/staff/lab-orders/:id',
    description: 'Get specific lab order',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testLabOrderId },
  },
  {
    method: 'POST',
    path: '/api/staff/lab-orders/:id/results',
    description: 'Add lab results',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testLabOrderId },
    requestBody: {
      results: [
        {
          test_id: 'test-uuid-1',
          value: 'Normal range',
          status: 'normal',
          unit: 'cells/μL',
          reference_range: '5.0-15.0',
        },
        {
          test_id: 'test-uuid-2',
          value: 'Negative',
          status: 'normal',
          notes: 'No parasites detected',
        },
      ],
      veterinarian_id: 'vet-uuid',
      interpretation: 'All results within normal ranges',
      recommendations: 'Continue current treatment',
      files: [
        {
          type: 'lab_report',
          filename: 'lab-results.pdf',
          url: 'https://storage.lab-results.pdf',
        },
      ],
    },
  },

  // Appointments (staff view)
  {
    method: 'GET',
    path: '/api/staff/appointments',
    description: 'List all appointments',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      date_range: {
        start: '2025-01-01',
        end: '2025-01-31',
      },
      veterinarian_id: 'specific-vet-id',
      status: ['confirmed', 'in_progress'],
      limit: 100,
    },
  },
  {
    method: 'GET',
    path: '/api/staff/appointments/:id',
    description: 'Get appointment details',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testAppointmentId },
  },
  {
    method: 'PUT',
    path: '/api/staff/appointments/:id/status',
    description: 'Update appointment status',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testAppointmentId },
    requestBody: {
      status: 'confirmed',
      notes: 'Appointment confirmed with client',
      veterinarian_id: 'vet-uuid',
    },
  },
  {
    method: 'PUT',
    path: '/api/staff/appointments/:id/complete',
    description: 'Complete appointment',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testAppointmentId },
    requestBody: {
      completion_status: 'completed',
      actual_duration_minutes: 45,
      notes: 'Routine checkup completed successfully',
      next_appointment_suggested: true,
      next_appointment_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },

  // Kennel Management
  {
    method: 'GET',
    path: '/api/staff/kennels',
    description: 'List kennel status',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      date: '2025-01-01',
      status: 'all',
      kennel_type: 'all',
    },
  },
  {
    method: 'PUT',
    path: '/api/staff/kennels/:id/status',
    description: 'Update kennel status',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testKennelId },
    requestBody: {
      status: 'occupied',
      patient_id: testPatientId,
      check_in_time: new Date().toISOString(),
      expected_check_out: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Patient checked in for boarding',
    },
  },

  // Services and Pricing
  {
    method: 'GET',
    path: '/api/staff/services',
    description: 'List available services',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      category: 'all',
      active_only: true,
    },
  },
  {
    method: 'POST',
    path: '/api/staff/services',
    description: 'Add new service',
    allowedRoles: ['admin'],
    requestBody: {
      name: 'New Service Test',
      description: 'Service description',
      category: 'surgery',
      duration_minutes: 60,
      price: 500000, // In Guaraní
      requires_vet: true,
      active: true,
      booking_settings: {
        online_booking: true,
        phone_booking: true,
        walk_in: false,
      },
    },
  },

  // Store Management
  {
    method: 'GET',
    path: '/api/staff/products',
    description: 'Manage store products',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      category: 'all',
      status: 'all',
      low_stock_only: false,
    },
  },
  {
    method: 'POST',
    path: '/api/staff/products',
    description: 'Add new product',
    allowedRoles: ['admin'],
    requestBody: {
      name: 'New Product Test',
      description: 'Product description',
      category: 'medication',
      price: 150000,
      cost: 100000,
      stock_quantity: 50,
      reorder_level: 10,
      supplier: 'Test Supplier',
      active: true,
      prescription_required: true,
    },
  },
  {
    method: 'PUT',
    path: '/api/staff/products/:id/stock',
    description: 'Update product stock',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testProductId },
    requestBody: {
      stock_quantity: 45,
      adjustment_type: 'sale',
      adjustment_quantity: 5,
      reason: 'Stock adjustment test',
      adjustment_date: new Date().toISOString(),
    },
  },

  // Invoicing
  {
    method: 'GET',
    path: '/api/staff/invoices',
    description: 'List invoices',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      date_range: {
        start: '2025-01-01',
        end: '2025-01-31',
      },
      status: 'all',
      patient_id: testPatientId,
    },
  },
  {
    method: 'POST',
    path: '/api/staff/invoices',
    description: 'Create invoice',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      patient_id: testPatientId,
      items: [
        {
          type: 'service',
          description: 'Consultation fee',
          quantity: 1,
          unit_price: 100000,
          total_price: 100000,
        },
        {
          type: 'product',
          description: 'Medication - Antibiotic',
          quantity: 1,
          unit_price: 50000,
          total_price: 50000,
        },
      ],
      subtotal: 150000,
      tax_amount: 15000,
      total_amount: 165000,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    method: 'PUT',
    path: '/api/staff/invoices/:id/status',
    description: 'Update invoice status',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => testInvoiceId },
    requestBody: {
      status: 'paid',
      payment_method: 'cash',
      payment_date: new Date().toISOString(),
      notes: 'Payment received in cash',
    },
  },

  // Queue Management
  {
    method: 'GET',
    path: '/api/staff/queue',
    description: 'Get clinic queue',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      date: '2025-01-01',
      include_walk_ins: true,
    },
  },
  {
    method: 'POST',
    path: '/api/staff/queue/add',
    description: 'Add to queue',
    allowedRoles: ['vet', 'admin'],
    requestBody: {
      patient_id: testPatientId,
      service_id: testServiceId,
      priority: 'normal',
      estimated_wait_minutes: 15,
      notes: 'Added to queue via API test',
    },
  },
  {
    method: 'PUT',
    path: '/api/staff/queue/:id/call',
    description: 'Call next from queue',
    allowedRoles: ['vet', 'admin'],
    pathParams: { id: () => 'queue-item-id' },
    requestBody: {
      called_at: new Date().toISOString(),
      notes: 'Called to consultation room',
    },
  },
]

// Export function to set test IDs dynamically
export function setStaffTestIds(ids: {
  patientId?: string
  medicalRecordId?: string
  prescriptionId?: string
  labOrderId?: string
  appointmentId?: string
  invoiceId?: string
  kennelId?: string
  productId?: string
  serviceId?: string
}): void {
  if (ids.patientId) testPatientId = ids.patientId
  if (ids.medicalRecordId) testMedicalRecordId = ids.medicalRecordId
  if (ids.prescriptionId) testPrescriptionId = ids.prescriptionId
  if (ids.labOrderId) testLabOrderId = ids.labOrderId
  if (ids.appointmentId) testAppointmentId = ids.appointmentId
  if (ids.invoiceId) testInvoiceId = ids.invoiceId
  if (ids.kennelId) testKennelId = ids.kennelId
  if (ids.productId) testProductId = ids.productId
  if (ids.serviceId) testServiceId = ids.serviceId
}