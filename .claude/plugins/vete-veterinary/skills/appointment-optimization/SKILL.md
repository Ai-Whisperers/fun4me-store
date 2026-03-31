---
name: appointment-optimization
description: Scheduling optimization algorithms for veterinary clinics including slot availability, multi-service bundling, no-show prediction, and emergency slot reservation. Use when building scheduling features.
---

# Appointment Optimization Guide

## Overview

This skill covers scheduling optimization patterns for veterinary clinics, designed to maximize throughput while maintaining quality of care.

---

## 1. Slot Availability Algorithm

### Time Slot Generation

```typescript
// lib/scheduling/slot-generator.ts
interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  vetId?: string;
  serviceTypes: string[];
  priority: 'normal' | 'emergency' | 'buffer';
}

interface ScheduleConfig {
  businessHours: {
    [day: number]: { open: string; close: string; breaks?: { start: string; end: string }[] };
  };
  slotDuration: number; // minutes
  bufferBetweenSlots: number; // minutes
  emergencySlotRatio: number; // 0-1, percentage of slots reserved for emergencies
  maxAdvanceBookingDays: number;
}

const DEFAULT_CONFIG: ScheduleConfig = {
  businessHours: {
    1: { open: '08:00', close: '18:00', breaks: [{ start: '12:00', end: '14:00' }] }, // Monday
    2: { open: '08:00', close: '18:00', breaks: [{ start: '12:00', end: '14:00' }] },
    3: { open: '08:00', close: '18:00', breaks: [{ start: '12:00', end: '14:00' }] },
    4: { open: '08:00', close: '18:00', breaks: [{ start: '12:00', end: '14:00' }] },
    5: { open: '08:00', close: '18:00', breaks: [{ start: '12:00', end: '14:00' }] },
    6: { open: '08:00', close: '12:00' }, // Saturday
    // 0 (Sunday) not included = closed
  },
  slotDuration: 30,
  bufferBetweenSlots: 5,
  emergencySlotRatio: 0.1, // 10% reserved for emergencies
  maxAdvanceBookingDays: 30,
};

export function generateAvailableSlots(
  date: Date,
  vetId: string,
  existingAppointments: Appointment[],
  config: ScheduleConfig = DEFAULT_CONFIG
): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const hours = config.businessHours[dayOfWeek];

  if (!hours) return []; // Closed this day

  const slots: TimeSlot[] = [];
  const [openHour, openMin] = hours.open.split(':').map(Number);
  const [closeHour, closeMin] = hours.close.split(':').map(Number);

  let current = new Date(date);
  current.setHours(openHour, openMin, 0, 0);

  const closeTime = new Date(date);
  closeTime.setHours(closeHour, closeMin, 0, 0);

  while (current < closeTime) {
    const slotEnd = new Date(current.getTime() + config.slotDuration * 60000);

    // Check if slot falls within a break
    const inBreak = hours.breaks?.some(breakPeriod => {
      const [breakStartH, breakStartM] = breakPeriod.start.split(':').map(Number);
      const [breakEndH, breakEndM] = breakPeriod.end.split(':').map(Number);
      const breakStart = new Date(date);
      breakStart.setHours(breakStartH, breakStartM, 0, 0);
      const breakEnd = new Date(date);
      breakEnd.setHours(breakEndH, breakEndM, 0, 0);
      return current >= breakStart && current < breakEnd;
    });

    if (!inBreak) {
      // Check if slot conflicts with existing appointments
      const hasConflict = existingAppointments.some(apt =>
        apt.vet_id === vetId &&
        new Date(apt.start_time) < slotEnd &&
        new Date(apt.end_time) > current
      );

      // Determine if this is an emergency-reserved slot
      const slotIndex = slots.length;
      const isEmergencySlot = slotIndex % Math.round(1 / config.emergencySlotRatio) === 0;

      slots.push({
        start: new Date(current),
        end: slotEnd,
        available: !hasConflict && (!isEmergencySlot || isWithinEmergencyWindow(current)),
        vetId,
        serviceTypes: ['general'], // Can be customized per vet
        priority: isEmergencySlot ? 'emergency' : 'normal',
      });
    }

    // Move to next slot (including buffer)
    current = new Date(current.getTime() + (config.slotDuration + config.bufferBetweenSlots) * 60000);
  }

  return slots;
}

// Emergency slots become available 2 hours before
function isWithinEmergencyWindow(slotTime: Date): boolean {
  const now = new Date();
  const hoursUntilSlot = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilSlot <= 2;
}
```

### Optimal Slot Selection

