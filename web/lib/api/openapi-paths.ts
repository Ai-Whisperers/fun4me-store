/**
 * OpenAPI Manual Path Definitions
 *
 * OPS-001: Manual path definitions for key API endpoints
 *
 * This file contains JSDoc swagger annotations for routes that
 * can't be easily auto-documented via the route files themselves.
 */

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check endpoint
 *     description: Returns system health status including database, auth, and environment checks
 *     security: []
 *     responses:
 *       200:
 *         description: System is healthy or degraded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */

/**
 * @swagger
 * /api/health/metrics:
 *   get:
 *     tags:
 *       - Health
 *     summary: Performance metrics endpoint
 *     description: Returns detailed performance metrics for monitoring dashboards
 *     security:
 *       - bearerAuth: []
 *       - cronSecret: []
 *     parameters:
 *       - name: format
 *         in: query
 *         description: Output format (json or prometheus)
 *         schema:
 *           type: string
 *           enum: [json, prometheus]
 *           default: json
 *       - name: key
 *         in: query
 *         description: API key for unauthenticated access (CRON_SECRET)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Performance metrics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PerformanceMetrics'
 *           text/plain:
 *             schema:
 *               type: string
 *               description: Prometheus format metrics
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /api/health/metrics/history:
 *   get:
 *     tags:
 *       - Health
 *     summary: Historical metrics
 *     description: Returns historical performance metrics for trend analysis
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: range
 *         in: query
 *         description: Time range for historical data
 *         schema:
 *           type: string
 *           enum: [1h, 6h, 24h, 7d, 30d]
 *           default: 24h
 *     responses:
 *       200:
 *         description: Historical metrics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     start: { type: string, format: date-time }
 *                     end: { type: string, format: date-time }
 *                     range: { type: string }
 *                 summary:
 *                   type: object
 *                   properties:
 *                     avgResponseTime: { type: number }
 *                     avgErrorRate: { type: number }
 *                     totalRequests: { type: integer }
 *                     healthyPct: { type: number }
 *                 dataPoints:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /api/pets:
 *   get:
 *     tags:
 *       - Pets
 *     summary: List pets
 *     description: Returns a list of pets for a user. Staff can query any user's pets within their tenant.
 *     parameters:
 *       - name: userId
 *         in: query
 *         required: true
 *         description: User ID whose pets to retrieve
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: query
 *         in: query
 *         description: Search by pet name
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of pets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Pet'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *
 *   post:
 *     tags:
 *       - Pets
 *     summary: Create pet
 *     description: Create a new pet (used by onboarding wizard)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - species
 *               - clinic
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 50
 *               species:
 *                 type: string
 *                 enum: [dog, cat, bird, rabbit, hamster, fish, reptile, other]
 *               breed:
 *                 type: string
 *                 maxLength: 100
 *                 nullable: true
 *               clinic:
 *                 type: string
 *                 description: Tenant/clinic ID
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - species
 *               - clinic
 *             properties:
 *               name:
 *                 type: string
 *               species:
 *                 type: string
 *               breed:
 *                 type: string
 *               clinic:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Pet created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pet'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/pets/{id}:
 *   get:
 *     tags:
 *       - Pets
 *     summary: Get pet details
 *     description: Returns detailed information about a specific pet
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Pet details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pet'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     tags:
 *       - Pets
 *     summary: Update pet
 *     description: Update pet information
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               species: { type: string }
 *               breed: { type: string }
 *               birth_date: { type: string, format: date }
 *               weight_kg: { type: number }
 *     responses:
 *       200:
 *         description: Pet updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     tags:
 *       - Pets
 *     summary: Delete pet
 *     description: Soft delete a pet (sets deleted_at)
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Pet deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     tags:
 *       - Appointments
 *     summary: List appointments
 *     description: Returns appointments with filtering options
 *     parameters:
 *       - name: date
 *         in: query
 *         description: Filter by date (YYYY-MM-DD)
 *         schema:
 *           type: string
 *           format: date
 *       - name: status
 *         in: query
 *         description: Filter by status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, checked_in, in_progress, completed, cancelled, no_show]
 *       - name: petId
 *         in: query
 *         description: Filter by pet ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: vetId
 *         in: query
 *         description: Filter by vet ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of appointments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   post:
 *     tags:
 *       - Appointments
 *     summary: Create appointment
 *     description: Create a new appointment or appointment request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pet_id
 *               - service_id
 *             properties:
 *               pet_id:
 *                 type: string
 *                 format: uuid
 *               service_id:
 *                 type: string
 *                 format: uuid
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               vet_id:
 *                 type: string
 *                 format: uuid
 *               notes:
 *                 type: string
 *               preferred_date_start:
 *                 type: string
 *                 format: date
 *               preferred_date_end:
 *                 type: string
 *                 format: date
 *               preferred_time_of_day:
 *                 type: string
 *                 enum: [morning, afternoon, any]
 *     responses:
 *       201:
 *         description: Appointment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     tags:
 *       - Invoices
 *     summary: List invoices
 *     description: Returns invoices for the tenant with pagination
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - name: status
 *         in: query
 *         description: Filter by invoice status
 *         schema:
 *           type: string
 *           enum: [draft, sent, partially_paid, paid, overdue, cancelled]
 *       - name: clientId
 *         in: query
 *         description: Filter by client ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Invoice'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   post:
 *     tags:
 *       - Invoices
 *     summary: Create invoice
 *     description: Create a new invoice
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_id
 *               - items
 *             properties:
 *               client_id:
 *                 type: string
 *                 format: uuid
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     description: { type: string }
 *                     quantity: { type: integer }
 *                     unit_price: { type: number }
 *               notes:
 *                 type: string
 *               due_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Invoice created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/store/products:
 *   get:
 *     tags:
 *       - Store
 *     summary: List products
 *     description: Returns store products with filtering and pagination
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - name: category
 *         in: query
 *         description: Filter by category ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: search
 *         in: query
 *         description: Search by product name or SKU
 *         schema:
 *           type: string
 *       - name: inStock
 *         in: query
 *         description: Filter by availability
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     tags:
 *       - Analytics
 *     summary: Export analytics data
 *     description: Export analytics data in various formats
 *     parameters:
 *       - name: type
 *         in: query
 *         required: true
 *         description: Type of data to export
 *         schema:
 *           type: string
 *           enum: [revenue, appointments, clients, services, inventory, customers]
 *       - name: format
 *         in: query
 *         description: Export format
 *         schema:
 *           type: string
 *           enum: [csv, json, pdf]
 *           default: csv
 *       - name: startDate
 *         in: query
 *         description: Start date for data range
 *         schema:
 *           type: string
 *           format: date
 *       - name: endDate
 *         in: query
 *         description: End date for data range
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Exported data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /api/medical-records:
 *   get:
 *     tags:
 *       - Medical Records
 *     summary: List medical records
 *     description: Returns medical records with filtering options
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - name: pet_id
 *         in: query
 *         description: Filter by pet ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: type
 *         in: query
 *         description: Filter by record type
 *         schema:
 *           type: string
 *           enum: [consultation, exam, surgery, hospitalization, wellness, emergency, follow_up, vaccination, lab_result, imaging]
 *       - name: from_date
 *         in: query
 *         description: Filter from date
 *         schema:
 *           type: string
 *           format: date
 *       - name: to_date
 *         in: query
 *         description: Filter to date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of medical records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MedicalRecord'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   post:
 *     tags:
 *       - Medical Records
 *     summary: Create medical record
 *     description: Create a new medical record (vet/admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pet_id
 *               - type
 *               - title
 *             properties:
 *               pet_id:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 enum: [consultation, exam, surgery, hospitalization, wellness, emergency, follow_up, vaccination, lab_result, imaging]
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               diagnosis:
 *                 type: string
 *                 maxLength: 2000
 *                 nullable: true
 *               diagnosis_code_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               notes:
 *                 type: string
 *                 maxLength: 5000
 *                 nullable: true
 *               vitals:
 *                 type: object
 *                 properties:
 *                   weight: { type: number, nullable: true }
 *                   temp: { type: number, minimum: 30, maximum: 45, nullable: true }
 *                   hr: { type: integer, maximum: 300, nullable: true }
 *                   rr: { type: integer, maximum: 100, nullable: true }
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 maxItems: 10
 *     responses:
 *       201:
 *         description: Medical record created
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /api/vaccines:
 *   get:
 *     tags:
 *       - Vaccines
 *     summary: List vaccines
 *     description: Returns vaccine records with filtering options
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - name: pet_id
 *         in: query
 *         description: Filter by pet ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: status
 *         in: query
 *         description: Filter by status
 *         schema:
 *           type: string
 *           enum: [pending, verified, expired]
 *       - name: upcoming
 *         in: query
 *         description: Show vaccines due within 30 days
 *         schema:
 *           type: boolean
 *       - name: overdue
 *         in: query
 *         description: Show overdue vaccines
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of vaccines
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vaccine'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   post:
 *     tags:
 *       - Vaccines
 *     summary: Create vaccine record
 *     description: Create a new vaccine record. Staff creates verified, owners create pending.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pet_id
 *               - name
 *               - administered_date
 *             properties:
 *               pet_id:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               administered_date:
 *                 type: string
 *                 format: date
 *               next_due_date:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               batch_number:
 *                 type: string
 *                 maxLength: 50
 *                 nullable: true
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *               certificate_url:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 maxItems: 5
 *     responses:
 *       201:
 *         description: Vaccine created
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Duplicate vaccine record
 */

