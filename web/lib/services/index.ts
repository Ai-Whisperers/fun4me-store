/**
 * Service Layer Exports
 *
 * Central export point for all business logic services.
 * Services encapsulate database operations, validation, and business rules.
 *
 * @example
 * ```typescript
 * import { PetService, AppointmentService } from '@/lib/services';
 *
 * const petService = new PetService(supabase);
 * const result = await petService.list(ownerId, tenantId);
 * ```
 */

export { BaseService } from './base-service';
export type { ServiceResult } from './base-service';

export { PetService } from './pet-service';
export type {
  PetListFilters,
  CreatePetData,
  UpdatePetData,
} from './pet-service';

export { AppointmentService } from './appointment-service';
export type {
  AppointmentListFilters,
  SlotAvailabilityOptions,
  SlotAvailabilityResult,
  AppointmentAnalytics,
} from './appointment-service';

export { InvoiceService } from './invoice-service';
export type {
  InvoiceListFilters,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  RevenueSummary,
} from './invoice-service';

export { PaymentService } from './payment-service';
export type {
  PaymentMethod,
  PaymentStatus,
  Payment,
  PaymentWithInvoice,
  ProcessPaymentInput,
  PaymentListFilters,
} from './payment-service';

export { StoreService } from './store-service';
export type {
  Product,
  ProductWithStock,
  CartItem,
  Cart,
  Order,
  OrderWithItems,
  CheckoutInput,
  ProductFilters,
} from './store-service';

export { MedicalRecordService } from './medical-record-service';
export type {
  MedicalRecordType,
  VaccineStatus,
  MedicalRecord,
  Vaccine,
  Prescription,
  CreateMedicalRecordData,
  CreateVaccineData,
  CreatePrescriptionData,
  MedicalRecordFilters,
  VaccineFilters,
} from './medical-record-service';

// User service migrated to domain layer - re-export for backward compatibility
export { UserService, createUserService } from '../domain/users';
export type {
  UserRole,
  ContactMethod,
  DocumentType,
  UserProfile,
  CreateUserData,
  UpdateUserData,
  UserListFilters,
  OwnerListFilters,
  UserStats,
  UserWithMetadata,
  ClinicInvite,
} from '../domain/users';

export { InventoryService } from './inventory-service';
export type {
  TransactionType,
  Inventory,
  InventoryTransaction,
  StockAdjustmentData,
  InventoryData,
  InventoryFilters,
  TransactionFilters,
} from './inventory-service';

// Cron job tracking and alerting
export {
  trackCronExecution,
  getCronJobStatus,
  getJobHistory,
  cleanupOldRuns,
  startCronRun,
  completeCronRun,
  failCronRun,
} from './cron-tracker';
export type { CronExecutionResult, CronRunResult, CronJobStatus } from './cron-tracker';

export {
  sendCronAlert,
  checkAndAlertUnhealthyJobs,
  alertOnCronFailure,
} from './cron-alerting';
export type { AlertPayload } from './cron-alerting';

export { MessagingService } from './messaging-service';
export type {
  MessageChannel,
  ConversationStatus,
  ConversationPriority,
  SenderType,
  MessageType,
  MessageStatus,
  TemplateCategory,
  Conversation,
  Message,
  MessageAttachment,
  MessageTemplate,
  CreateConversationData,
  SendMessageData,
  CreateTemplateData,
  ConversationFilters,
  MessageFilters,
  TemplateFilters,
} from './messaging-service';

export { LabService } from './lab-service';
export type {
  OrderPriority,
  OrderStatus,
  ItemStatus,
  LabType,
  SampleType,
  ResultFlag,
  LabTest,
  LabPanel,
  LabOrder,
  LabOrderItem,
  LabResult,
  LabAttachment,
  LabComment,
  CreateOrderData,
  EnterResultData,
  TestFilters,
  OrderFilters,
} from './lab-service';