```typescript
// lib/scheduling/slot-optimizer.ts
interface SlotScore {
  slot: TimeSlot;
  score: number;
  reasons: string[];
}

interface OptimizationFactors {
  preferredTime?: 'morning' | 'afternoon' | 'any';
  urgency: 'routine' | 'soon' | 'urgent';
  serviceType: string;
  petSpecies: string;
  ownerHistory: {
    noShowRate: number;
    preferredTimes: string[];
    lastVisitDate?: Date;
  };
}

export function rankAvailableSlots(
  slots: TimeSlot[],
  factors: OptimizationFactors
): SlotScore[] {
  return slots
    .filter(slot => slot.available)
    .map(slot => {
      let score = 100;
      const reasons: string[] = [];

      // Time preference scoring
      const hour = slot.start.getHours();
      if (factors.preferredTime === 'morning' && hour >= 8 && hour < 12) {
        score += 20;
        reasons.push('Horario preferido (mañana)');
      } else if (factors.preferredTime === 'afternoon' && hour >= 14 && hour < 18) {
        score += 20;
        reasons.push('Horario preferido (tarde)');
      }

      // Urgency scoring - prioritize sooner slots
      if (factors.urgency === 'urgent') {
        const hoursUntil = (slot.start.getTime() - Date.now()) / (1000 * 60 * 60);
        score += Math.max(0, 50 - hoursUntil * 2); // More points for sooner slots
        reasons.push('Cita urgente - horario temprano');
      } else if (factors.urgency === 'soon') {
        const daysUntil = (slot.start.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysUntil <= 3) {
          score += 15;
          reasons.push('Disponibilidad próxima');
        }
      }

      // Owner history - avoid times with high no-show probability
      if (factors.ownerHistory.noShowRate > 0.2) {
        // Prefer slots that don't match their usual no-show pattern
        // (This would require more data analysis in practice)
        score -= 10;
        reasons.push('Ajuste por historial de asistencia');
      }

      // Slot efficiency - prefer slots that fill gaps
      if (isGapFiller(slot)) {
        score += 10;
        reasons.push('Optimiza horario del veterinario');
      }

      // Species-specific timing (e.g., cats prefer quieter times)
      if (factors.petSpecies === 'cat' && (hour === 8 || hour >= 16)) {
        score += 15;
        reasons.push('Horario tranquilo para gatos');
      }

      return { slot, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

function isGapFiller(slot: TimeSlot): boolean {
  // Implementation would check surrounding appointments
  // to determine if this slot fills a gap efficiently
  return false;
}
```

---

## 2. Multi-Service Bundling

### Service Bundle Detection

```typescript
// lib/scheduling/bundling.ts
interface Service {
  id: string;
  name: string;
  duration: number;
  category: string;
  requiresVet: boolean;
  canBundleWith: string[]; // Service IDs
}

interface ServiceBundle {
  services: Service[];
  totalDuration: number;
  savings: number; // Time saved vs separate appointments
  suggestedOrder: string[]; // Service IDs in optimal order
}

const BUNDLE_RULES: Record<string, string[]> = {
  'consulta': ['vacuna', 'desparasitacion', 'microchip'],
  'vacuna': ['desparasitacion', 'consulta'],
  'peluqueria': ['bano', 'corte_unas'],
  'cirugia_esterilizacion': ['microchip', 'vacuna_antirrabica'],
  'limpieza_dental': ['extraccion_dental', 'consulta'],
};

export function suggestBundles(
  requestedService: Service,
  petHistory: PetHistory,
  availableServices: Service[]
): ServiceBundle[] {
  const bundles: ServiceBundle[] = [];

  // Check what services can be bundled with requested service
  const bundleable = BUNDLE_RULES[requestedService.id] || [];

  // Check pet's pending/due services
  const pendingServices = getPendingServices(petHistory);

  for (const serviceId of bundleable) {
    const service = availableServices.find(s => s.id === serviceId);
    if (!service) continue;

    // Check if pet needs this service
    const isPending = pendingServices.includes(serviceId);
    const isDue = isDueForService(petHistory, serviceId);

    if (isPending || isDue) {
      bundles.push({
        services: [requestedService, service],
        totalDuration: calculateBundleDuration([requestedService, service]),
        savings: calculateTimeSavings([requestedService, service]),
        suggestedOrder: determineBestOrder([requestedService, service]),
      });
    }
  }

  return bundles.sort((a, b) => b.savings - a.savings);
}

function calculateBundleDuration(services: Service[]): number {
  // Bundled services share prep time
  const baseDuration = services.reduce((sum, s) => sum + s.duration, 0);
  const prepTimeSaved = (services.length - 1) * 10; // 10 min prep per service
  return baseDuration - prepTimeSaved;
}

function calculateTimeSavings(services: Service[]): number {
  const separateTotal = services.reduce((sum, s) => sum + s.duration + 30, 0); // 30 min between appointments
  const bundledTotal = calculateBundleDuration(services);
  return separateTotal - bundledTotal;
}

function determineBestOrder(services: Service[]): string[] {
  // Order by: exam first, then procedures, then vaccines, then cosmetic
  const priority: Record<string, number> = {
    consulta: 1,
    examen: 1,
    cirugia: 2,
    limpieza_dental: 2,
    vacuna: 3,
    desparasitacion: 3,
    microchip: 4,
    peluqueria: 5,
    bano: 5,
  };

  return services
    .sort((a, b) => (priority[a.id] || 99) - (priority[b.id] || 99))
    .map(s => s.id);
}

function getPendingServices(history: PetHistory): string[] {
  // Check for overdue vaccines, pending procedures, etc.
  const pending: string[] = [];

  if (history.lastVaccineDate && daysSince(history.lastVaccineDate) > 365) {
    pending.push('vacuna');
  }

  if (history.lastDewormingDate && daysSince(history.lastDewormingDate) > 90) {
    pending.push('desparasitacion');
  }

  if (!history.hasMicrochip) {
    pending.push('microchip');
  }

  return pending;
}

function isDueForService(history: PetHistory, serviceId: string): boolean {
  // Check service-specific due dates
  switch (serviceId) {
    case 'limpieza_dental':
      return history.lastDentalCleaning && daysSince(history.lastDentalCleaning) > 365;
    case 'vacuna_antirrabica':
      return history.lastRabiesVaccine && daysSince(history.lastRabiesVaccine) > 365;
    default:
      return false;
  }
}
```

