# Implementation Plan: Automate Clinic Data Seeding via Background Job

### Phase 1: Seeding Script and Job Handler
- [ ] **Task:** Create the Data Seeding Script
  - [ ] Sub-task: Create a new script or function (e.g., `lib/seeding/seed-clinic.ts`) that takes a `clinic_id` as input.
  - [ ] Sub-task: Implement the logic within the script to insert default roles into the `roles` table, linked to the `clinic_id`.
  - [ ] Sub-task: Implement the logic to insert a default list of services into the `services` table, linked to the `clinic_id`.
  - [ ] Sub-task: Write integration tests for this seeding script to ensure it correctly inserts data for a given `clinic_id`.
- [ ] **Task:** Create the Background Job Handler
  - [ ] Sub-task: Define a new job handler function (e.g., in `/api/inngest`) that receives a `clinic_id` in its payload.
  - [ ] Sub-task: The handler should call the new seeding script with the received `clinic_id`.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 1: Seeding Script and Job Handler' (Protocol in workflow.md)

### Phase 2: Triggering and Verification
- [ ] **Task:** Trigger Job from Clinic Creation
  - [ ] Sub-task: Modify the Server Action that handles clinic creation from the super-admin panel.
  - [ ] Sub-task: After the clinic record is successfully created in the database, add a step to enqueue the `seed-new-clinic-data` job, passing the new `clinic_id`.
- [ ] **Task:** End-to-End Verification
  - [ ] Sub-task: In a staging environment, use the super-admin panel to create a new test clinic.
  - [ ] Sub-task: Check the background job dashboard to ensure the seeding job was triggered and completed successfully.
  - [ ] Sub-task: Query the database directly to verify that the default roles and services have been correctly created and associated with the new clinic.
- [ ] **Task:** Conductor - User Manual Verification 'Phase 2: Triggering and Verification' (Protocol in workflow.md)