export { ClinicalToolsService } from './clinical-tools-service';
export type {
  DiagnosisStandard,
  Severity,
  Species,
  DrugCategory,
  DrugRoute,
  VaccineProtocolType,
  CycleType,
  GrowthPercentile,
  DiagnosisCode,
  DrugDosage,
  GrowthStandard,
  VaccineProtocol,
  ReproductiveCycle,
  EuthanasiaAssessment,
  DiagnosisCodeFilters,
  DrugFilters,
  GrowthStandardFilters,
  VaccineProtocolFilters,
  CreateReproductiveCycleData,
  UpdateReproductiveCycleData,
  CreateAssessmentData,
  DoseCalculationResult,
  GrowthPercentileResult,
} from './clinical-tools-service';

export { HospitalizationService } from './hospitalization-service';
export type {
  KennelType,
  KennelStatus,
  HospitalizationStatus,
  AcuityLevel,
  MedicationStatus,
  TreatmentStatus,
  FeedingStatus,
  FeedingMethod,
  NoteType,
  Mentation,
  HydrationStatus,
  MedicationRoute,
  Kennel,
  Hospitalization,
  HospitalizationVitals,
  HospitalizationMedication,
  HospitalizationTreatment,
  HospitalizationFeeding,
  HospitalizationNote,
  KennelFilters,
  HospitalizationFilters,
  CreateKennelData,
  UpdateKennelData,
  AdmitPatientData,
  UpdateHospitalizationData,
  DischargePatientData,
  RecordVitalsData,
  ScheduleMedicationData,
  AdministerMedicationData,
  SkipMedicationData,
  ScheduleTreatmentData,
  PerformTreatmentData,
  ScheduleFeedingData,
  CompleteFeedingData,
  CreateNoteData,
} from './hospitalization-service';

export { ConsentService } from './consent-service';
export type {
  ConsentCategory,
  ConsentPreferenceType,
  ConsentSource,
  ConsentDocumentStatus,
  ConsentAuditAction,
  ConsentTemplate,
  ConsentTemplateVersion,
  ConsentDocument,
  ConsentPreference,
  ConsentPreferenceAudit,
  ConsentAuditLog,
  CreateTemplateData as ConsentCreateTemplateData,
  UpdateTemplateData as ConsentUpdateTemplateData,
  CreateDocumentData,
  SignDocumentData,
  RevokeDocumentData,
  UpdatePreferenceData,
  TemplateFilters as ConsentTemplateFilters,
  DocumentFilters,
  ConsentAnalytics,
} from './consent-service';

export { SafetyService } from './safety-service';
export type {
  LostPetStatus,
  MatchStatus,
  DiseaseOutcome,
  DiseaseSeverity,
  LostPet,
  PetSighting,
  PetMatchSuggestion,
  MatchReason,
  DiseaseReport,
  DiseaseAlert,
  ReportLostPetData,
  UpdateLostPetData,
  ReportSightingData,
  ReviewMatchData,
  CreateDiseaseReportData,
  LostPetFilters,
  DiseaseReportFilters,
} from './safety-service';

export { VaccineService } from './vaccine-service';
export type {
  VaccineStatus as VaccineRecordStatus,
  VaccineRoute,
  ReactionSeverity,
  ReactionType,
  Vaccine as VaccineRecord,
  VaccineWithRelations,
  VaccineTemplate,
  VaccineReaction,
  RecordVaccineInput,
  ScheduleVaccineInput,
  RecordReactionInput,
  VaccineFilters as VaccineRecordFilters,
} from './vaccine-service';

export { ReminderService } from './reminder-service';
export type {
  ReminderType,
  ReminderStatus,
  RuleType,
  NotificationChannel,
  NotificationStatus,
  ReminderRule,
  Reminder,
  ReminderWithRelations,
  Notification,
  CreateRuleInput,
  CreateReminderInput,
  ReminderFilters,
  NotificationFilters,
} from './reminder-service';
