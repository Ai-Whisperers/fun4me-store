# FEAT-003: Telemedicine Integration

## Priority: P3 - Backlog
## Category: Feature
## Affected Areas: Appointments, Communications

## Description

Add video consultation capability for remote veterinary visits. Enables follow-ups, minor consultations, and triage without in-person visits.

## Use Cases

1. **Follow-up consultations** - Post-surgery check-ins
2. **Behavioral consultations** - Observe pet in home environment
3. **Triage** - Assess urgency before in-person visit
4. **Rural clients** - Serve clients far from clinic
5. **Emergency guidance** - Immediate advice before transport

## Proposed Features

### 1. Video Consultation Booking

- New appointment type: "Teleconsulta"
- Shorter duration options (15, 30 min)
- Lower pricing tier
- Pre-consultation questionnaire

### 2. Video Platform Integration

Options:
- **Daily.co** - Simple API, reasonable pricing
- **Twilio Video** - More features, higher complexity
- **Zoom SDK** - Familiar to users, licensing costs

### 3. In-App Video Room

```typescript
// pages/[clinic]/portal/teleconsulta/[appointmentId]
export default function TeleconsultaRoom() {
  // - Video/audio controls
  // - Screen sharing
  // - Chat sidebar
  // - Pet profile visible
  // - End call button
}
```

### 4. Pre/Post Consultation Flow

**Pre-consultation:**
- Waiting room with queue position
- Tech check (camera/mic test)
- Upload photos/videos of concern

**Post-consultation:**
- Summary notes
- Prescription if needed
- Follow-up scheduling
- Recording available (with consent)

## Technical Requirements

- WebRTC for video
- HIPAA/privacy compliance considerations
- Mobile-friendly
- Low bandwidth fallback (audio-only)
- Recording storage

## Implementation Phases

### Phase 1: Basic Video (2 weeks)
- [ ] Video provider integration
- [ ] Teleconsulta appointment type
- [ ] Basic video room

### Phase 2: Enhanced Features (2 weeks)
- [ ] Waiting room
- [ ] Pre-consultation form
- [ ] In-call chat

### Phase 3: Polish (1 week)
- [ ] Recording
- [ ] Post-call summary
- [ ] Mobile optimization

## Estimated Effort

- **Total: 5 weeks**
- Video integration: Complex
- Depends on provider choice

## Dependencies

- Video service account (Daily/Twilio/Zoom)
- Storage for recordings
- Privacy policy update
