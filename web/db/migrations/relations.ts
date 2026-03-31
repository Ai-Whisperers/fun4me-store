import { relations } from 'drizzle-orm/relations'
import {
  profiles,
  diagnosisCodes,
  drugDosages,
  growthStandards,
  reproductiveCycles,
  tenants,
  euthanasiaAssessments,
  consentTemplates,
  medicalRecords,
  prescriptions,
  services,
  appointments,
  suppliers,
  usersInAuth,
  hospitalizationDocuments,
  storeCategories,
  storeBrands,
  storeProducts,
  storeInventory,
  labTestPanels,
  labPanelTests,
  storeCampaigns,
  storeCoupons,
  storeOrders,
  storeOrderItems,
  consentAuditLog,
  consentRequests,
  blanketConsents,
  storeReviews,
  storeWishlist,
  procurementLeads,
  paymentMethods,
  timeOffRequests,
  staffTasks,
  staffReviews,
  invoices,
  invoiceItems,
  payments,
  refunds,
  expenses,
  expenseCategories,
  loyaltyPoints,
  loyaltyTransactions,
  kennels,
  hospitalizations,
  hospitalizationVitals,
  hospitalizationMedications,
  hospitalizationTreatments,
  hospitalizationFeedings,
  labResultComments,
  labOrders,
  labTestCatalog,
  labPanels,
  labOrderItems,
  labResults,
  labResultAttachments,
  insurancePolicies,
  insuranceProviders,
  insuranceClaims,
  insuranceClaimItems,
  conversations,
  messages,
  messageTemplates,
  reminders,
  staffProfiles,
  staffSchedules,
  staffScheduleEntries,
  timeOffTypes,
  staffTimeOff,
} from './schema'

export const diagnosisCodesRelations = relations(diagnosisCodes, ({ one }) => ({
  profile: one(profiles, {
    fields: [diagnosisCodes.deletedBy],
    references: [profiles.id],
  }),
}))

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  diagnosisCodes: many(diagnosisCodes),
  drugDosages: many(drugDosages),
  growthStandards: many(growthStandards),
  reproductiveCycles_deletedBy: many(reproductiveCycles, {
    relationName: 'reproductiveCycles_deletedBy_profiles_id',
  }),
  reproductiveCycles_recordedBy: many(reproductiveCycles, {
    relationName: 'reproductiveCycles_recordedBy_profiles_id',
  }),
  euthanasiaAssessments_assessedBy: many(euthanasiaAssessments, {
    relationName: 'euthanasiaAssessments_assessedBy_profiles_id',
  }),
  euthanasiaAssessments_deletedBy: many(euthanasiaAssessments, {
    relationName: 'euthanasiaAssessments_deletedBy_profiles_id',
  }),
  consentTemplates_createdBy: many(consentTemplates, {
    relationName: 'consentTemplates_createdBy_profiles_id',
  }),
  consentTemplates_deletedBy: many(consentTemplates, {
    relationName: 'consentTemplates_deletedBy_profiles_id',
  }),
  consentTemplates_updatedBy: many(consentTemplates, {
    relationName: 'consentTemplates_updatedBy_profiles_id',
  }),
  medicalRecords_deletedBy: many(medicalRecords, {
    relationName: 'medicalRecords_deletedBy_profiles_id',
  }),
  medicalRecords_vetId: many(medicalRecords, {
    relationName: 'medicalRecords_vetId_profiles_id',
  }),
  prescriptions_deletedBy: many(prescriptions, {
    relationName: 'prescriptions_deletedBy_profiles_id',
  }),
  prescriptions_dispensedBy: many(prescriptions, {
    relationName: 'prescriptions_dispensedBy_profiles_id',
  }),
  prescriptions_vetId: many(prescriptions, {
    relationName: 'prescriptions_vetId_profiles_id',
  }),
  services: many(services),
  appointments_cancelledBy: many(appointments, {
    relationName: 'appointments_cancelledBy_profiles_id',
  }),
  appointments_createdBy: many(appointments, {
    relationName: 'appointments_createdBy_profiles_id',
  }),
  appointments_deletedBy: many(appointments, {
    relationName: 'appointments_deletedBy_profiles_id',
  }),
  appointments_vetId: many(appointments, {
    relationName: 'appointments_vetId_profiles_id',
  }),
  suppliers_deletedBy: many(suppliers, {
    relationName: 'suppliers_deletedBy_profiles_id',
  }),
  suppliers_verifiedBy: many(suppliers, {
    relationName: 'suppliers_verifiedBy_profiles_id',
  }),
  storeCategories: many(storeCategories),
  storeBrands: many(storeBrands),
  storeProducts_deletedBy: many(storeProducts, {
    relationName: 'storeProducts_deletedBy_profiles_id',
  }),
  storeProducts_verifiedBy: many(storeProducts, {
    relationName: 'storeProducts_verifiedBy_profiles_id',
  }),
  storeCampaigns: many(storeCampaigns),
  storeCoupons: many(storeCoupons),
  storeOrders_cancelledBy: many(storeOrders, {
    relationName: 'storeOrders_cancelledBy_profiles_id',
  }),
  storeOrders_customerId: many(storeOrders, {
    relationName: 'storeOrders_customerId_profiles_id',
  }),
  storeOrders_deletedBy: many(storeOrders, {
    relationName: 'storeOrders_deletedBy_profiles_id',
  }),
  storeReviews_approvedBy: many(storeReviews, {
    relationName: 'storeReviews_approvedBy_profiles_id',
  }),
  storeReviews_customerId: many(storeReviews, {
    relationName: 'storeReviews_customerId_profiles_id',
  }),
  storeWishlists: many(storeWishlist),
  procurementLeads_convertedBy: many(procurementLeads, {
    relationName: 'procurementLeads_convertedBy_profiles_id',
  }),
  procurementLeads_processedBy: many(procurementLeads, {
    relationName: 'procurementLeads_processedBy_profiles_id',
  }),
  paymentMethods: many(paymentMethods),
  invoices_clientId: many(invoices, {
    relationName: 'invoices_clientId_profiles_id',
  }),
  invoices_deletedBy: many(invoices, {
    relationName: 'invoices_deletedBy_profiles_id',
  }),
  payments: many(payments),
  refunds: many(refunds),
  expenses_approvedBy: many(expenses, {
    relationName: 'expenses_approvedBy_profiles_id',
  }),
  expenses_createdBy: many(expenses, {
    relationName: 'expenses_createdBy_profiles_id',
  }),
  expenses_deletedBy: many(expenses, {
    relationName: 'expenses_deletedBy_profiles_id',
  }),
  loyaltyPoints: many(loyaltyPoints),
  loyaltyTransactions: many(loyaltyTransactions),
  kennels: many(kennels),
  hospitalizations_admittedBy: many(hospitalizations, {
    relationName: 'hospitalizations_admittedBy_profiles_id',
  }),
  hospitalizations_deletedBy: many(hospitalizations, {
    relationName: 'hospitalizations_deletedBy_profiles_id',
  }),
  hospitalizations_dischargedBy: many(hospitalizations, {
    relationName: 'hospitalizations_dischargedBy_profiles_id',
  }),
  hospitalizations_primaryVetId: many(hospitalizations, {
    relationName: 'hospitalizations_primaryVetId_profiles_id',
  }),
  hospitalizationVitals: many(hospitalizationVitals),
  hospitalizationMedications: many(hospitalizationMedications),
  hospitalizationTreatments: many(hospitalizationTreatments),
  hospitalizationFeedings: many(hospitalizationFeedings),
  labResultComments: many(labResultComments),
  labTestCatalogs: many(labTestCatalog),
  labPanels: many(labPanels),
  labOrders_collectedBy: many(labOrders, {
    relationName: 'labOrders_collectedBy_profiles_id',
  }),
  labOrders_deletedBy: many(labOrders, {
    relationName: 'labOrders_deletedBy_profiles_id',
  }),
  labOrders_orderedBy: many(labOrders, {
    relationName: 'labOrders_orderedBy_profiles_id',
  }),
  labOrders_reviewedBy: many(labOrders, {
    relationName: 'labOrders_reviewedBy_profiles_id',
  }),
  labResults: many(labResults),
  labResultAttachments: many(labResultAttachments),
  insurancePolicies: many(insurancePolicies),
  insuranceClaims_deletedBy: many(insuranceClaims, {
    relationName: 'insuranceClaims_deletedBy_profiles_id',
  }),
  insuranceClaims_submittedBy: many(insuranceClaims, {
    relationName: 'insuranceClaims_submittedBy_profiles_id',
  }),
  conversations_assignedTo: many(conversations, {
    relationName: 'conversations_assignedTo_profiles_id',
  }),
  conversations_clientId: many(conversations, {
    relationName: 'conversations_clientId_profiles_id',
  }),
  conversations_deletedBy: many(conversations, {
    relationName: 'conversations_deletedBy_profiles_id',
  }),
  messages: many(messages),
  reminders_clientId: many(reminders, {
    relationName: 'reminders_clientId_profiles_id',
  }),
  reminders_deletedBy: many(reminders, {
    relationName: 'reminders_deletedBy_profiles_id',
  }),
  staffProfiles_deletedBy: many(staffProfiles, {
    relationName: 'staffProfiles_deletedBy_profiles_id',
  }),
  staffProfiles_profileId: many(staffProfiles, {
    relationName: 'staffProfiles_profileId_profiles_id',
  }),
  staffTimeOffs: many(staffTimeOff),
  profile: one(profiles, {
    fields: [profiles.deletedBy],
    references: [profiles.id],
    relationName: 'profiles_deletedBy_profiles_id',
  }),
  profiles: many(profiles, {
    relationName: 'profiles_deletedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [profiles.tenantId],
    references: [tenants.id],
  }),
}))

