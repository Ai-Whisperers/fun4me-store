-- =============================================================================
-- 040_COMPREHENSIVE_FK_INDEXES.SQL
-- =============================================================================
-- Adds indexes for ALL foreign key columns that lack them.
-- Foreign keys without indexes cause slow deletes and slow JOIN operations.
--
-- Issue: DB-C7 from system audit
-- Created: 2026-01-06
--
-- NOTE: Use CONCURRENTLY for production safety (doesn't lock tables)
-- =============================================================================

-- =============================================================================
-- PETS & OWNERS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pets_owner_id
ON pets(owner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pets_primary_vet_id
ON pets(primary_vet_id) WHERE primary_vet_id IS NOT NULL;

-- =============================================================================
-- MEDICAL RECORDS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_records_pet_id
ON medical_records(pet_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_records_vet_id
ON medical_records(vet_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_medical_records_diagnosis_code_id
ON medical_records(diagnosis_code_id) WHERE diagnosis_code_id IS NOT NULL;

-- =============================================================================
-- VACCINES
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaccines_pet_id
ON vaccines(pet_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaccines_administered_by
ON vaccines(administered_by) WHERE administered_by IS NOT NULL;

-- =============================================================================
-- VACCINE REACTIONS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaccine_reactions_pet_id
ON vaccine_reactions(pet_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vaccine_reactions_vaccine_id
ON vaccine_reactions(vaccine_id);

-- =============================================================================
-- PRESCRIPTIONS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prescriptions_pet_id
ON prescriptions(pet_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prescriptions_vet_id
ON prescriptions(vet_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prescriptions_client_id
ON prescriptions(client_id) WHERE client_id IS NOT NULL;

-- =============================================================================
-- APPOINTMENTS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_pet_id
ON appointments(pet_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_vet_id
ON appointments(vet_id) WHERE vet_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_service_id
ON appointments(service_id) WHERE service_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_created_by
ON appointments(created_by) WHERE created_by IS NOT NULL;

-- =============================================================================
-- HOSPITALIZATIONS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hospitalizations_pet_id
ON hospitalizations(pet_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hospitalizations_kennel_id
ON hospitalizations(kennel_id) WHERE kennel_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hospitalizations_attending_vet_id
ON hospitalizations(attending_vet_id) WHERE attending_vet_id IS NOT NULL;

-- =============================================================================
-- HOSPITALIZATION MEDICATIONS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hospitalization_medications_hosp_id
ON hospitalization_medications(hospitalization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hospitalization_medications_administered_by
ON hospitalization_medications(administered_by) WHERE administered_by IS NOT NULL;

-- =============================================================================
-- HOSPITALIZATION FEEDINGS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hospitalization_feedings_hosp_id
ON hospitalization_feedings(hospitalization_id);

-- =============================================================================
-- INVOICES
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_pet_id
ON invoices(pet_id) WHERE pet_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_owner_id
ON invoices(owner_id) WHERE owner_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_created_by
ON invoices(created_by) WHERE created_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_hospitalization_id
ON invoices(hospitalization_id) WHERE hospitalization_id IS NOT NULL;

-- =============================================================================
-- INVOICE ITEMS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_invoice_id
ON invoice_items(invoice_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_service_id
ON invoice_items(service_id) WHERE service_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_product_id
ON invoice_items(product_id) WHERE product_id IS NOT NULL;

-- =============================================================================
-- PAYMENTS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_invoice_id
ON payments(invoice_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_processed_by
ON payments(processed_by) WHERE processed_by IS NOT NULL;

-- =============================================================================
-- REFUNDS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refunds_payment_id
ON refunds(payment_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refunds_processed_by
ON refunds(processed_by) WHERE processed_by IS NOT NULL;

-- =============================================================================
-- STORE PRODUCTS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_products_category_id
ON store_products(category_id) WHERE category_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_products_brand_id
ON store_products(brand_id) WHERE brand_id IS NOT NULL;

-- =============================================================================
-- STORE INVENTORY
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_inventory_product_id
ON store_inventory(product_id);

-- =============================================================================
-- STORE ORDERS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_orders_user_id
ON store_orders(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_orders_coupon_id
ON store_orders(coupon_id) WHERE coupon_id IS NOT NULL;

-- =============================================================================
-- STORE ORDER ITEMS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_order_items_product_id
ON store_order_items(product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_order_items_variant_id
ON store_order_items(variant_id) WHERE variant_id IS NOT NULL;

-- =============================================================================
-- STORE REVIEWS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_reviews_product_id
ON store_reviews(product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_reviews_customer_id
ON store_reviews(customer_id);

-- =============================================================================
-- STORE WISHLISTS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_wishlists_user_id
ON store_wishlists(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_wishlists_product_id
ON store_wishlists(product_id);

-- =============================================================================
-- STORE CARTS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_carts_customer_id
ON store_carts(customer_id);

-- =============================================================================
-- STORE SUBSCRIPTIONS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_subscriptions_customer_id
ON store_subscriptions(customer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_subscriptions_product_id
ON store_subscriptions(product_id);

-- =============================================================================
-- STORE CAMPAIGNS & CAMPAIGN ITEMS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_campaign_items_campaign_id
ON store_campaign_items(campaign_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_campaign_items_product_id
ON store_campaign_items(product_id);

-- =============================================================================
-- STORE COMMISSIONS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_commissions_order_id
ON store_commissions(order_id);

-- =============================================================================
-- LAB ORDERS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lab_orders_pet_id
ON lab_orders(pet_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lab_orders_ordered_by
ON lab_orders(ordered_by);

-- =============================================================================
-- LAB ORDER ITEMS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lab_order_items_lab_order_id
ON lab_order_items(lab_order_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lab_order_items_test_id
ON lab_order_items(test_id);

-- =============================================================================
-- LAB RESULTS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lab_results_lab_order_id
ON lab_results(lab_order_id);

-- =============================================================================
-- CONSENT DOCUMENTS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consent_documents_pet_id
ON consent_documents(pet_id) WHERE pet_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consent_documents_template_id
ON consent_documents(template_id);

-- =============================================================================
-- INSURANCE POLICIES
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insurance_policies_pet_id
ON insurance_policies(pet_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insurance_policies_provider_id
ON insurance_policies(provider_id);

-- =============================================================================
-- INSURANCE CLAIMS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insurance_claims_policy_id
ON insurance_claims(policy_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_insurance_claims_pet_id
ON insurance_claims(pet_id);

-- =============================================================================
-- CONVERSATIONS & MESSAGES
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_client_id
ON conversations(client_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_pet_id
ON conversations(pet_id) WHERE pet_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id
ON messages(sender_id);

-- =============================================================================
-- REMINDERS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_client_id
ON reminders(client_id) WHERE client_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reminders_pet_id
ON reminders(pet_id) WHERE pet_id IS NOT NULL;

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id
ON notifications(user_id);

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id
ON audit_logs(user_id) WHERE user_id IS NOT NULL;

-- =============================================================================
-- STAFF TIME OFF
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_time_off_staff_id
ON staff_time_off(staff_id);

-- =============================================================================
-- QR TAGS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qr_tags_pet_id
ON qr_tags(pet_id) WHERE pet_id IS NOT NULL;

-- =============================================================================
-- LOST PETS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lost_pets_pet_id
ON lost_pets(pet_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lost_pets_reported_by
ON lost_pets(reported_by) WHERE reported_by IS NOT NULL;

-- =============================================================================
-- LOYALTY TRANSACTIONS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loyalty_transactions_user_id
ON loyalty_transactions(user_id);

-- =============================================================================
-- EXPENSES
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_created_by
ON expenses(created_by) WHERE created_by IS NOT NULL;

-- =============================================================================
-- GROWTH MEASUREMENTS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_growth_measurements_pet_id
ON growth_measurements(pet_id);

-- =============================================================================
-- REPRODUCTIVE CYCLES
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reproductive_cycles_pet_id
ON reproductive_cycles(pet_id);

-- =============================================================================
-- EUTHANASIA ASSESSMENTS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_euthanasia_assessments_pet_id
ON euthanasia_assessments(pet_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_euthanasia_assessments_assessed_by
ON euthanasia_assessments(assessed_by);

-- =============================================================================
-- DISEASE REPORTS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disease_reports_diagnosis_code_id
ON disease_reports(diagnosis_code_id) WHERE diagnosis_code_id IS NOT NULL;

-- =============================================================================
-- INVENTORY TRANSACTIONS
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_transactions_product_id
ON store_inventory_transactions(product_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_transactions_performed_by
ON store_inventory_transactions(performed_by) WHERE performed_by IS NOT NULL;

-- =============================================================================
-- PROFILES
-- =============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_id
ON profiles(id);

-- =============================================================================
-- ANALYZE ALL AFFECTED TABLES
-- =============================================================================
-- This updates statistics so the query planner uses the new indexes
ANALYZE pets;
ANALYZE medical_records;
ANALYZE vaccines;
ANALYZE vaccine_reactions;
ANALYZE prescriptions;
ANALYZE appointments;
ANALYZE hospitalizations;
ANALYZE hospitalization_medications;
ANALYZE hospitalization_feedings;
ANALYZE invoices;
ANALYZE invoice_items;
ANALYZE payments;
ANALYZE store_products;
ANALYZE store_inventory;
ANALYZE store_orders;
ANALYZE store_order_items;
ANALYZE store_reviews;
ANALYZE store_wishlists;
ANALYZE store_carts;
ANALYZE store_subscriptions;
ANALYZE store_campaign_items;
ANALYZE lab_orders;
ANALYZE lab_order_items;
ANALYZE lab_results;
ANALYZE consent_documents;
ANALYZE insurance_policies;
ANALYZE insurance_claims;
ANALYZE conversations;
ANALYZE messages;
ANALYZE reminders;
ANALYZE notifications;
ANALYZE audit_logs;
ANALYZE staff_time_off;
ANALYZE qr_tags;
ANALYZE lost_pets;
ANALYZE loyalty_transactions;
ANALYZE expenses;
ANALYZE growth_measurements;
ANALYZE reproductive_cycles;
ANALYZE euthanasia_assessments;
ANALYZE disease_reports;
