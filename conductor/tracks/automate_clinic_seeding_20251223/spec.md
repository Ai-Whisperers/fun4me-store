# Specification: Automate Clinic Data Seeding via Background Job

## 1. Overview
To ensure new clinics are set up consistently and correctly, this track will automate the process of seeding initial data (like default roles and services). This will be implemented as a reliable, asynchronous background job that is triggered after a new clinic is created via the super-admin panel.

## 2. Functional Requirements
1.  **Seeding Logic:** Create a script or function that contains the logic for seeding all necessary default data for a new clinic. This script must accept a `clinic_id` as a parameter to associate the new data correctly.
2.  **Seedable Data:** The initial version of the seeding script should insert:
    *   Default user roles for the clinic (e.g., 'vet', 'staff', 'admin').
    *   A default set of common services that a clinic might offer.
3.  **Background Job Integration:**
    *   Create a new background job handler (e.g., `seed-new-clinic-data`) that is responsible for calling the seeding script.
    *   Modify the existing "Create Clinic" process (from the super-admin panel track) to enqueue this new background job after a clinic record is successfully created, passing the new `clinic_id` to the job.

## 3. Acceptance Criteria
1.  A script for seeding default clinic data is created and tested.
2.  A new background job for seeding is created and is successfully triggered by the "Create Clinic" process.
3.  After a new clinic is created via the super-admin panel, the default roles and services are correctly inserted into the database and associated with the new clinic's ID.
4.  The entire process is reliable and can be observed and verified via the background job provider's dashboard.
