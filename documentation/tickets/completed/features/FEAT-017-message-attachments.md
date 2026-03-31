# FEAT-017: Message Attachments

## Priority: P2 - Medium
## Category: Feature
## Status: Completed
## Epic: [EPIC-08: Feature Completion](../epics/EPIC-08-feature-completion.md)
## Affected Areas: Messaging, Portal, Storage

## Description

Enable users to attach files (images, PDFs) to messages in the clinic-client messaging system.

## Source

Derived from `documentation/feature-gaps/INCOMPLETE_FEATURES_ANALYSIS.md` (TICKET-010)

## Context

> **UI**: `portal/messages/[id]/page.tsx:494` - "Próximamente: adjuntar archivos"
> **Database**: `message_attachments` table exists
> **Button disabled**: Attachment icon visible but disabled

## Current State

- Messaging system fully functional for text messages
- `message_attachments` table exists in database
- UI shows disabled attachment button with "coming soon" tooltip
- Supabase Storage configured for other file uploads (pet photos)
- No upload/display logic for message attachments

## Proposed Solution

### 1. File Upload Component

```typescript
// components/messages/attachment-upload.tsx
export function AttachmentUpload({
  onUpload,
  maxSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['image/*', 'application/pdf'],
}: AttachmentUploadProps) {
  const handleFileSelect = async (files: FileList) => {
    for (const file of files) {
      if (file.size > maxSize) {
        toast.error('Archivo muy grande. Máximo 10MB');
        continue;
      }

      const url = await uploadToStorage(file);
      onUpload({
        file_url: url,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      });
    }
  };

  return (
    <input
      type="file"
      multiple
      accept={allowedTypes.join(',')}
      onChange={(e) => handleFileSelect(e.target.files)}
    />
  );
}
```

### 2. Storage Upload Function

```typescript
// lib/storage/message-attachments.ts
export async function uploadMessageAttachment(
  file: File,
  messageId: string
): Promise<string> {
  const supabase = await createClient();

  const fileName = `${messageId}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from('message-attachments')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('message-attachments')
    .getPublicUrl(data.path);

  return publicUrl;
}
```

### 3. Message Creation with Attachments

```typescript
// actions/messages.ts
export const sendMessage = withActionAuth(
  async ({ user, supabase }, data: SendMessageData) => {
    // Create message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: data.conversationId,
        sender_id: user.id,
        content: data.content,
      })
      .select()
      .single();

    // Create attachments
    if (data.attachments?.length) {
      await supabase.from('message_attachments').insert(
        data.attachments.map(att => ({
          message_id: message.id,
          file_url: att.file_url,
          file_name: att.file_name,
          file_type: att.file_type,
          file_size: att.file_size,
        }))
      );
    }

    return actionSuccess(message);
  }
);
```

### 4. Attachment Display

```typescript
// components/messages/attachment-preview.tsx
export function AttachmentPreview({ attachment }: { attachment: MessageAttachment }) {
  if (attachment.file_type.startsWith('image/')) {
    return (
      <div className="relative">
        <img
          src={attachment.file_url}
          alt={attachment.file_name}
          className="max-w-xs rounded"
        />
        <a href={attachment.file_url} download className="absolute top-2 right-2">
          <Download className="h-4 w-4" />
        </a>
      </div>
    );
  }

  if (attachment.file_type === 'application/pdf') {
    return (
      <a
        href={attachment.file_url}
        target="_blank"
        className="flex items-center gap-2 p-2 border rounded"
      >
        <FileText className="h-5 w-5" />
        <span>{attachment.file_name}</span>
      </a>
    );
  }

  return null;
}
```

## Implementation Steps

1. [ ] Create Supabase Storage bucket for attachments
2. [ ] Implement file upload component
3. [ ] Create upload function with signed URLs
4. [ ] Update message creation to handle attachments
5. [ ] Create attachment preview component
6. [ ] Enable attachment button in message thread
7. [ ] Add file type validation (images, PDFs only)
8. [ ] Add file size validation (10MB limit)
9. [ ] Test upload/display cycle

## Acceptance Criteria

- [ ] Users can attach images to messages
- [ ] PDFs can be attached
- [ ] Attachments display inline in thread
- [ ] File size limited to 10MB
- [ ] Secure storage with signed URLs
- [ ] Download option for attachments
- [ ] Multiple attachments per message supported

## Related Files

- `web/app/[clinic]/portal/messages/[id]/page.tsx:494` - Disabled button
- `web/db/message_attachments` - Database table
- `web/lib/storage/` - Storage utilities

## Estimated Effort

- Storage setup: 1 hour
- Upload component: 2 hours
- Server action: 2 hours
- Display component: 2 hours
- Testing: 2 hours
- **Total: 9 hours (1 day)**

## Implementation Notes

### Completed: January 2026

Feature was found to be already fully implemented. Implementation includes:

#### Upload API (`app/api/messages/attachments/route.ts`)
- POST endpoint for file uploads
- Security: Extension whitelist (SEC-004 compliance)
- Type validation: images, PDFs, text files, Word docs
- Size validation: 10MB limit per file
- Max 5 files per message
- Supabase Storage bucket: `message-attachments`
- Path structure: `{user_id}/{conversation_id}/{timestamp}-{random}.{ext}`

#### Message Creation (`app/api/conversations/[id]/messages/route.ts`)
- Accepts `attachments` array in request body
- Stores attachments in JSONB column
- Auto-detects message type (image/file) from attachments
- Supports mixed content (text + attachments)

#### UI (`app/[clinic]/portal/messages/[id]/page.tsx`)
- File input with type restrictions
- `handleFileSelect` with validation
- Selected files preview with remove button
- Attachment button enabled (Paperclip icon)
- Upload via FormData to `/api/messages/attachments`
- Inline attachment display in messages
- Image thumbnails with preview
- Document links with file type icons

#### Security Features
- Auth check before upload
- Conversation access verification
- File extension whitelist
- MIME type validation
- Size limits enforced

---
*Created: January 2026*
*Completed: January 2026*
*Derived from INCOMPLETE_FEATURES_ANALYSIS.md*
