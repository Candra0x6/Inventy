# Loan Letter Upload Implementation

This document describes the implementation of the loan letter file upload feature for the inventory management system.

## Overview

The loan letter upload feature allows users to upload official documents (loan letters, authorization forms, etc.) as part of their reservation requests. Files are stored in Supabase Storage and referenced in the database.

## Components Added/Modified

### 1. Database Schema Changes

**File:** `prisma/schema.prisma`

Added to the `Reservation` model:
```prisma
loanLetterUrl        String?           @map("loan_letter_url") // URL to uploaded loan letter file
loanLetterFileName   String?           @map("loan_letter_file_name") // Original filename
loanLetterUploadedAt DateTime?         @map("loan_letter_uploaded_at") // When the file was uploaded
```

**Migration:** `prisma/migrations/*/add_loan_letter_fields/migration.sql`
- Adds the three new columns to the reservations table

### 2. File Upload Utilities

**File:** `src/lib/supabase/file-upload.ts`

Key functions:
- `uploadFileToSupabase()` - Generic file upload with validation
- `uploadLoanLetter()` - Specific function for loan letters with type/size restrictions
- `deleteFileFromSupabase()` - Generic file deletion
- `deleteLoanLetter()` - Specific function for loan letter deletion
- Utility functions for file type detection and size formatting

**Features:**
- File type validation (PDF, DOC, DOCX, images)
- Size limit enforcement (10MB default)
- Unique filename generation
- Organized folder structure (`reservations/{reservationId}/`)

### 3. Upload Component

**File:** `src/components/reservations/loan-letter-upload.tsx`

**Features:**
- Drag & drop interface
- File preview for images
- Progress indication during upload
- Error handling and validation
- Delete functionality for existing files
- Permission-based access control

**Props:**
- `reservationId` - ID of the associated reservation
- `existingFile` - Current file information (if any)
- `onFileUploaded` - Callback when file is successfully uploaded
- `onFileDeleted` - Callback when file is deleted
- `disabled` - Disable all interactions

### 4. API Routes

#### Upload Route
**File:** `src/app/api/reservations/loan-letter/upload/route.ts`

- **Method:** POST
- **Authentication:** Required
- **Authorization:** Reservation owner or admin/manager
- **Body:** FormData with file and reservationId
- **Response:** File URL, filename, and updated reservation data

#### Delete Route
**File:** `src/app/api/reservations/loan-letter/delete/route.ts`

- **Method:** DELETE
- **Authentication:** Required
- **Authorization:** Reservation owner or admin/manager
- **Body:** JSON with reservationId
- **Response:** Success confirmation

### 5. Updated Components

#### Reservation Form
**File:** `src/components/reservations/reservation-form.tsx`

**Changes:**
- Added loan letter state management
- Added optional loan letter upload section
- New props for handling loan letter events
- Integration with upload component when `reservationId` is provided

#### Reservation Detail Page
**File:** `src/app/reservations/[id]/page.tsx`

**Changes:**
- Display uploaded loan letter with view/download options
- Upload component for cases where no file exists
- Event handlers for upload/delete operations
- Updated interface to include loan letter fields

## File Storage Structure

```
Supabase Storage Bucket: loan-letters/
└── reservations/
    └── [reservationId]/
        ├── [timestamp]-[random].[ext]
        └── [timestamp]-[random].[ext]
```

## Security & Permissions

### Authentication
- All file operations require user authentication
- JWT tokens validated on every request

### Authorization
- File upload/delete restricted to:
  - Reservation owner
  - Users with SUPER_ADMIN, MANAGER roles

### File Validation
- **Allowed types:** PDF, DOC, DOCX, JPG, PNG, WebP
- **Size limit:** 10MB maximum
- **Naming:** Unique timestamps + random strings prevent conflicts

## Usage Examples

### Basic Upload in Reservation Form
```tsx
<ReservationForm
  itemId="item-123"
  itemName="Laptop"
  reservationId="reservation-456" // Required for upload
  showLoanLetterUpload={true}
  onLoanLetterUploaded={(data) => {
    console.log('File uploaded:', data.url, data.fileName)
  }}
  onLoanLetterDeleted={() => {
    console.log('File deleted')
  }}
/>
```

### Standalone Upload Component
```tsx
<LoanLetterUpload
  reservationId="reservation-123"
  existingFile={{
    url: "https://...",
    fileName: "loan-letter.pdf",
    uploadedAt: "2024-01-01T00:00:00Z"
  }}
  onFileUploaded={(data) => updateState(data)}
  onFileDeleted={() => clearState()}
  disabled={false}
/>
```

### API Usage
```typescript
// Upload
const formData = new FormData()
formData.append('file', file)
formData.append('reservationId', 'reservation-123')

const response = await fetch('/api/reservations/loan-letter/upload', {
  method: 'POST',
  body: formData
})

// Delete
const response = await fetch('/api/reservations/loan-letter/delete', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reservationId: 'reservation-123' })
})
```

## Environment Variables Required

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Supabase Storage Setup

1. Create bucket named `loan-letters`
2. Set appropriate RLS policies
3. Configure public access for file URLs
4. Set up CORS if needed for direct uploads

## Error Handling

### Client-Side
- File type validation with user-friendly messages
- Size limit enforcement with clear feedback
- Network error handling with retry suggestions
- Permission error handling with appropriate redirects

### Server-Side
- Comprehensive error logging
- Graceful fallback when storage operations fail
- Database consistency maintained even if file operations fail
- Proper HTTP status codes for different error types

## Testing

### Test Page
**File:** `src/app/test-upload/page.tsx`
- Standalone page for testing upload functionality
- Accessible at `/test-upload` route
- Useful for development and debugging

### Manual Testing Scenarios
1. Upload valid file types (PDF, DOC, images)
2. Attempt invalid file types (should reject)
3. Upload oversized files (should reject)
4. Upload as reservation owner (should succeed)
5. Upload as non-owner (should reject)
6. Delete existing files
7. Network interruption during upload
8. Permission changes during upload process

## Future Enhancements

### Planned Features
- Multiple file uploads per reservation
- File versioning and history
- OCR integration for document text extraction
- Digital signature verification
- Automated compliance checking

### Performance Optimizations
- Client-side image compression
- Progressive upload for large files
- Caching strategies for frequently accessed files
- CDN integration for global file delivery

## Migration Guide

### Database Migration
```bash
# Generate migration
npx prisma migrate dev --name add_loan_letter_fields

# Apply to production
npx prisma migrate deploy
```

### Existing Reservations
- Existing reservations will have `null` values for loan letter fields
- Upload component will show as "no file uploaded"
- Users can upload files to existing reservations
- No data migration required

## Troubleshooting

### Common Issues
1. **Upload fails:** Check Supabase credentials and bucket permissions
2. **Files not accessible:** Verify bucket public access settings
3. **Large file timeout:** Increase server timeout limits
4. **Permission denied:** Verify user roles and reservation ownership

### Debug Steps
1. Check browser network tab for API errors
2. Verify Supabase Storage bucket configuration
3. Check server logs for detailed error messages
4. Validate environment variables are set correctly