/**
 * @swagger
 * /api/prescriptions:
 *   get:
 *     tags:
 *       - Prescriptions
 *     summary: List prescriptions
 *     description: Returns prescriptions for the tenant
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - name: pet_id
 *         in: query
 *         description: Filter by pet ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: valid_only
 *         in: query
 *         description: Only show valid (not expired) prescriptions
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of prescriptions
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   post:
 *     tags:
 *       - Prescriptions
 *     summary: Create prescription
 *     description: Create a new prescription (vet only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pet_id
 *               - medications
 *             properties:
 *               pet_id:
 *                 type: string
 *                 format: uuid
 *               medications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name: { type: string }
 *                     dose: { type: string }
 *                     frequency: { type: string }
 *                     duration: { type: string }
 *               valid_until:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Prescription created
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /api/hospitalizations:
 *   get:
 *     tags:
 *       - Hospitalization
 *     summary: List hospitalizations
 *     description: Returns current and past hospitalizations
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - name: status
 *         in: query
 *         description: Filter by status
 *         schema:
 *           type: string
 *           enum: [admitted, discharged, transferred]
 *       - name: pet_id
 *         in: query
 *         description: Filter by pet ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of hospitalizations
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   post:
 *     tags:
 *       - Hospitalization
 *     summary: Admit patient
 *     description: Admit a pet to hospitalization
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pet_id
 *               - kennel_id
 *             properties:
 *               pet_id:
 *                 type: string
 *                 format: uuid
 *               kennel_id:
 *                 type: string
 *                 format: uuid
 *               acuity_level:
 *                 type: string
 *                 enum: [critical, high, medium, low]
 *               diagnosis:
 *                 type: string
 *               treatment_plan:
 *                 type: string
 *     responses:
 *       201:
 *         description: Patient admitted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Kennel already occupied
 */