---

## 3. No-Show Prediction

### Prediction Model

```typescript
// lib/scheduling/no-show-prediction.ts
interface NoShowFactors {
  dayOfWeek: number;
  hourOfDay: number;
  daysUntilAppointment: number;
  previousNoShows: number;
  previousAppointments: number;
  appointmentType: string;
  weatherForecast?: 'sunny' | 'rainy' | 'stormy';
  isFirstVisit: boolean;
  remindersSent: number;
  confirmationReceived: boolean;
}

interface PredictionResult {
  probability: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high';
  suggestedActions: string[];
}

// Simple logistic regression-style weights (would be trained on historical data)
const WEIGHTS = {
  intercept: -2.5,
  previousNoShowRate: 3.0,
  noConfirmation: 1.5,
  longWait: 0.05, // per day
  mondayMorning: 0.8,
  fridayAfternoon: 0.6,
  firstVisit: -0.5, // First visits less likely to no-show
  rainyWeather: 0.4,
  stormyWeather: 1.0,
  noReminders: 1.2,
  surgeryAppointment: -1.0, // Surgeries less likely to no-show
};

export function predictNoShow(factors: NoShowFactors): PredictionResult {
  let logit = WEIGHTS.intercept;

  // Previous no-show history
  if (factors.previousAppointments > 0) {
    const noShowRate = factors.previousNoShows / factors.previousAppointments;
    logit += WEIGHTS.previousNoShowRate * noShowRate;
  }

  // Confirmation status
  if (!factors.confirmationReceived) {
    logit += WEIGHTS.noConfirmation;
  }

  // Days until appointment (longer wait = higher no-show)
  logit += WEIGHTS.longWait * Math.max(0, factors.daysUntilAppointment - 3);

  // Day/time factors
  if (factors.dayOfWeek === 1 && factors.hourOfDay < 10) {
    logit += WEIGHTS.mondayMorning;
  }
  if (factors.dayOfWeek === 5 && factors.hourOfDay >= 15) {
    logit += WEIGHTS.fridayAfternoon;
  }

  // First visit
  if (factors.isFirstVisit) {
    logit += WEIGHTS.firstVisit;
  }

  // Weather
  if (factors.weatherForecast === 'rainy') {
    logit += WEIGHTS.rainyWeather;
  } else if (factors.weatherForecast === 'stormy') {
    logit += WEIGHTS.stormyWeather;
  }

  // Reminders
  if (factors.remindersSent === 0) {
    logit += WEIGHTS.noReminders;
  }

  // Appointment type
  if (factors.appointmentType === 'surgery') {
    logit += WEIGHTS.surgeryAppointment;
  }

  // Convert to probability
  const probability = 1 / (1 + Math.exp(-logit));

  // Determine risk level and actions
  let riskLevel: 'low' | 'medium' | 'high';
  const suggestedActions: string[] = [];

  if (probability < 0.15) {
    riskLevel = 'low';
  } else if (probability < 0.35) {
    riskLevel = 'medium';
    suggestedActions.push('Enviar recordatorio adicional');
    if (!factors.confirmationReceived) {
      suggestedActions.push('Solicitar confirmación por WhatsApp');
    }
  } else {
    riskLevel = 'high';
    suggestedActions.push('Llamar para confirmar');
    suggestedActions.push('Considerar overbooking para este horario');
    if (factors.daysUntilAppointment > 7) {
      suggestedActions.push('Enviar múltiples recordatorios');
    }
  }

  return { probability, riskLevel, suggestedActions };
}
```