export const drugDosagesRelations = relations(drugDosages, ({ one }) => ({
  profile: one(profiles, {
    fields: [drugDosages.deletedBy],
    references: [profiles.id],
  }),
}))

export const growthStandardsRelations = relations(growthStandards, ({ one }) => ({
  profile: one(profiles, {
    fields: [growthStandards.deletedBy],
    references: [profiles.id],
  }),
}))

export const reproductiveCyclesRelations = relations(reproductiveCycles, ({ one }) => ({
  profile_deletedBy: one(profiles, {
    fields: [reproductiveCycles.deletedBy],
    references: [profiles.id],
    relationName: 'reproductiveCycles_deletedBy_profiles_id',
  }),
  profile_recordedBy: one(profiles, {
    fields: [reproductiveCycles.recordedBy],
    references: [profiles.id],
    relationName: 'reproductiveCycles_recordedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [reproductiveCycles.tenantId],
    references: [tenants.id],
  }),
}))

export const tenantsRelations = relations(tenants, ({ many }) => ({
  reproductiveCycles: many(reproductiveCycles),
  euthanasiaAssessments: many(euthanasiaAssessments),
  consentTemplates: many(consentTemplates),
  medicalRecords: many(medicalRecords),
  prescriptions: many(prescriptions),
  services: many(services),
  appointments: many(appointments),
  suppliers: many(suppliers),
  storeCategories_createdByTenantId: many(storeCategories, {
    relationName: 'storeCategories_createdByTenantId_tenants_id',
  }),
  storeCategories_tenantId: many(storeCategories, {
    relationName: 'storeCategories_tenantId_tenants_id',
  }),
  storeBrands_createdByTenantId: many(storeBrands, {
    relationName: 'storeBrands_createdByTenantId_tenants_id',
  }),
  storeBrands_tenantId: many(storeBrands, {
    relationName: 'storeBrands_tenantId_tenants_id',
  }),
  storeProducts_createdByTenantId: many(storeProducts, {
    relationName: 'storeProducts_createdByTenantId_tenants_id',
  }),
  storeProducts_tenantId: many(storeProducts, {
    relationName: 'storeProducts_tenantId_tenants_id',
  }),
  storeInventories: many(storeInventory),
  storeCampaigns: many(storeCampaigns),
  storeCoupons: many(storeCoupons),
  storeOrders: many(storeOrders),
  storeOrderItems: many(storeOrderItems),
  storeReviews: many(storeReviews),
  storeWishlists: many(storeWishlist),
  procurementLeads: many(procurementLeads),
  paymentMethods: many(paymentMethods),
  invoices: many(invoices),
  invoiceItems: many(invoiceItems),
  payments: many(payments),
  refunds: many(refunds),
  expenses: many(expenses),
  expenseCategories: many(expenseCategories),
  loyaltyPoints: many(loyaltyPoints),
  loyaltyTransactions: many(loyaltyTransactions),
  kennels: many(kennels),
  hospitalizations: many(hospitalizations),
  hospitalizationVitals: many(hospitalizationVitals),
  hospitalizationMedications: many(hospitalizationMedications),
  hospitalizationTreatments: many(hospitalizationTreatments),
  hospitalizationFeedings: many(hospitalizationFeedings),
  labResultComments: many(labResultComments),
  labTestCatalogs: many(labTestCatalog),
  labPanels: many(labPanels),
  labOrders: many(labOrders),
  labOrderItems: many(labOrderItems),
  labResults: many(labResults),
  labResultAttachments: many(labResultAttachments),
  insurancePolicies: many(insurancePolicies),
  insuranceClaims: many(insuranceClaims),
  insuranceClaimItems: many(insuranceClaimItems),
  conversations: many(conversations),
  messages: many(messages),
  messageTemplates: many(messageTemplates),
  reminders: many(reminders),
  staffProfiles: many(staffProfiles),
  staffSchedules: many(staffSchedules),
  staffScheduleEntries: many(staffScheduleEntries),
  timeOffTypes: many(timeOffTypes),
  staffTimeOffs: many(staffTimeOff),
  profiles: many(profiles),
}))

