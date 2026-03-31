# Staff Invitation Flow

Complete process for inviting and onboarding new staff members.

```mermaid
sequenceDiagram
    participant Admin
    participant InviteForm
    participant API
    participant DB as Database
    participant Email as Email Service
    participant NewStaff

    Admin->>InviteForm: Open Invite Staff Form
    InviteForm->>InviteForm: Enter Email & Role
    InviteForm->>API: POST /api/staff/invite
    
    API->>API: Authenticate & Check Admin Role
    API->>DB: Check Email Already Exists
    DB-->>API: Profile Check Result
    
    alt Email Already Registered
        API-->>InviteForm: Error: Email Already Exists
        InviteForm-->>Admin: Show Error Message
    else Email Not Registered
        API->>DB: Check Pending Invites
        DB-->>API: Invite Check Result
        
        alt Invite Already Exists
            API-->>InviteForm: Error: Invite Pending
            InviteForm-->>Admin: Show Error Message
        else No Existing Invite
            API->>DB: INSERT clinic_invites<br/>(status: 'pending', expires: 7 days)
            DB-->>API: Invite ID
            
            API->>Email: Send Invitation Email
            Email-->>NewStaff: Email with Invite Link
            
            API-->>InviteForm: 201 Success
            InviteForm-->>Admin: Show Success Message
            
            Note over NewStaff,DB: User Receives Email
            
            NewStaff->>NewStaff: Click Invite Link
            NewStaff->>NewStaff: Redirect to Signup Page
            
            NewStaff->>NewStaff: Complete Registration
            NewStaff->>API: POST /api/auth/signup
            
            API->>DB: Create User Account
            API->>DB: Check for Invite by Email
            DB-->>API: Invite Found
            
            API->>DB: Create Profile with tenant_id & role from invite
            API->>DB: UPDATE clinic_invites<br/>(status: 'accepted', accepted_at)
            DB-->>API: Success
            
            API-->>NewStaff: Account Created
            NewStaff->>NewStaff: Auto-Login
            NewStaff->>NewStaff: Redirect to Dashboard
        end
    end
```

## Invite States

- **pending**: Invite sent, awaiting acceptance
- **accepted**: User signed up and accepted invite
- **expired**: Invite expired (7 days)
- **cancelled**: Admin cancelled invite

## Security

- Only admins can invite staff
- Invites expire after 7 days
- Email must be unique per tenant
- Role assigned from invite (vet/admin)

