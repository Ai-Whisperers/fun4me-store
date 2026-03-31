# Messaging & Communication Flow

How messages flow between clients and staff through multiple channels.

```mermaid
flowchart TD
    START([User Sends Message]) --> CHANNEL{Message Channel?}
    
    CHANNEL -->|In-App| IN_APP[In-App Message]
    CHANNEL -->|WhatsApp| WHATSAPP[WhatsApp Message]
    CHANNEL -->|Email| EMAIL[Email Message]
    CHANNEL -->|SMS| SMS[SMS Message]
    
    IN_APP --> CREATE[Create Message Record]
    WHATSAPP --> CREATE
    EMAIL --> CREATE
    SMS --> CREATE
    
    CREATE --> CONVERSATION{Conversation Exists?}
    
    CONVERSATION -->|No| NEW_CONV[Create New Conversation]
    CONVERSATION -->|Yes| EXISTING[Use Existing Conversation]
    
    NEW_CONV --> INSERT[INSERT messages]
    EXISTING --> INSERT
    
    INSERT --> UPDATE[Update Conversation<br/>last_message_at, unread counts]
    
    UPDATE --> NOTIFY{Notify Recipient?}
    
    NOTIFY -->|Yes| QUEUE[Queue Notification]
    NOTIFY -->|No| END([Message Sent])
    
    QUEUE --> CHANNEL_NOTIFY{Notification Channel?}
    
    CHANNEL_NOTIFY -->|In-App| IN_APP_NOTIFY[In-App Notification]
    CHANNEL_NOTIFY -->|Email| EMAIL_NOTIFY[Send Email]
    CHANNEL_NOTIFY -->|Push| PUSH_NOTIFY[Push Notification]
    
    IN_APP_NOTIFY --> END
    EMAIL_NOTIFY --> END
    PUSH_NOTIFY --> END
    
    style START fill:#e1f5ff
    style CREATE fill:#fbbf24
    style QUEUE fill:#60a5fa
    style END fill:#4ade80
```

## Message Types

- **text**: Plain text message
- **image**: Image attachment
- **file**: Document attachment
- **appointment_card**: Appointment details card
- **invoice_card**: Invoice details card
- **prescription_card**: Prescription details card

## Conversation States

- **open**: Active conversation
- **pending**: Awaiting response
- **resolved**: Issue resolved
- **closed**: Conversation closed
- **spam**: Marked as spam