export const euthanasiaAssessmentsRelations = relations(euthanasiaAssessments, ({ one }) => ({
  profile_assessedBy: one(profiles, {
    fields: [euthanasiaAssessments.assessedBy],
    references: [profiles.id],
    relationName: 'euthanasiaAssessments_assessedBy_profiles_id',
  }),
  profile_deletedBy: one(profiles, {
    fields: [euthanasiaAssessments.deletedBy],
    references: [profiles.id],
    relationName: 'euthanasiaAssessments_deletedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [euthanasiaAssessments.tenantId],
    references: [tenants.id],
  }),
}))

export const consentTemplatesRelations = relations(consentTemplates, ({ one }) => ({
  profile_createdBy: one(profiles, {
    fields: [consentTemplates.createdBy],
    references: [profiles.id],
    relationName: 'consentTemplates_createdBy_profiles_id',
  }),
  profile_deletedBy: one(profiles, {
    fields: [consentTemplates.deletedBy],
    references: [profiles.id],
    relationName: 'consentTemplates_deletedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [consentTemplates.tenantId],
    references: [tenants.id],
  }),
  profile_updatedBy: one(profiles, {
    fields: [consentTemplates.updatedBy],
    references: [profiles.id],
    relationName: 'consentTemplates_updatedBy_profiles_id',
  }),
}))

export const medicalRecordsRelations = relations(medicalRecords, ({ one, many }) => ({
  profile_deletedBy: one(profiles, {
    fields: [medicalRecords.deletedBy],
    references: [profiles.id],
    relationName: 'medicalRecords_deletedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [medicalRecords.tenantId],
    references: [tenants.id],
  }),
  profile_vetId: one(profiles, {
    fields: [medicalRecords.vetId],
    references: [profiles.id],
    relationName: 'medicalRecords_vetId_profiles_id',
  }),
  prescriptions: many(prescriptions),
  labOrders: many(labOrders),
  insuranceClaims: many(insuranceClaims),
}))

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  profile_deletedBy: one(profiles, {
    fields: [prescriptions.deletedBy],
    references: [profiles.id],
    relationName: 'prescriptions_deletedBy_profiles_id',
  }),
  profile_dispensedBy: one(profiles, {
    fields: [prescriptions.dispensedBy],
    references: [profiles.id],
    relationName: 'prescriptions_dispensedBy_profiles_id',
  }),
  medicalRecord: one(medicalRecords, {
    fields: [prescriptions.medicalRecordId],
    references: [medicalRecords.id],
  }),
  tenant: one(tenants, {
    fields: [prescriptions.tenantId],
    references: [tenants.id],
  }),
  profile_vetId: one(profiles, {
    fields: [prescriptions.vetId],
    references: [profiles.id],
    relationName: 'prescriptions_vetId_profiles_id',
  }),
}))