### Overbooking Strategy

```typescript
// lib/scheduling/overbooking.ts
interface OverbookingDecision {
  allowOverbook: boolean;
  maxOverbooks: number;
  reason: string;
}

export function shouldAllowOverbooking(
  slot: TimeSlot,
  existingAppointments: Appointment[],
  historicalNoShowRate: number
): OverbookingDecision {
  // Calculate expected no-shows for existing appointments
  const noShowPredictions = existingAppointments.map(apt =>
    predictNoShow(getFactorsFromAppointment(apt))
  );

  const expectedNoShows = noShowPredictions.reduce(
    (sum, pred) => sum + pred.probability,
    0
  );

  // If expected no-shows >= 1, allow overbooking
  if (expectedNoShows >= 0.8) {
    return {
      allowOverbook: true,
      maxOverbooks: Math.floor(expectedNoShows),
      reason: `${Math.round(expectedNoShows * 100)}% probabilidad de ausencias`,
    };
  }

  // Check historical rate for this time slot
  if (historicalNoShowRate > 0.25) {
    return {
      allowOverbook: true,
      maxOverbooks: 1,
      reason: `Históricamente ${Math.round(historicalNoShowRate * 100)}% de ausencias en este horario`,
    };
  }

  return {
    allowOverbook: false,
    maxOverbooks: 0,
    reason: 'Bajo riesgo de ausencias',
  };
}
```

---

## 4. Emergency Slot Management

### Dynamic Emergency Reservation

```typescript
// lib/scheduling/emergency-slots.ts
interface EmergencyConfig {
  minReservedSlotsPerDay: number;
  reservationHoursAhead: number;
  releaseIfUnusedHours: number;
  emergencyCategories: string[];
}

const EMERGENCY_CONFIG: EmergencyConfig = {
  minReservedSlotsPerDay: 2,
  reservationHoursAhead: 24, // Reserve slots 24h ahead
  releaseIfUnusedHours: 2, // Release to regular booking 2h before
  emergencyCategories: [
    'trauma',
    'dificultad_respiratoria',
    'intoxicacion',
    'convulsiones',
    'sangrado',
    'parto',
  ],
};

export function manageEmergencySlots(
  date: Date,
  allSlots: TimeSlot[],
  currentEmergencies: number,
  config: EmergencyConfig = EMERGENCY_CONFIG
): TimeSlot[] {
  const now = new Date();
  const hoursUntilDate = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

  return allSlots.map(slot => {
    if (slot.priority !== 'emergency') return slot;

    const hoursUntilSlot = (slot.start.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Release emergency slots if:
    // 1. Less than releaseIfUnusedHours before slot time
    // 2. We have enough emergency capacity with current emergencies
    if (hoursUntilSlot <= config.releaseIfUnusedHours) {
      return {
        ...slot,
        available: true,
        priority: 'normal' as const,
      };
    }

    // Keep reserved if within reservation window
    if (hoursUntilSlot <= config.reservationHoursAhead) {
      return {
        ...slot,
        available: false, // Reserved for emergencies only
      };
    }

    return slot;
  });
}

export function findEmergencySlot(
  emergencyType: string,
  availableSlots: TimeSlot[]
): TimeSlot | null {
  // Find the next available slot (emergency or released)
  const now = new Date();

  // First, try emergency-reserved slots
  const emergencySlot = availableSlots.find(
    slot => slot.priority === 'emergency' && slot.start > now
  );

  if (emergencySlot) return emergencySlot;

  // If no emergency slots, find any available slot
  return availableSlots.find(
    slot => slot.available && slot.start > now
  ) || null;
}
```

---

## 5. Wait Time Estimation