/**
 * @swagger
 * /api/hospitalizations/{id}/vitals:
 *   post:
 *     tags:
 *       - Hospitalization
 *     summary: Record vitals
 *     description: Record vital signs for hospitalized patient
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               temperature:
 *                 type: number
 *               heart_rate:
 *                 type: integer
 *               respiratory_rate:
 *                 type: integer
 *               blood_pressure:
 *                 type: string
 *               pain_score:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vitals recorded
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /api/lab-orders:
 *   get:
 *     tags:
 *       - Lab
 *     summary: List lab orders
 *     description: Returns laboratory orders with filtering
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - name: status
 *         in: query
 *         description: Filter by status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, cancelled]
 *       - name: pet_id
 *         in: query
 *         description: Filter by pet ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of lab orders
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   post:
 *     tags:
 *       - Lab
 *     summary: Create lab order
 *     description: Create a new lab order with tests (atomic operation)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pet_id
 *               - tests
 *             properties:
 *               pet_id:
 *                 type: string
 *                 format: uuid
 *               tests:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *               panels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               priority:
 *                 type: string
 *                 enum: [routine, urgent, stat]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lab order created
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/kennels:
 *   get:
 *     tags:
 *       - Hospitalization
 *     summary: List kennels
 *     description: Returns all kennels with availability status
 *     parameters:
 *       - name: status
 *         in: query
 *         description: Filter by availability
 *         schema:
 *           type: string
 *           enum: [available, occupied, maintenance, reserved]
 *       - name: type
 *         in: query
 *         description: Filter by kennel type
 *         schema:
 *           type: string
 *           enum: [small, medium, large, icu, isolation]
 *     responses:
 *       200:
 *         description: List of kennels
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/services:
 *   get:
 *     tags:
 *       - Services
 *     summary: List services
 *     description: Returns clinic services
 *     security: []
 *     parameters:
 *       - name: clinic
 *         in: query
 *         required: true
 *         description: Clinic/tenant ID
 *         schema:
 *           type: string
 *       - name: category
 *         in: query
 *         description: Filter by category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of services
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string, format: uuid }
 *                   name: { type: string }
 *                   category: { type: string }
 *                   base_price: { type: number }
 *                   duration_minutes: { type: integer }
 *                   is_active: { type: boolean }
 */