export const servicesRelations = relations(services, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [services.deletedBy],
    references: [profiles.id],
  }),
  tenant: one(tenants, {
    fields: [services.tenantId],
    references: [tenants.id],
  }),
  appointments: many(appointments),
  invoiceItems: many(invoiceItems),
  insuranceClaimItems: many(insuranceClaimItems),
}))

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  profile_cancelledBy: one(profiles, {
    fields: [appointments.cancelledBy],
    references: [profiles.id],
    relationName: 'appointments_cancelledBy_profiles_id',
  }),
  profile_createdBy: one(profiles, {
    fields: [appointments.createdBy],
    references: [profiles.id],
    relationName: 'appointments_createdBy_profiles_id',
  }),
  profile_deletedBy: one(profiles, {
    fields: [appointments.deletedBy],
    references: [profiles.id],
    relationName: 'appointments_deletedBy_profiles_id',
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  tenant: one(tenants, {
    fields: [appointments.tenantId],
    references: [tenants.id],
  }),
  profile_vetId: one(profiles, {
    fields: [appointments.vetId],
    references: [profiles.id],
    relationName: 'appointments_vetId_profiles_id',
  }),
  invoices: many(invoices),
  conversations: many(conversations),
}))

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  profile_deletedBy: one(profiles, {
    fields: [suppliers.deletedBy],
    references: [profiles.id],
    relationName: 'suppliers_deletedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [suppliers.tenantId],
    references: [tenants.id],
  }),
  profile_verifiedBy: one(profiles, {
    fields: [suppliers.verifiedBy],
    references: [profiles.id],
    relationName: 'suppliers_verifiedBy_profiles_id',
  }),
  storeProducts: many(storeProducts),
  procurementLeads: many(procurementLeads),
}))

export const hospitalizationDocumentsRelations = relations(hospitalizationDocuments, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [hospitalizationDocuments.uploadedBy],
    references: [usersInAuth.id],
  }),
}))

export const usersInAuthRelations = relations(usersInAuth, ({ many }) => ({
  hospitalizationDocuments: many(hospitalizationDocuments),
  consentAuditLogs: many(consentAuditLog),
  consentRequests: many(consentRequests),
  blanketConsents: many(blanketConsents),
  timeOffRequests: many(timeOffRequests),
  staffTasks_assignedBy: many(staffTasks, {
    relationName: 'staffTasks_assignedBy_usersInAuth_id',
  }),
  staffTasks_completedBy: many(staffTasks, {
    relationName: 'staffTasks_completedBy_usersInAuth_id',
  }),
  staffReviews: many(staffReviews),
}))

export const storeCategoriesRelations = relations(storeCategories, ({ one, many }) => ({
  tenant_createdByTenantId: one(tenants, {
    fields: [storeCategories.createdByTenantId],
    references: [tenants.id],
    relationName: 'storeCategories_createdByTenantId_tenants_id',
  }),
  profile: one(profiles, {
    fields: [storeCategories.deletedBy],
    references: [profiles.id],
  }),
  storeCategory: one(storeCategories, {
    fields: [storeCategories.parentId],
    references: [storeCategories.id],
    relationName: 'storeCategories_parentId_storeCategories_id',
  }),
  storeCategories: many(storeCategories, {
    relationName: 'storeCategories_parentId_storeCategories_id',
  }),
  tenant_tenantId: one(tenants, {
    fields: [storeCategories.tenantId],
    references: [tenants.id],
    relationName: 'storeCategories_tenantId_tenants_id',
  }),
  storeProducts: many(storeProducts),
  procurementLeads: many(procurementLeads),
}))

export const storeBrandsRelations = relations(storeBrands, ({ one, many }) => ({
  tenant_createdByTenantId: one(tenants, {
    fields: [storeBrands.createdByTenantId],
    references: [tenants.id],
    relationName: 'storeBrands_createdByTenantId_tenants_id',
  }),
  profile: one(profiles, {
    fields: [storeBrands.deletedBy],
    references: [profiles.id],
  }),
  tenant_tenantId: one(tenants, {
    fields: [storeBrands.tenantId],
    references: [tenants.id],
    relationName: 'storeBrands_tenantId_tenants_id',
  }),
  storeProducts: many(storeProducts),
  procurementLeads: many(procurementLeads),
}))

export const storeProductsRelations = relations(storeProducts, ({ one, many }) => ({
  storeBrand: one(storeBrands, {
    fields: [storeProducts.brandId],
    references: [storeBrands.id],
  }),
  storeCategory: one(storeCategories, {
    fields: [storeProducts.categoryId],
    references: [storeCategories.id],
  }),
  tenant_createdByTenantId: one(tenants, {
    fields: [storeProducts.createdByTenantId],
    references: [tenants.id],
    relationName: 'storeProducts_createdByTenantId_tenants_id',
  }),
  supplier: one(suppliers, {
    fields: [storeProducts.defaultSupplierId],
    references: [suppliers.id],
  }),
  profile_deletedBy: one(profiles, {
    fields: [storeProducts.deletedBy],
    references: [profiles.id],
    relationName: 'storeProducts_deletedBy_profiles_id',
  }),
  tenant_tenantId: one(tenants, {
    fields: [storeProducts.tenantId],
    references: [tenants.id],
    relationName: 'storeProducts_tenantId_tenants_id',
  }),
  profile_verifiedBy: one(profiles, {
    fields: [storeProducts.verifiedBy],
    references: [profiles.id],
    relationName: 'storeProducts_verifiedBy_profiles_id',
  }),
  storeInventories: many(storeInventory),
  storeOrderItems: many(storeOrderItems),
  storeReviews: many(storeReviews),
  storeWishlists: many(storeWishlist),
  procurementLeads_convertedProductId: many(procurementLeads, {
    relationName: 'procurementLeads_convertedProductId_storeProducts_id',
  }),
  procurementLeads_matchedProductId: many(procurementLeads, {
    relationName: 'procurementLeads_matchedProductId_storeProducts_id',
  }),
  invoiceItems: many(invoiceItems),
}))

export const storeInventoryRelations = relations(storeInventory, ({ one }) => ({
  storeProduct: one(storeProducts, {
    fields: [storeInventory.productId],
    references: [storeProducts.id],
  }),
  tenant: one(tenants, {
    fields: [storeInventory.tenantId],
    references: [tenants.id],
  }),
}))

export const labPanelTestsRelations = relations(labPanelTests, ({ one }) => ({
  labTestPanel: one(labTestPanels, {
    fields: [labPanelTests.panelId],
    references: [labTestPanels.id],
  }),
}))