```typescript
// lib/scheduling/wait-time.ts
interface WaitTimeEstimate {
  estimatedMinutes: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  factors: string[];
}

export function estimateWaitTime(
  appointmentTime: Date,
  currentQueue: Appointment[],
  historicalData: {
    avgDelayMinutes: number;
    stdDevMinutes: number;
  }
): WaitTimeEstimate {
  const now = new Date();
  const scheduledMinutesFromNow = (appointmentTime.getTime() - now.getTime()) / 60000;

  // Count appointments before this one today
  const appointmentsBefore = currentQueue.filter(apt =>
    new Date(apt.start_time) < appointmentTime &&
    new Date(apt.start_time).toDateString() === appointmentTime.toDateString()
  );

  // Calculate cumulative delay potential
  let estimatedDelay = 0;
  const factors: string[] = [];

  // Historical average delay
  estimatedDelay += historicalData.avgDelayMinutes;
  factors.push(`Demora promedio histórica: ${historicalData.avgDelayMinutes} min`);

  // Add delay for each appointment before (assuming some run over)
  const delayPerPriorAppointment = 3; // minutes
  const priorDelays = appointmentsBefore.length * delayPerPriorAppointment * 0.3; // 30% chance each runs over
  estimatedDelay += priorDelays;
  if (priorDelays > 0) {
    factors.push(`${appointmentsBefore.length} citas previas pueden causar demora`);
  }

  // Check for known delays (e.g., emergency in progress)
  const emergencyInProgress = currentQueue.some(apt =>
    apt.appointment_type === 'emergency' && apt.status === 'in_progress'
  );
  if (emergencyInProgress) {
    estimatedDelay += 20;
    factors.push('Emergencia en atención - posible demora adicional');
  }

  // Confidence level based on data quality
  let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';
  if (historicalData.stdDevMinutes < 10) {
    confidenceLevel = 'high';
  } else if (historicalData.stdDevMinutes > 20) {
    confidenceLevel = 'low';
  }

  return {
    estimatedMinutes: Math.max(0, Math.round(estimatedDelay)),
    confidenceLevel,
    factors,
  };
}
```

---

## 6. Database Functions

```sql
-- Get optimal appointment slots
CREATE OR REPLACE FUNCTION get_optimal_slots(
  p_tenant_id TEXT,
  p_service_id UUID,
  p_date DATE,
  p_preferred_time TEXT DEFAULT 'any'
)
RETURNS TABLE (
  slot_start TIMESTAMPTZ,
  slot_end TIMESTAMPTZ,
  vet_id UUID,
  vet_name TEXT,
  score INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH available_slots AS (
    -- Generate time slots
    SELECT
      gs.slot_time AS start_time,
      gs.slot_time + (s.duration_minutes || ' minutes')::INTERVAL AS end_time,
      ss.staff_id AS vet_id
    FROM generate_series(
      p_date + '08:00:00'::TIME,
      p_date + '17:30:00'::TIME,
      '30 minutes'::INTERVAL
    ) AS gs(slot_time)
    CROSS JOIN services s
    CROSS JOIN staff_schedules ss
    WHERE s.id = p_service_id
    AND ss.tenant_id = p_tenant_id
    AND ss.day_of_week = EXTRACT(DOW FROM p_date)
    AND gs.slot_time::TIME >= ss.start_time
    AND (gs.slot_time + (s.duration_minutes || ' minutes')::INTERVAL)::TIME <= ss.end_time
    -- Exclude existing appointments
    AND NOT EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.vet_id = ss.staff_id
      AND a.start_time < gs.slot_time + (s.duration_minutes || ' minutes')::INTERVAL
      AND a.end_time > gs.slot_time
      AND a.status NOT IN ('cancelled', 'no_show')
    )
  )
  SELECT
    av.start_time,
    av.end_time,
    av.vet_id,
    p.full_name,
    -- Scoring
    CASE
      WHEN p_preferred_time = 'morning' AND EXTRACT(HOUR FROM av.start_time) < 12 THEN 20
      WHEN p_preferred_time = 'afternoon' AND EXTRACT(HOUR FROM av.start_time) >= 14 THEN 20
      ELSE 0
    END +
    -- Prefer slots that fill gaps
    CASE WHEN EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.vet_id = av.vet_id
      AND DATE(a.start_time) = p_date
      AND (
        a.end_time = av.start_time
        OR a.start_time = av.end_time
      )
    ) THEN 10 ELSE 0 END AS score
  FROM available_slots av
  JOIN profiles p ON p.id = av.vet_id
  ORDER BY score DESC, av.start_time
  LIMIT 20;
END;
$$;
```

---

*Reference: Healthcare scheduling optimization research, veterinary practice management best practices*