/**
 * @swagger
 * /api/messages:
 *   get:
 *     tags:
 *       - Messages
 *     summary: List conversations
 *     description: Returns conversations for the clinic
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - name: status
 *         in: query
 *         description: Filter by conversation status
 *         schema:
 *           type: string
 *           enum: [open, closed, archived]
 *     responses:
 *       200:
 *         description: List of conversations
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   post:
 *     tags:
 *       - Messages
 *     summary: Send message
 *     description: Send a new message in a conversation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversation_id
 *               - content
 *             properties:
 *               conversation_id:
 *                 type: string
 *                 format: uuid
 *               content:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       201:
 *         description: Message sent
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags:
 *       - Messages
 *     summary: List notifications
 *     description: Returns user notifications
 *     parameters:
 *       - name: unread
 *         in: query
 *         description: Only show unread notifications
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   post:
 *     tags:
 *       - Messages
 *     summary: Mark all notifications as read
 *     description: Marks all unread notifications as read
 *     responses:
 *       200:
 *         description: Notifications marked as read
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/clients:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List clients
 *     description: Returns clinic clients with their pets
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
 *       - name: search
 *         in: query
 *         description: Search by name or email
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of clients
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /api/staff:
 *   get:
 *     tags:
 *       - Admin
 *     summary: List staff
 *     description: Returns clinic staff members
 *     responses:
 *       200:
 *         description: List of staff
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /api/staff/schedules:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get staff schedules
 *     description: Returns weekly schedules for all staff
 *     responses:
 *       200:
 *         description: Staff schedules
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *
 *   post:
 *     tags:
 *       - Admin
 *     summary: Update schedule
 *     description: Update a staff member's schedule
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staff_id
 *               - day_of_week
 *               - start_time
 *               - end_time
 *             properties:
 *               staff_id:
 *                 type: string
 *                 format: uuid
 *               day_of_week:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *               start_time:
 *                 type: string
 *                 pattern: '^\d{2}:\d{2}$'
 *               end_time:
 *                 type: string
 *                 pattern: '^\d{2}:\d{2}$'
 *     responses:
 *       200:
 *         description: Schedule updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /api/cron/reminders:
 *   get:
 *     tags:
 *       - Cron
 *     summary: Process reminders
 *     description: Process scheduled appointment and vaccine reminders
 *     security:
 *       - cronSecret: []
 *     responses:
 *       200:
 *         description: Reminders processed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/cron/release-reservations:
 *   get:
 *     tags:
 *       - Cron
 *     summary: Release expired reservations
 *     description: Release stock reservations from abandoned carts
 *     security:
 *       - cronSecret: []
 *     responses:
 *       200:
 *         description: Reservations released
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/cron/stock-alerts:
 *   get:
 *     tags:
 *       - Cron
 *     summary: Send stock alerts
 *     description: Send low stock email alerts
 *     security:
 *       - cronSecret: []
 *     responses:
 *       200:
 *         description: Alerts sent
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

// Export empty object - this file is for JSDoc annotations only
export {}