export const labTestPanelsRelations = relations(labTestPanels, ({ many }) => ({
  labPanelTests: many(labPanelTests),
}))

export const storeCampaignsRelations = relations(storeCampaigns, ({ one }) => ({
  profile: one(profiles, {
    fields: [storeCampaigns.deletedBy],
    references: [profiles.id],
  }),
  tenant: one(tenants, {
    fields: [storeCampaigns.tenantId],
    references: [tenants.id],
  }),
}))

export const storeCouponsRelations = relations(storeCoupons, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [storeCoupons.createdBy],
    references: [profiles.id],
  }),
  tenant: one(tenants, {
    fields: [storeCoupons.tenantId],
    references: [tenants.id],
  }),
  storeOrders: many(storeOrders),
}))

export const storeOrdersRelations = relations(storeOrders, ({ one, many }) => ({
  profile_cancelledBy: one(profiles, {
    fields: [storeOrders.cancelledBy],
    references: [profiles.id],
    relationName: 'storeOrders_cancelledBy_profiles_id',
  }),
  storeCoupon: one(storeCoupons, {
    fields: [storeOrders.couponId],
    references: [storeCoupons.id],
  }),
  profile_customerId: one(profiles, {
    fields: [storeOrders.customerId],
    references: [profiles.id],
    relationName: 'storeOrders_customerId_profiles_id',
  }),
  profile_deletedBy: one(profiles, {
    fields: [storeOrders.deletedBy],
    references: [profiles.id],
    relationName: 'storeOrders_deletedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [storeOrders.tenantId],
    references: [tenants.id],
  }),
  storeOrderItems: many(storeOrderItems),
  storeReviews: many(storeReviews),
}))

export const storeOrderItemsRelations = relations(storeOrderItems, ({ one }) => ({
  storeOrder: one(storeOrders, {
    fields: [storeOrderItems.orderId],
    references: [storeOrders.id],
  }),
  storeProduct: one(storeProducts, {
    fields: [storeOrderItems.productId],
    references: [storeProducts.id],
  }),
  tenant: one(tenants, {
    fields: [storeOrderItems.tenantId],
    references: [tenants.id],
  }),
}))

export const consentAuditLogRelations = relations(consentAuditLog, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [consentAuditLog.performedBy],
    references: [usersInAuth.id],
  }),
}))

export const consentRequestsRelations = relations(consentRequests, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [consentRequests.requestedBy],
    references: [usersInAuth.id],
  }),
}))

export const blanketConsentsRelations = relations(blanketConsents, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [blanketConsents.ownerId],
    references: [usersInAuth.id],
  }),
}))

export const storeReviewsRelations = relations(storeReviews, ({ one }) => ({
  profile_approvedBy: one(profiles, {
    fields: [storeReviews.approvedBy],
    references: [profiles.id],
    relationName: 'storeReviews_approvedBy_profiles_id',
  }),
  profile_customerId: one(profiles, {
    fields: [storeReviews.customerId],
    references: [profiles.id],
    relationName: 'storeReviews_customerId_profiles_id',
  }),
  storeOrder: one(storeOrders, {
    fields: [storeReviews.orderId],
    references: [storeOrders.id],
  }),
  storeProduct: one(storeProducts, {
    fields: [storeReviews.productId],
    references: [storeProducts.id],
  }),
  tenant: one(tenants, {
    fields: [storeReviews.tenantId],
    references: [tenants.id],
  }),
}))

export const storeWishlistRelations = relations(storeWishlist, ({ one }) => ({
  profile: one(profiles, {
    fields: [storeWishlist.customerId],
    references: [profiles.id],
  }),
  storeProduct: one(storeProducts, {
    fields: [storeWishlist.productId],
    references: [storeProducts.id],
  }),
  tenant: one(tenants, {
    fields: [storeWishlist.tenantId],
    references: [tenants.id],
  }),
}))

export const procurementLeadsRelations = relations(procurementLeads, ({ one }) => ({
  profile_convertedBy: one(profiles, {
    fields: [procurementLeads.convertedBy],
    references: [profiles.id],
    relationName: 'procurementLeads_convertedBy_profiles_id',
  }),
  storeProduct_convertedProductId: one(storeProducts, {
    fields: [procurementLeads.convertedProductId],
    references: [storeProducts.id],
    relationName: 'procurementLeads_convertedProductId_storeProducts_id',
  }),
  storeBrand: one(storeBrands, {
    fields: [procurementLeads.matchedBrandId],
    references: [storeBrands.id],
  }),
  storeCategory: one(storeCategories, {
    fields: [procurementLeads.matchedCategoryId],
    references: [storeCategories.id],
  }),
  storeProduct_matchedProductId: one(storeProducts, {
    fields: [procurementLeads.matchedProductId],
    references: [storeProducts.id],
    relationName: 'procurementLeads_matchedProductId_storeProducts_id',
  }),
  supplier: one(suppliers, {
    fields: [procurementLeads.matchedSupplierId],
    references: [suppliers.id],
  }),
  profile_processedBy: one(profiles, {
    fields: [procurementLeads.processedBy],
    references: [profiles.id],
    relationName: 'procurementLeads_processedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [procurementLeads.tenantId],
    references: [tenants.id],
  }),
}))

export const paymentMethodsRelations = relations(paymentMethods, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [paymentMethods.deletedBy],
    references: [profiles.id],
  }),
  tenant: one(tenants, {
    fields: [paymentMethods.tenantId],
    references: [tenants.id],
  }),
  payments: many(payments),
}))

export const timeOffRequestsRelations = relations(timeOffRequests, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [timeOffRequests.reviewedBy],
    references: [usersInAuth.id],
  }),
}))

