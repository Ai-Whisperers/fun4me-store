/**
 * Portal API Endpoint Specifications
 *
 * These endpoints are accessible by pet owners through the client portal.
 * All require authentication and proper tenant isolation.
 */

import { EndpointSpec } from '../permission-test-generator'

// Dynamic test IDs that will be resolved at runtime
let testPetId = 'test-pet-id'
let testAppointmentId = 'test-appointment-id'
let testServiceId = 'test-service-id'
let testProductId = 'test-product-id'
let testOrderId = 'test-order-id'
let testMessageId = 'test-message-id'
let testInvoiceId = 'test-invoice-id'
let testMedicalRecordId = 'test-medical-record-id'
let testVaccineId = 'test-vaccine-id'
let testPrescriptionId = 'test-prescription-id'

export const portalEndpoints: EndpointSpec[] = [
  // Profile endpoints
  {
    method: 'GET',
    path: '/api/portal/profile',
    description: 'Get own profile',
    allowedRoles: ['owner', 'vet', 'admin'],
  },
  {
    method: 'PATCH',
    path: '/api/portal/profile',
    description: 'Update own profile',
    allowedRoles: ['owner', 'vet', 'admin'],
    requestBody: { 
      full_name: 'Updated Name',
      phone: '+595981234567',
    },
  },
  {
    method: 'GET',
    path: '/api/portal/profile/notifications',
    description: 'Get notification preferences',
    allowedRoles: ['owner', 'vet', 'admin'],
  },
  {
    method: 'PUT',
    path: '/api/portal/profile/notifications',
    description: 'Update notification preferences',
    allowedRoles: ['owner', 'vet', 'admin'],
    requestBody: {
      email_notifications: true,
      sms_notifications: false,
      appointment_reminders: true,
      promotion_emails: true,
    },
  },

  // Pet management endpoints
  {
    method: 'GET',
    path: '/api/portal/pets',
    description: 'List own pets',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'pet' },
  },
  {
    method: 'GET',
    path: '/api/portal/pets/:id',
    description: 'Get specific pet',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'pet' },
    pathParams: { id: () => testPetId },
  },
  {
    method: 'POST',
    path: '/api/portal/pets',
    description: 'Create new pet',
    allowedRoles: ['owner'],
    requestBody: () => ({
      name: 'New Pet Test',
      species: 'dog',
      breed: 'Mixed',
      gender: 'male',
      birth_date: '2022-01-01',
      weight: 25.5,
      microchip_number: '123456789012345',
      notes: 'Test pet created via API',
    }),
  },
  {
    method: 'PUT',
    path: '/api/portal/pets/:id',
    description: 'Update pet information',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'pet' },
    pathParams: { id: () => testPetId },
    requestBody: {
      name: 'Updated Pet Name',
      weight: 27.0,
      notes: 'Updated via API test',
    },
  },
  {
    method: 'DELETE',
    path: '/api/portal/pets/:id',
    description: 'Delete pet',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'pet' },
    pathParams: { id: () => testPetId },
  },
  {
    method: 'GET',
    path: '/api/portal/pets/:id/medical-records',
    description: 'Get pet medical records',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'pet' },
    pathParams: { id: () => testPetId },
  },
  {
    method: 'GET',
    path: '/api/portal/pets/:id/vaccines',
    description: 'Get pet vaccination history',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'pet' },
    pathParams: { id: () => testPetId },
  },
  {
    method: 'GET',
    path: '/api/portal/pets/:id/weight-history',
    description: 'Get pet weight history',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'pet' },
    pathParams: { id: () => testPetId },
  },

  // Appointment endpoints
  {
    method: 'GET',
    path: '/api/portal/appointments',
    description: 'List own appointments',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'appointment' },
  },
  {
    method: 'GET',
    path: '/api/portal/appointments/:id',
    description: 'Get specific appointment',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'appointment' },
    pathParams: { id: () => testAppointmentId },
  },
  {
    method: 'POST',
    path: '/api/portal/appointments/request',
    description: 'Request appointment',
    allowedRoles: ['owner'],
    requestBody: () => ({
      pet_id: testPetId,
      service_id: testServiceId,
      preferred_date_start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      preferred_date_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Test appointment request',
      urgent: false,
    }),
  },
  {
    method: 'PUT',
    path: '/api/portal/appointments/:id/reschedule',
    description: 'Reschedule appointment',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'appointment' },
    pathParams: { id: () => testAppointmentId },
    requestBody: {
      preferred_date_start: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Client request - schedule conflict',
    },
  },
  {
    method: 'DELETE',
    path: '/api/portal/appointments/:id',
    description: 'Cancel appointment',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'appointment' },
    pathParams: { id: () => testAppointmentId },
    requestBody: {
      cancellation_reason: 'Client cancellation',
      refund_requested: false,
    },
  },
  {
    method: 'GET',
    path: '/api/portal/appointments/slots/available',
    description: 'Get available appointment slots',
    allowedRoles: ['owner'],
    requestBody: {
      service_id: testServiceId,
      date_start: new Date().toISOString().split('T')[0],
      date_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  },

  // Store/e-commerce endpoints
  {
    method: 'GET',
    path: '/api/portal/products',
    description: 'Browse available products',
    allowedRoles: ['owner', 'vet', 'admin'],
  },
  {
    method: 'GET',
    path: '/api/portal/products/:id',
    description: 'Get product details',
    allowedRoles: ['owner', 'vet', 'admin'],
    pathParams: { id: () => testProductId },
  },
  {
    method: 'GET',
    path: '/api/portal/cart',
    description: 'Get shopping cart',
    allowedRoles: ['owner'],
  },
  {
    method: 'POST',
    path: '/api/portal/cart/add',
    description: 'Add item to cart',
    allowedRoles: ['owner'],
    requestBody: () => ({
      product_id: testProductId,
      quantity: 2,
      pet_id: testPetId,
    }),
  },
  {
    method: 'PUT',
    path: '/api/portal/cart/update',
    description: 'Update cart item',
    allowedRoles: ['owner'],
    requestBody: {
      product_id: testProductId,
      quantity: 3,
    },
  },
  {
    method: 'DELETE',
    path: '/api/portal/cart/remove/:product_id',
    description: 'Remove item from cart',
    allowedRoles: ['owner'],
    pathParams: { product_id: () => testProductId },
  },
  {
    method: 'POST',
    path: '/api/portal/checkout',
    description: 'Process checkout',
    allowedRoles: ['owner'],
    requestBody: {
      payment_method: 'card',
      shipping_address: {
        street: 'Test Street 123',
        city: 'Asunción',
        country: 'Paraguay',
        postal_code: '12345',
      },
      billing_address: {
        street: 'Test Street 123',
        city: 'Asunción',
        country: 'Paraguay',
        postal_code: '12345',
      },
    },
  },
  {
    method: 'GET',
    path: '/api/portal/orders',
    description: 'Get order history',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'user_id', resourceFactory: 'order' },
  },
  {
    method: 'GET',
    path: '/api/portal/orders/:id',
    description: 'Get order details',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'user_id', resourceFactory: 'order' },
    pathParams: { id: () => testOrderId },
  },

  // Wishlist endpoints
  {
    method: 'GET',
    path: '/api/portal/wishlist',
    description: 'Get wishlist',
    allowedRoles: ['owner'],
  },
  {
    method: 'POST',
    path: '/api/portal/wishlist/add',
    description: 'Add to wishlist',
    allowedRoles: ['owner'],
    requestBody: {
      product_id: testProductId,
      notes: 'Added via API test',
    },
  },
  {
    method: 'DELETE',
    path: '/api/portal/wishlist/:product_id',
    description: 'Remove from wishlist',
    allowedRoles: ['owner'],
    pathParams: { product_id: () => testProductId },
  },

  // Loyalty points endpoints
  {
    method: 'GET',
    path: '/api/portal/loyalty/balance',
    description: 'View loyalty points balance',
    allowedRoles: ['owner'],
  },
  {
    method: 'GET',
    path: '/api/portal/loyalty/history',
    description: 'View loyalty points history',
    allowedRoles: ['owner'],
  },
  {
    method: 'POST',
    path: '/api/portal/loyalty/redeem',
    description: 'Redeem loyalty points',
    allowedRoles: ['owner'],
    requestBody: {
      points: 100,
      reward_id: 'REWARD-001',
      notes: 'API test redemption',
    },
  },

  // Messaging endpoints
  {
    method: 'GET',
    path: '/api/portal/messages',
    description: 'Get message inbox',
    allowedRoles: ['owner'],
  },
  {
    method: 'GET',
    path: '/api/portal/messages/:id',
    description: 'Get specific message',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'recipient_id', resourceFactory: 'message' },
    pathParams: { id: () => testMessageId },
  },
  {
    method: 'POST',
    path: '/api/portal/messages/send',
    description: 'Send message to clinic',
    allowedRoles: ['owner'],
    requestBody: {
      subject: 'Test Message',
      content: 'This is a test message sent via API',
      urgent: false,
    },
  },
  {
    method: 'PUT',
    path: '/api/portal/messages/:id/read',
    description: 'Mark message as read',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'recipient_id', resourceFactory: 'message' },
    pathParams: { id: () => testMessageId },
  },

  // Medical records endpoints
  {
    method: 'GET',
    path: '/api/portal/medical-records',
    description: 'Get medical records for owned pets',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'medicalRecord' },
  },
  {
    method: 'GET',
    path: '/api/portal/medical-records/:id',
    description: 'Get specific medical record',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'medicalRecord' },
    pathParams: { id: () => testMedicalRecordId },
  },
  {
    method: 'GET',
    path: '/api/portal/medical-records/:id/download',
    description: 'Download medical record PDF',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'medicalRecord' },
    pathParams: { id: () => testMedicalRecordId },
  },

  // Vaccination endpoints
  {
    method: 'GET',
    path: '/api/portal/vaccines',
    description: 'Get vaccination records for owned pets',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'vaccination' },
  },
  {
    method: 'GET',
    path: '/api/portal/vaccines/:id',
    description: 'Get specific vaccination record',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'vaccination' },
    pathParams: { id: () => testVaccineId },
  },
  {
    method: 'GET',
    path: '/api/portal/vaccines/:id/certificate',
    description: 'Download vaccination certificate',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'vaccination' },
    pathParams: { id: () => testVaccineId },
  },

  // Prescription endpoints
  {
    method: 'GET',
    path: '/api/portal/prescriptions',
    description: 'Get prescriptions for owned pets',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'prescription' },
  },
  {
    method: 'GET',
    path: '/api/portal/prescriptions/:id',
    description: 'Get specific prescription',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'prescription' },
    pathParams: { id: () => testPrescriptionId },
  },
  {
    method: 'GET',
    path: '/api/portal/prescriptions/:id/download',
    description: 'Download prescription PDF',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'owner_id', resourceFactory: 'prescription' },
    pathParams: { id: () => testPrescriptionId },
  },

  // Invoice endpoints
  {
    method: 'GET',
    path: '/api/portal/invoices',
    description: 'Get invoices for owned pets',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'user_id', resourceFactory: 'invoice' },
  },
  {
    method: 'GET',
    path: '/api/portal/invoices/:id',
    description: 'Get specific invoice',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'user_id', resourceFactory: 'invoice' },
    pathParams: { id: () => testInvoiceId },
  },
  {
    method: 'POST',
    path: '/api/portal/invoices/:id/pay',
    description: 'Pay invoice',
    allowedRoles: ['owner'],
    ownershipCheck: { field: 'user_id', resourceFactory: 'invoice' },
    pathParams: { id: () => testInvoiceId },
    requestBody: {
      payment_method: 'card',
      save_card: false,
    },
  },

  // Lost & Found Pets
  {
    method: 'GET',
    path: '/api/portal/lost-pets',
    description: 'Browse lost pets in area',
    allowedRoles: ['owner', 'vet', 'admin'],
  },
  {
    method: 'POST',
    path: '/api/portal/lost-pets/report',
    description: 'Report lost pet',
    allowedRoles: ['owner'],
    requestBody: {
      pet_name: 'Test Lost Pet',
      species: 'dog',
      breed: 'Mixed',
      color: 'Brown',
      last_seen_location: 'Asunción, Paraguay',
      last_seen_date: new Date().toISOString(),
      contact_info: '+595981234567',
      reward_offered: false,
      photos: [],
      description: 'Test lost pet report',
    },
  },
  {
    method: 'POST',
    path: '/api/portal/lost-pets/:id/found',
    description: 'Report found pet',
    allowedRoles: ['owner', 'vet', 'admin'],
    pathParams: { id: () => 'lost-pet-id' },
    requestBody: {
      found_location: 'Asunción, Paraguay',
      found_date: new Date().toISOString(),
      contact_info: 'Found near clinic',
      description: 'Pet seems healthy and safe',
    },
  },
]

// Export a function to set test IDs dynamically
export function setTestIds(ids: {
  petId?: string
  appointmentId?: string
  serviceId?: string
  productId?: string
  orderId?: string
  messageId?: string
  invoiceId?: string
  medicalRecordId?: string
  vaccineId?: string
  prescriptionId?: string
}): void {
  if (ids.petId) testPetId = ids.petId
  if (ids.appointmentId) testAppointmentId = ids.appointmentId
  if (ids.serviceId) testServiceId = ids.serviceId
  if (ids.productId) testProductId = ids.productId
  if (ids.orderId) testOrderId = ids.orderId
  if (ids.messageId) testMessageId = ids.messageId
  if (ids.invoiceId) testInvoiceId = ids.invoiceId
  if (ids.medicalRecordId) testMedicalRecordId = ids.medicalRecordId
  if (ids.vaccineId) testVaccineId = ids.vaccineId
  if (ids.prescriptionId) testPrescriptionId = ids.prescriptionId
}