export const staffTasksRelations = relations(staffTasks, ({ one }) => ({
  usersInAuth_assignedBy: one(usersInAuth, {
    fields: [staffTasks.assignedBy],
    references: [usersInAuth.id],
    relationName: 'staffTasks_assignedBy_usersInAuth_id',
  }),
  usersInAuth_completedBy: one(usersInAuth, {
    fields: [staffTasks.completedBy],
    references: [usersInAuth.id],
    relationName: 'staffTasks_completedBy_usersInAuth_id',
  }),
}))

export const staffReviewsRelations = relations(staffReviews, ({ one }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [staffReviews.reviewedBy],
    references: [usersInAuth.id],
  }),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  appointment: one(appointments, {
    fields: [invoices.appointmentId],
    references: [appointments.id],
  }),
  profile_clientId: one(profiles, {
    fields: [invoices.clientId],
    references: [profiles.id],
    relationName: 'invoices_clientId_profiles_id',
  }),
  profile_deletedBy: one(profiles, {
    fields: [invoices.deletedBy],
    references: [profiles.id],
    relationName: 'invoices_deletedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
  invoiceItems: many(invoiceItems),
  payments: many(payments),
  loyaltyTransactions: many(loyaltyTransactions),
  hospitalizations: many(hospitalizations),
  insuranceClaims: many(insuranceClaims),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  storeProduct: one(storeProducts, {
    fields: [invoiceItems.productId],
    references: [storeProducts.id],
  }),
  service: one(services, {
    fields: [invoiceItems.serviceId],
    references: [services.id],
  }),
  tenant: one(tenants, {
    fields: [invoiceItems.tenantId],
    references: [tenants.id],
  }),
}))

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [payments.paymentMethodId],
    references: [paymentMethods.id],
  }),
  profile: one(profiles, {
    fields: [payments.receivedBy],
    references: [profiles.id],
  }),
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  refunds: many(refunds),
}))

export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, {
    fields: [refunds.paymentId],
    references: [payments.id],
  }),
  profile: one(profiles, {
    fields: [refunds.processedBy],
    references: [profiles.id],
  }),
  tenant: one(tenants, {
    fields: [refunds.tenantId],
    references: [tenants.id],
  }),
}))

export const expensesRelations = relations(expenses, ({ one }) => ({
  profile_approvedBy: one(profiles, {
    fields: [expenses.approvedBy],
    references: [profiles.id],
    relationName: 'expenses_approvedBy_profiles_id',
  }),
  profile_createdBy: one(profiles, {
    fields: [expenses.createdBy],
    references: [profiles.id],
    relationName: 'expenses_createdBy_profiles_id',
  }),
  profile_deletedBy: one(profiles, {
    fields: [expenses.deletedBy],
    references: [profiles.id],
    relationName: 'expenses_deletedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [expenses.tenantId],
    references: [tenants.id],
  }),
}))

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  expenseCategory: one(expenseCategories, {
    fields: [expenseCategories.parentId],
    references: [expenseCategories.id],
    relationName: 'expenseCategories_parentId_expenseCategories_id',
  }),
  expenseCategories: many(expenseCategories, {
    relationName: 'expenseCategories_parentId_expenseCategories_id',
  }),
  tenant: one(tenants, {
    fields: [expenseCategories.tenantId],
    references: [tenants.id],
  }),
}))

export const loyaltyPointsRelations = relations(loyaltyPoints, ({ one }) => ({
  profile: one(profiles, {
    fields: [loyaltyPoints.clientId],
    references: [profiles.id],
  }),
  tenant: one(tenants, {
    fields: [loyaltyPoints.tenantId],
    references: [tenants.id],
  }),
}))

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  profile: one(profiles, {
    fields: [loyaltyTransactions.clientId],
    references: [profiles.id],
  }),
  invoice: one(invoices, {
    fields: [loyaltyTransactions.invoiceId],
    references: [invoices.id],
  }),
  tenant: one(tenants, {
    fields: [loyaltyTransactions.tenantId],
    references: [tenants.id],
  }),
}))

export const kennelsRelations = relations(kennels, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [kennels.deletedBy],
    references: [profiles.id],
  }),
  tenant: one(tenants, {
    fields: [kennels.tenantId],
    references: [tenants.id],
  }),
  hospitalizations: many(hospitalizations),
}))

export const hospitalizationsRelations = relations(hospitalizations, ({ one, many }) => ({
  profile_admittedBy: one(profiles, {
    fields: [hospitalizations.admittedBy],
    references: [profiles.id],
    relationName: 'hospitalizations_admittedBy_profiles_id',
  }),
  profile_deletedBy: one(profiles, {
    fields: [hospitalizations.deletedBy],
    references: [profiles.id],
    relationName: 'hospitalizations_deletedBy_profiles_id',
  }),
  profile_dischargedBy: one(profiles, {
    fields: [hospitalizations.dischargedBy],
    references: [profiles.id],
    relationName: 'hospitalizations_dischargedBy_profiles_id',
  }),
  invoice: one(invoices, {
    fields: [hospitalizations.invoiceId],
    references: [invoices.id],
  }),
  kennel: one(kennels, {
    fields: [hospitalizations.kennelId],
    references: [kennels.id],
  }),
  profile_primaryVetId: one(profiles, {
    fields: [hospitalizations.primaryVetId],
    references: [profiles.id],
    relationName: 'hospitalizations_primaryVetId_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [hospitalizations.tenantId],
    references: [tenants.id],
  }),
  hospitalizationVitals: many(hospitalizationVitals),
  hospitalizationMedications: many(hospitalizationMedications),
  hospitalizationTreatments: many(hospitalizationTreatments),
  hospitalizationFeedings: many(hospitalizationFeedings),
}))

export const hospitalizationVitalsRelations = relations(hospitalizationVitals, ({ one }) => ({
  hospitalization: one(hospitalizations, {
    fields: [hospitalizationVitals.hospitalizationId],
    references: [hospitalizations.id],
  }),
  profile: one(profiles, {
    fields: [hospitalizationVitals.recordedBy],
    references: [profiles.id],
  }),
  tenant: one(tenants, {
    fields: [hospitalizationVitals.tenantId],
    references: [tenants.id],
  }),
}))

export const hospitalizationMedicationsRelations = relations(
  hospitalizationMedications,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [hospitalizationMedications.administeredBy],
      references: [profiles.id],
    }),
    hospitalization: one(hospitalizations, {
      fields: [hospitalizationMedications.hospitalizationId],
      references: [hospitalizations.id],
    }),
    tenant: one(tenants, {
      fields: [hospitalizationMedications.tenantId],
      references: [tenants.id],
    }),
  })
)

export const hospitalizationTreatmentsRelations = relations(
  hospitalizationTreatments,
  ({ one }) => ({
    hospitalization: one(hospitalizations, {
      fields: [hospitalizationTreatments.hospitalizationId],
      references: [hospitalizations.id],
    }),
    profile: one(profiles, {
      fields: [hospitalizationTreatments.performedBy],
      references: [profiles.id],
    }),
    tenant: one(tenants, {
      fields: [hospitalizationTreatments.tenantId],
      references: [tenants.id],
    }),
  })
)

export const hospitalizationFeedingsRelations = relations(hospitalizationFeedings, ({ one }) => ({
  profile: one(profiles, {
    fields: [hospitalizationFeedings.fedBy],
    references: [profiles.id],
  }),
  hospitalization: one(hospitalizations, {
    fields: [hospitalizationFeedings.hospitalizationId],
    references: [hospitalizations.id],
  }),
  tenant: one(tenants, {
    fields: [hospitalizationFeedings.tenantId],
    references: [tenants.id],
  }),
}))

export const labResultCommentsRelations = relations(labResultComments, ({ one }) => ({
  profile: one(profiles, {
    fields: [labResultComments.createdBy],
    references: [profiles.id],
  }),
  labOrder: one(labOrders, {
    fields: [labResultComments.labOrderId],
    references: [labOrders.id],
  }),
  tenant: one(tenants, {
    fields: [labResultComments.tenantId],
    references: [tenants.id],
  }),
}))

export const labOrdersRelations = relations(labOrders, ({ one, many }) => ({
  labResultComments: many(labResultComments),
  profile_collectedBy: one(profiles, {
    fields: [labOrders.collectedBy],
    references: [profiles.id],
    relationName: 'labOrders_collectedBy_profiles_id',
  }),
  profile_deletedBy: one(profiles, {
    fields: [labOrders.deletedBy],
    references: [profiles.id],
    relationName: 'labOrders_deletedBy_profiles_id',
  }),
  medicalRecord: one(medicalRecords, {
    fields: [labOrders.medicalRecordId],
    references: [medicalRecords.id],
  }),
  profile_orderedBy: one(profiles, {
    fields: [labOrders.orderedBy],
    references: [profiles.id],
    relationName: 'labOrders_orderedBy_profiles_id',
  }),
  profile_reviewedBy: one(profiles, {
    fields: [labOrders.reviewedBy],
    references: [profiles.id],
    relationName: 'labOrders_reviewedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [labOrders.tenantId],
    references: [tenants.id],
  }),
  labOrderItems: many(labOrderItems),
  labResults: many(labResults),
  labResultAttachments: many(labResultAttachments),
}))

export const labTestCatalogRelations = relations(labTestCatalog, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [labTestCatalog.deletedBy],
    references: [profiles.id],
  }),
  tenant: one(tenants, {
    fields: [labTestCatalog.tenantId],
    references: [tenants.id],
  }),
  labOrderItems: many(labOrderItems),
  labResults: many(labResults),
}))

export const labPanelsRelations = relations(labPanels, ({ one }) => ({
  profile: one(profiles, {
    fields: [labPanels.deletedBy],
    references: [profiles.id],
  }),
  tenant: one(tenants, {
    fields: [labPanels.tenantId],
    references: [tenants.id],
  }),
}))

export const labOrderItemsRelations = relations(labOrderItems, ({ one }) => ({
  labOrder: one(labOrders, {
    fields: [labOrderItems.labOrderId],
    references: [labOrders.id],
  }),
  tenant: one(tenants, {
    fields: [labOrderItems.tenantId],
    references: [tenants.id],
  }),
  labTestCatalog: one(labTestCatalog, {
    fields: [labOrderItems.testId],
    references: [labTestCatalog.id],
  }),
}))

export const labResultsRelations = relations(labResults, ({ one }) => ({
  profile: one(profiles, {
    fields: [labResults.enteredBy],
    references: [profiles.id],
  }),
  labOrder: one(labOrders, {
    fields: [labResults.labOrderId],
    references: [labOrders.id],
  }),
  tenant: one(tenants, {
    fields: [labResults.tenantId],
    references: [tenants.id],
  }),
  labTestCatalog: one(labTestCatalog, {
    fields: [labResults.testId],
    references: [labTestCatalog.id],
  }),
}))

export const labResultAttachmentsRelations = relations(labResultAttachments, ({ one }) => ({
  labOrder: one(labOrders, {
    fields: [labResultAttachments.labOrderId],
    references: [labOrders.id],
  }),
  tenant: one(tenants, {
    fields: [labResultAttachments.tenantId],
    references: [tenants.id],
  }),
  profile: one(profiles, {
    fields: [labResultAttachments.uploadedBy],
    references: [profiles.id],
  }),
}))

export const insurancePoliciesRelations = relations(insurancePolicies, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [insurancePolicies.deletedBy],
    references: [profiles.id],
  }),
  insuranceProvider: one(insuranceProviders, {
    fields: [insurancePolicies.providerId],
    references: [insuranceProviders.id],
  }),
  tenant: one(tenants, {
    fields: [insurancePolicies.tenantId],
    references: [tenants.id],
  }),
  insuranceClaims: many(insuranceClaims),
}))

export const insuranceProvidersRelations = relations(insuranceProviders, ({ many }) => ({
  insurancePolicies: many(insurancePolicies),
}))

export const insuranceClaimsRelations = relations(insuranceClaims, ({ one, many }) => ({
  profile_deletedBy: one(profiles, {
    fields: [insuranceClaims.deletedBy],
    references: [profiles.id],
    relationName: 'insuranceClaims_deletedBy_profiles_id',
  }),
  invoice: one(invoices, {
    fields: [insuranceClaims.invoiceId],
    references: [invoices.id],
  }),
  medicalRecord: one(medicalRecords, {
    fields: [insuranceClaims.medicalRecordId],
    references: [medicalRecords.id],
  }),
  insurancePolicy: one(insurancePolicies, {
    fields: [insuranceClaims.policyId],
    references: [insurancePolicies.id],
  }),
  profile_submittedBy: one(profiles, {
    fields: [insuranceClaims.submittedBy],
    references: [profiles.id],
    relationName: 'insuranceClaims_submittedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [insuranceClaims.tenantId],
    references: [tenants.id],
  }),
  insuranceClaimItems: many(insuranceClaimItems),
}))

export const insuranceClaimItemsRelations = relations(insuranceClaimItems, ({ one }) => ({
  insuranceClaim: one(insuranceClaims, {
    fields: [insuranceClaimItems.claimId],
    references: [insuranceClaims.id],
  }),
  service: one(services, {
    fields: [insuranceClaimItems.serviceId],
    references: [services.id],
  }),
  tenant: one(tenants, {
    fields: [insuranceClaimItems.tenantId],
    references: [tenants.id],
  }),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  appointment: one(appointments, {
    fields: [conversations.appointmentId],
    references: [appointments.id],
  }),
  profile_assignedTo: one(profiles, {
    fields: [conversations.assignedTo],
    references: [profiles.id],
    relationName: 'conversations_assignedTo_profiles_id',
  }),
  profile_clientId: one(profiles, {
    fields: [conversations.clientId],
    references: [profiles.id],
    relationName: 'conversations_clientId_profiles_id',
  }),
  profile_deletedBy: one(profiles, {
    fields: [conversations.deletedBy],
    references: [profiles.id],
    relationName: 'conversations_deletedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [conversations.tenantId],
    references: [tenants.id],
  }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  message: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
    relationName: 'messages_replyToId_messages_id',
  }),
  messages: many(messages, {
    relationName: 'messages_replyToId_messages_id',
  }),
  profile: one(profiles, {
    fields: [messages.senderId],
    references: [profiles.id],
  }),
  tenant: one(tenants, {
    fields: [messages.tenantId],
    references: [tenants.id],
  }),
}))

export const messageTemplatesRelations = relations(messageTemplates, ({ one }) => ({
  tenant: one(tenants, {
    fields: [messageTemplates.tenantId],
    references: [tenants.id],
  }),
}))

export const remindersRelations = relations(reminders, ({ one }) => ({
  profile_clientId: one(profiles, {
    fields: [reminders.clientId],
    references: [profiles.id],
    relationName: 'reminders_clientId_profiles_id',
  }),
  profile_deletedBy: one(profiles, {
    fields: [reminders.deletedBy],
    references: [profiles.id],
    relationName: 'reminders_deletedBy_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [reminders.tenantId],
    references: [tenants.id],
  }),
}))

export const staffProfilesRelations = relations(staffProfiles, ({ one, many }) => ({
  profile_deletedBy: one(profiles, {
    fields: [staffProfiles.deletedBy],
    references: [profiles.id],
    relationName: 'staffProfiles_deletedBy_profiles_id',
  }),
  profile_profileId: one(profiles, {
    fields: [staffProfiles.profileId],
    references: [profiles.id],
    relationName: 'staffProfiles_profileId_profiles_id',
  }),
  tenant: one(tenants, {
    fields: [staffProfiles.tenantId],
    references: [tenants.id],
  }),
  staffSchedules: many(staffSchedules),
  staffTimeOffs: many(staffTimeOff),
}))

export const staffSchedulesRelations = relations(staffSchedules, ({ one, many }) => ({
  staffProfile: one(staffProfiles, {
    fields: [staffSchedules.staffId],
    references: [staffProfiles.id],
  }),
  tenant: one(tenants, {
    fields: [staffSchedules.tenantId],
    references: [tenants.id],
  }),
  staffScheduleEntries: many(staffScheduleEntries),
}))

export const staffScheduleEntriesRelations = relations(staffScheduleEntries, ({ one }) => ({
  staffSchedule: one(staffSchedules, {
    fields: [staffScheduleEntries.scheduleId],
    references: [staffSchedules.id],
  }),
  tenant: one(tenants, {
    fields: [staffScheduleEntries.tenantId],
    references: [tenants.id],
  }),
}))

export const timeOffTypesRelations = relations(timeOffTypes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [timeOffTypes.tenantId],
    references: [tenants.id],
  }),
  staffTimeOffs: many(staffTimeOff),
}))

export const staffTimeOffRelations = relations(staffTimeOff, ({ one }) => ({
  profile: one(profiles, {
    fields: [staffTimeOff.approvedBy],
    references: [profiles.id],
  }),
  staffProfile: one(staffProfiles, {
    fields: [staffTimeOff.staffId],
    references: [staffProfiles.id],
  }),
  tenant: one(tenants, {
    fields: [staffTimeOff.tenantId],
    references: [tenants.id],
  }),
  timeOffType: one(timeOffTypes, {
    fields: [staffTimeOff.typeId],
    references: [timeOffTypes.id],
  }),
}))
