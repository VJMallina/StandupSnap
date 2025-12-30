# Standalone Meeting Minutes (MOM) - How It Works

## Overview
- **Purpose**: AI-powered meeting minutes generation and management system for capturing, parsing, and storing structured meeting notes
- **Key Features**: Raw notes input, file transcript upload (TXT/PDF/DOCX), AI parsing via Groq API, structured output (Agenda/Discussion/Decisions/Actions), export to TXT/DOCX, project and sprint association
- **Integration**: Independent module with optional project/sprint linking, uses Groq llama-3.3-70b-versatile model for AI parsing
- **Complexity Level**: HIGH - AI-powered document processing with file upload and export capabilities

## Table of Contents
1. [Database Schema](#database-schema)
2. [Screens & Pages](#screens--pages)
3. [Screen 1: MOM List Page](#screen-1-mom-list-page)
4. [Screen 2: Create/Edit MOM Form](#screen-2-createedit-mom-form)
5. [Screen 3: MOM Detail View](#screen-3-mom-detail-view)
6. [AI Parsing with Groq API](#ai-parsing-with-groq-api)
7. [File Upload & Text Extraction](#file-upload--text-extraction)
8. [Export Functionality](#export-functionality)
9. [API Endpoints](#api-endpoints)
10. [Complete User Journeys](#complete-user-journeys)
11. [Business Rules](#business-rules)

---

## Database Schema

### Table: `standalone_moms`
**Purpose**: Store meeting minutes with AI-parsed structured content

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique MOM identifier |
| project_id | UUID | FK → projects, CASCADE DELETE | Parent project (required) |
| sprint_id | UUID | FK → sprints, SET NULL, NULLABLE | Optional sprint association |
| title | VARCHAR(255) | NOT NULL | Meeting title |
| meeting_date | DATE | NOT NULL | Date of meeting (cannot be future) |
| meeting_type | VARCHAR(100) | NOT NULL | Meeting type (Planning, Grooming, Retrospective, Stakeholder, General, Custom, Other) |
| custom_meeting_type | VARCHAR(100) | NULLABLE | Custom type name if meetingType = Custom/Other |
| raw_notes | TEXT | NULLABLE | Original unstructured meeting notes |
| agenda | TEXT | NULLABLE | Structured agenda (AI-generated or manual) |
| discussion_summary | TEXT | NULLABLE | Key discussion points (AI-generated or manual) |
| decisions | TEXT | NULLABLE | Decisions made (AI-generated or manual) |
| action_items | TEXT | NULLABLE | Action items with owners/dates (AI-generated or manual) |
| archived | BOOLEAN | DEFAULT false | Soft delete flag |
| created_by | UUID | FK → users, SET NULL | Creator user |
| updated_by | UUID | FK → users, SET NULL | Last updater |
| created_at | TIMESTAMP | AUTO | Creation timestamp |
| updated_at | TIMESTAMP | AUTO | Last update timestamp |

**Enums**:
```typescript
enum StandaloneMeetingType {
  PLANNING = 'Planning',
  GROOMING = 'Grooming',
  RETRO = 'Retrospective',
  STAKEHOLDER = 'Stakeholder Meeting',
  GENERAL = 'General Meeting',
  CUSTOM = 'Custom',
  OTHER = 'Other'
}
```

**Relationships**:
- N:1 with `projects` (required - MOM must belong to project)
- N:1 with `sprints` (optional)
- N:1 with `users` (createdBy, updatedBy)

**Indexes**:
- `project_id` (for filtering by project)
- `sprint_id` (for filtering by sprint)
- `meeting_date` (for date range queries)
- `meeting_type` (for filtering by type)
- `archived` (for excluding archived MOMs)
- `created_at`, `updated_at` (for sorting)
- Full-text search on `title`, `agenda`, `discussion_summary`, `decisions`, `action_items`

**Constraints**:
- `meeting_date` cannot be in the future
- If `sprint_id` provided, sprint must belong to the selected project
- If `meeting_type` is CUSTOM or OTHER, `custom_meeting_type` must be provided

---

## Screens & Pages

### Screen 1: MOM List Page

**Route**: `/standalone-mom`
**Access**: All authenticated users
**Component**: `F:\StandupSnap\frontend\src\pages\StandaloneMomListPage.tsx`

#### UI Components

1. **Page Header**
   - Title: "Meeting Minutes (MOM)"
   - Subtitle: "AI-powered meeting documentation"
   - "Create MOM" button (primary, top-right)

2. **Filter Bar**
   - **Project dropdown** (required filter)
     - Lists user's projects
     - Default: First project or "Select Project"
   - **Sprint dropdown** (optional)
     - "All Sprints" + list of sprints from selected project
   - **Meeting Type filter**
     - "All Types" + dropdown of meeting types
   - **Date Range**
     - "From Date" picker
     - "To Date" picker
     - Quick filters: "Last 7 days", "Last 30 days", "This Quarter"
   - **Search box**
     - Placeholder: "Search by title, agenda, decisions..."
     - Searches: title, agenda, discussionSummary, decisions, actionItems
   - "Show Archived" checkbox

3. **MOMs List/Table**
   - Card or table layout
   - Each MOM shows:
     - Title (bold, clickable)
     - Meeting Type badge (colored)
     - Meeting Date
     - Project name
     - Sprint name (if associated)
     - Created by user name
     - Last updated timestamp
     - Action buttons:
       - "View" (eye icon)
       - "Edit" (pencil icon)
       - "Download TXT" (download icon)
       - "Download DOCX" (download icon)
       - "Archive/Restore" (archive icon)
       - "Delete" (trash icon)
   - Pagination (if many MOMs)

4. **Empty State**
   - When no MOMs exist:
     - Illustration
     - "No meeting minutes yet"
     - "Create your first MOM to get started"
     - "Create MOM" button

5. **No Project Selected State**
   - If no project selected in filter:
     - "Please select a project to view meeting minutes"

### User Actions

#### Action 1: User Views MOM List

**What happens**: Load and display MOMs with filters

**Frontend**:
1. On page load, fetch user's projects
2. Auto-select first project (or last selected)
3. Fetch MOMs for selected project
4. Apply default filters (non-archived, all types)
5. Display in list

**API Call**:
```http
GET /api/standalone-mom?projectId={uuid}&sprintId={uuid}&meetingType={type}&dateFrom={date}&dateTo={date}&search={query}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\standalone-mom\standalone-mom.controller.ts` - `@Get()`
- **Service**: `F:\StandupSnap\backend\src\standalone-mom\standalone-mom.service.ts` - `findAll(filter)`

**Backend Flow**:
1. **Validate date range** (if provided):
   ```typescript
   if (filter.dateFrom && filter.dateTo && new Date(filter.dateTo) < new Date(filter.dateFrom)) {
     throw new BadRequestException('Invalid date range');
   }
   ```

2. **Build query**:
   ```sql
   SELECT mom.*, project.name as project_name, sprint.name as sprint_name,
          creator.name as created_by_name, updater.name as updated_by_name
   FROM standalone_moms mom
   LEFT JOIN projects project ON mom.project_id = project.id
   LEFT JOIN sprints sprint ON mom.sprint_id = sprint.id
   LEFT JOIN users creator ON mom.created_by = creator.id
   LEFT JOIN users updater ON mom.updated_by = updater.id
   WHERE mom.project_id = ?
     AND mom.archived = false
   ORDER BY mom.updated_at DESC
   ```

3. **Apply filters**:
   - If `sprintId`: `AND mom.sprint_id = ?`
   - If `meetingType`: `AND mom.meeting_type = ?`
   - If `dateFrom`: `AND mom.meeting_date >= ?`
   - If `dateTo`: `AND mom.meeting_date <= ?`
   - If `search`: `AND (mom.title ILIKE ? OR mom.agenda ILIKE ? OR mom.discussion_summary ILIKE ? OR mom.decisions ILIKE ? OR mom.action_items ILIKE ?)`

4. Return MOMs array

**Response**:
```json
[
  {
    "id": "mom-uuid",
    "title": "Sprint Planning - Sprint 5",
    "meetingDate": "2025-12-28",
    "meetingType": "Planning",
    "customMeetingType": null,
    "project": {
      "id": "project-uuid",
      "name": "StandupSnap"
    },
    "sprint": {
      "id": "sprint-uuid",
      "name": "Sprint 5"
    },
    "rawNotes": "Discussed API development...",
    "agenda": "Sprint 5 planning and story estimation",
    "discussionSummary": "Team discussed API development priorities...",
    "decisions": "Decided to focus on backend APIs first. PostgreSQL selected.",
    "actionItems": "John: Implement authentication by Jan 15\nSarah: Design DB schema by Jan 10",
    "archived": false,
    "createdBy": {
      "id": "user-uuid",
      "name": "John Doe"
    },
    "updatedBy": {
      "id": "user-uuid",
      "name": "John Doe"
    },
    "createdAt": "2025-12-28T10:00:00Z",
    "updatedAt": "2025-12-28T10:30:00Z"
  }
]
```

**UI Update**: Display MOMs in list with badges and action buttons

---

#### Action 2: User Applies Filters

**What happens**: Filter MOMs by project, sprint, type, date range

**Frontend**:
1. User changes filter (project/sprint/type/date)
2. Update filter state
3. Re-fetch MOMs with new filters
4. Update URL query params

**API Call**: Same as Action 1 with applied filters

**UI Update**: Display filtered results

---

#### Action 3: User Searches MOMs

**What happens**: Full-text search across MOM fields

**Frontend**:
1. User types in search box
2. Debounce input (500ms)
3. Re-fetch with search query

**API Call**:
```http
GET /api/standalone-mom?projectId={uuid}&search=authentication
```

**Backend**:
- Uses ILIKE for case-insensitive search
- Searches across: title, agenda, discussionSummary, decisions, actionItems

**UI Update**: Display matching MOMs

---

#### Action 4: User Clicks "Create MOM"

**What happens**: Navigate to create form

**Frontend**:
1. Navigate to `/standalone-mom/create`
2. See Screen 2 below

---

#### Action 5: User Views MOM Details

**What happens**: Navigate to read-only detail view

**Frontend**:
1. User clicks "View" or MOM title
2. Navigate to `/standalone-mom/{momId}`
3. See Screen 3 below

---

#### Action 6: User Edits MOM

**What happens**: Navigate to edit form

**Frontend**:
1. User clicks "Edit" (pencil icon)
2. Navigate to `/standalone-mom/{momId}/edit`
3. See Screen 2 (edit mode)

---

#### Action 7: User Downloads MOM (TXT)

**What happens**: Download MOM as plain text file

**Frontend**:
1. User clicks "Download TXT"
2. Call download API with format=txt
3. Browser downloads file

**API Call**:
```http
GET /api/standalone-mom/{momId}/download?format=txt
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `download(id, format)`

**Backend Flow**:
1. Fetch MOM by ID
2. Format as plain text:
   ```
   Title: Sprint Planning - Sprint 5
   Date: 2025-12-28
   Meeting Type: Planning
   Project: StandupSnap
   Sprint: Sprint 5

   Agenda:
   Sprint 5 planning and story estimation

   Discussion Summary:
   Team discussed API development priorities...

   Decisions:
   Decided to focus on backend APIs first. PostgreSQL selected.

   Action Items:
   John: Implement authentication by Jan 15
   Sarah: Design DB schema by Jan 10
   ```

3. Return as buffer with content-type: text/plain

**Response**: File download (MOM_{id}.txt)

**UI Update**: Browser downloads file

---

#### Action 8: User Downloads MOM (DOCX)

**What happens**: Download MOM as Word document

**Frontend**:
1. User clicks "Download DOCX"
2. Call download API with format=docx

**API Call**:
```http
GET /api/standalone-mom/{momId}/download?format=docx
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `download(id, 'docx')`
- Uses `docx` library (Document, Packer, Paragraph, HeadingLevel)

**Backend Flow**:
1. Fetch MOM by ID
2. Create DOCX document:
   ```typescript
   const doc = new Document({
     sections: [
       {
         children: [
           new Paragraph({ text: mom.title, heading: HeadingLevel.HEADING_1 }),
           new Paragraph({ text: `Date: ${meetingDate}` }),
           new Paragraph({ text: `Meeting Type: ${meetingType}` }),
           new Paragraph({ text: `Project: ${project.name}` }),
           new Paragraph({ text: `Sprint: ${sprint?.name || 'N/A'}` }),
           new Paragraph({ text: '' }),
           new Paragraph({ text: 'Agenda', heading: HeadingLevel.HEADING_2 }),
           new Paragraph({ text: mom.agenda || '' }),
           new Paragraph({ text: 'Discussion Summary', heading: HeadingLevel.HEADING_2 }),
           new Paragraph({ text: mom.discussionSummary || '' }),
           new Paragraph({ text: 'Decisions', heading: HeadingLevel.HEADING_2 }),
           new Paragraph({ text: mom.decisions || '' }),
           new Paragraph({ text: 'Action Items', heading: HeadingLevel.HEADING_2 }),
           new Paragraph({ text: mom.actionItems || '' })
         ]
       }
     ]
   });
   ```

3. Generate buffer: `await Packer.toBuffer(doc)`
4. Return with content-type: application/vnd.openxmlformats-officedocument.wordprocessingml.document

**Response**: File download (MOM_{id}.docx)

---

#### Action 9: User Archives MOM

**What happens**: Soft delete MOM (set archived = true)

**Frontend**:
1. User clicks archive icon
2. Show confirmation: "Archive this MOM? You can restore it later."
3. On confirm, call archive API

**API Call**:
```http
POST /api/standalone-mom/{momId}/archive
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `archive(id, userId)`

**Backend Flow**:
1. Fetch MOM by ID (where archived = false)
2. Set `archived = true`
3. Update `updatedBy = userId`
4. Save MOM

**Response**:
```json
{
  "id": "mom-uuid",
  "archived": true,
  "updatedAt": "2025-12-30T17:00:00Z"
}
```

**UI Update**:
1. Remove MOM from active list
2. Show toast: "MOM archived"
3. If "Show Archived" enabled, display in archived section

---

#### Action 10: User Restores Archived MOM

**What happens**: Restore archived MOM

**Frontend**:
1. User enables "Show Archived"
2. Archived MOMs appear
3. User clicks restore icon
4. Call restore API (same as create, just set archived = false via update)

**API Call**:
```http
PATCH /api/standalone-mom/{momId}
Content-Type: application/json

{
  "archived": false
}
```

**Backend**: Update MOM, set archived = false

**UI Update**: Move MOM to active list

---

#### Action 11: User Deletes MOM

**What happens**: Permanently delete MOM

**Frontend**:
1. User clicks delete icon
2. Show confirmation: "Permanently delete this MOM? This cannot be undone."
3. On confirm, call delete API

**API Call**:
```http
DELETE /api/standalone-mom/{momId}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `remove(id)`

**Backend Flow**:
1. Find MOM by ID
2. Hard delete from database

**UI Update**: Remove MOM from list

---

## Screen 2: Create/Edit MOM Form

**Routes**:
- Create: `/standalone-mom/create`
- Edit: `/standalone-mom/{momId}/edit`

**Access**: All authenticated users
**Component**: `F:\StandupSnap\frontend\src\pages\StandaloneMomFormPage.tsx`

### UI Components

1. **Form Header**
   - Title: "Create Meeting Minutes" or "Edit Meeting Minutes"
   - Back button (← to list)

2. **Form Fields** (Left Column)

   **Basic Information Section**:

   - **Title** (text input, required)
     - Label: "Meeting Title"
     - Placeholder: "e.g., Sprint 5 Planning Meeting"
     - Max length: 255

   - **Meeting Date** (date picker, required)
     - Label: "Meeting Date"
     - Cannot be future date
     - Validation: "Meeting date cannot be in the future"

   - **Meeting Type** (dropdown, required)
     - Label: "Meeting Type"
     - Options:
       - Planning
       - Grooming
       - Retrospective
       - Stakeholder Meeting
       - General Meeting
       - Custom
       - Other

   - **Custom Meeting Type** (text input, conditional)
     - Only shown if Meeting Type = Custom or Other
     - Label: "Custom Type Name"
     - Placeholder: "e.g., Quarterly Review"
     - Required if shown

   - **Project** (dropdown, required)
     - Label: "Project"
     - Lists user's projects
     - Required field

   - **Sprint** (dropdown, optional)
     - Label: "Sprint (Optional)"
     - Options: "No Sprint" + sprints from selected project
     - Disabled until project selected

   **Raw Meeting Notes Section**:

   - **Input Method Toggle**:
     - "Type Notes" tab (default)
     - "Upload File" tab

   - **Type Notes Tab**:
     - Large textarea (10+ rows)
     - Label: "Raw Meeting Notes"
     - Placeholder: "Enter unstructured meeting notes here. You can use AI to parse them into structured format."
     - Character count (optional)

   - **Upload File Tab**:
     - File upload dropzone
     - Accepted formats: TXT, PDF, DOCX
     - "Drop file here or click to browse"
     - Max file size: 10 MB
     - After upload: Show filename and "Remove" button
     - Extracted text populates "Raw Notes" field

   - **"Parse with AI" Button** (primary, large)
     - Enabled when raw notes or file uploaded
     - Shows loading spinner when processing
     - Icon: Magic wand or AI sparkles

3. **Structured Output Fields** (Right Column)

   - **AI Generation Status**:
     - If AI used: Show badge "AI Generated" or "AI Assisted"
     - If manual: Show "Manually Entered"

   - **Agenda** (textarea)
     - Label: "Agenda"
     - Placeholder: "Main topics discussed"
     - Editable (even if AI-generated)
     - 3-5 rows

   - **Discussion Summary** (textarea)
     - Label: "Discussion Summary"
     - Placeholder: "Key discussion points and context"
     - Editable
     - 5-8 rows

   - **Decisions** (textarea)
     - Label: "Decisions Taken"
     - Placeholder: "Final decisions and agreements"
     - Editable
     - 3-5 rows

   - **Action Items** (textarea)
     - Label: "Action Items"
     - Placeholder: "Task - Owner: Name, Due: Date"
     - Editable
     - 5-8 rows
     - Helper text: "Format: Task description - Owner: Name, Due: YYYY-MM-DD"

4. **Action Buttons** (Bottom)
   - "Cancel" (secondary, navigate back)
   - "Save as Draft" (secondary, set status to draft - if implementing status)
   - "Save MOM" (primary)

### User Actions

#### Action 1: User Creates New MOM

**What happens**: Fill form and save MOM

**Frontend**:
1. User navigates to create page
2. Fills required fields: title, date, type, project
3. Optionally selects sprint
4. Enters raw notes (or uploads file)
5. Optionally uses "Parse with AI"
6. Edits structured fields
7. Clicks "Save MOM"

**Validation**:
- Title required
- Meeting date required and not future
- Meeting type required
- If type = Custom/Other, custom type name required
- Project required
- If sprint selected, must belong to project
- At least one of: rawNotes, agenda, discussionSummary, decisions, actionItems

**API Call**:
```http
POST /api/standalone-mom
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Sprint 5 Planning Meeting",
  "meetingDate": "2025-12-28",
  "meetingType": "Planning",
  "projectId": "project-uuid",
  "sprintId": "sprint-uuid",  // Optional
  "rawNotes": "Discussed API development. John presented progress...",
  "agenda": "Sprint 5 planning and story estimation",
  "discussionSummary": "Team discussed API development priorities...",
  "decisions": "Decided to focus on backend APIs first.",
  "actionItems": "John: Implement auth by Jan 15\nSarah: Design DB by Jan 10"
}
```

**Backend**:
- **Controller**: `@Post()`
- **Service**: `create(dto, userId)`

**Backend Flow**:
1. **Validate meeting date**:
   ```typescript
   const date = new Date(meetingDate);
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   if (date > today) {
     throw new BadRequestException('Meeting date cannot be in the future');
   }
   ```

2. **Resolve project and sprint**:
   ```sql
   SELECT * FROM projects WHERE id = ?
   ```
   - If not found: throw `NotFoundException('Project not found')`

   If sprintId provided:
   ```sql
   SELECT * FROM sprints WHERE id = ? AND project_id = ?
   ```
   - If not found: throw `NotFoundException('Sprint not found')`
   - If sprint.project_id ≠ projectId: throw `BadRequestException('Sprint must belong to selected project')`

3. **Compute meeting type**:
   ```typescript
   if (meetingType === 'Custom' || meetingType === 'Other') {
     if (!customMeetingType) {
       throw new BadRequestException('Custom meeting type name required');
     }
   } else {
     customMeetingType = null;
   }
   ```

4. **Create MOM**:
   ```sql
   INSERT INTO standalone_moms
     (id, project_id, sprint_id, title, meeting_date, meeting_type, custom_meeting_type,
      raw_notes, agenda, discussion_summary, decisions, action_items,
      created_by, updated_by, created_at, updated_at)
   VALUES
     (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
   ```

5. **Return created MOM with relations**:
   ```sql
   SELECT mom.*, project.*, sprint.*, creator.*, updater.*
   FROM standalone_moms mom
   LEFT JOIN projects project ON mom.project_id = project.id
   LEFT JOIN sprints sprint ON mom.sprint_id = sprint.id
   LEFT JOIN users creator ON mom.created_by = creator.id
   LEFT JOIN users updater ON mom.updated_by = updater.id
   WHERE mom.id = ?
   ```

**Response**:
```json
{
  "id": "mom-uuid",
  "title": "Sprint 5 Planning Meeting",
  "meetingDate": "2025-12-28",
  "meetingType": "Planning",
  "customMeetingType": null,
  "project": {
    "id": "project-uuid",
    "name": "StandupSnap"
  },
  "sprint": {
    "id": "sprint-uuid",
    "name": "Sprint 5"
  },
  "rawNotes": "Discussed API development...",
  "agenda": "Sprint 5 planning and story estimation",
  "discussionSummary": "Team discussed API development priorities...",
  "decisions": "Decided to focus on backend APIs first.",
  "actionItems": "John: Implement auth by Jan 15\nSarah: Design DB by Jan 10",
  "archived": false,
  "createdBy": {
    "id": "user-uuid",
    "name": "John Doe"
  },
  "createdAt": "2025-12-28T10:00:00Z",
  "updatedAt": "2025-12-28T10:00:00Z"
}
```

**UI Update**:
1. Show success toast: "MOM created successfully"
2. Navigate to MOM detail page: `/standalone-mom/{momId}`

---

#### Action 2: User Uploads Transcript File

**What happens**: Upload file and extract text

**Frontend**:
1. User switches to "Upload File" tab
2. Drops file or clicks to browse
3. Select file (TXT, PDF, or DOCX)
4. Upload file to backend
5. Backend extracts text
6. Populate "Raw Notes" textarea with extracted text

**API Call**:
```http
POST /api/standalone-mom/extract-transcript
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

file: [transcript.pdf]
```

**Backend**:
- **Controller**: `@Post('extract-transcript')` with `@UseInterceptors(FileInterceptor('file'))`
- **Service**: `extractTranscript(file)`

**Backend Flow**:
1. Receive file via multer
2. Check MIME type:
   - `text/plain`: UTF-8 decode
   - `application/pdf`: Use pdf-parse library
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` or `application/msword`: Use mammoth library

3. **Text file**:
   ```typescript
   const text = file.buffer.toString('utf-8');
   ```

4. **PDF file**:
   ```typescript
   import * as pdfParse from 'pdf-parse';

   const result = await pdfParse(file.buffer);
   if (!result.text || !result.text.trim()) {
     throw new BadRequestException('PDF file is empty or could not be read');
   }
   const text = result.text;
   ```

5. **DOCX file**:
   ```typescript
   import * as mammoth from 'mammoth';

   const result = await mammoth.extractRawText({ buffer: file.buffer });
   if (!result.value || !result.value.trim()) {
     throw new BadRequestException('DOCX file is empty or could not be read');
   }
   const text = result.value;
   ```

6. **Unsupported format**:
   ```typescript
   throw new BadRequestException('Unsupported file format. Upload TXT, PDF, or DOCX.');
   ```

7. Return extracted text

**Response**:
```json
{
  "extractedText": "Meeting started at 10 AM. Discussed sprint planning. John presented API progress. Team agreed to focus on backend APIs first. Decided to use PostgreSQL. Sarah will review documentation by March 10. Launch date set for March 15."
}
```

**UI Update**:
1. Populate "Raw Notes" textarea with extracted text
2. Show filename below upload zone
3. Enable "Parse with AI" button
4. Show "Remove File" button to clear

---

#### Action 3: User Clicks "Parse with AI"

**What happens**: AI parses raw notes into structured fields

**Frontend**:
1. User clicks "Parse with AI"
2. Show loading spinner on button
3. Disable button during processing
4. Send raw notes to AI parsing API
5. Receive structured output
6. Populate Agenda, Discussion Summary, Decisions, Action Items fields
7. Show "AI Generated" badge

**API Call**:
```http
POST /api/standalone-mom/generate-ai
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "text": "Meeting started at 10 AM. Discussed sprint planning. John presented API progress. Team agreed to focus on backend APIs first. Decided to use PostgreSQL. Sarah will review documentation by March 10. Launch date set for March 15."
}
```

**Backend**:
- **Controller**: `@Post('generate-ai')`
- **Service**: `generateWithAI(dto)`

**Backend Flow** (See detailed AI section below):
1. Receive raw text
2. Format AI prompt
3. Call Groq API
4. Parse JSON response
5. Return structured data

**Response**:
```json
{
  "agenda": "Sprint planning and technology stack discussion",
  "discussionSummary": "John presented current API development progress. Team discussed backend development priorities and evaluated database options. Timeline and deliverables were reviewed.",
  "decisions": "Backend APIs will be developed first. PostgreSQL selected as the database. Launch date confirmed for March 15th. Documentation review deadline set for March 10th.",
  "actionItems": "Sarah: Review and finalize documentation - Due: March 10th\nTeam: Complete backend API development - Due: March 15th"
}
```

**UI Update**:
1. Populate fields with AI-generated content
2. Show "AI Generated" badge
3. Enable editing (user can refine AI output)
4. Show success message: "AI parsing complete. Review and edit as needed."

---

#### Action 4: User Edits Existing MOM

**What happens**: Load MOM data into form and update

**Frontend**:
1. User navigates to `/standalone-mom/{momId}/edit`
2. Fetch MOM by ID
3. Pre-populate all form fields
4. User edits fields
5. Click "Save MOM"

**API Call (Load)**:
```http
GET /api/standalone-mom/{momId}
Authorization: Bearer {accessToken}
```

**API Call (Update)**:
```http
PATCH /api/standalone-mom/{momId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "title": "Updated Meeting Title",
  "meetingDate": "2025-12-28",
  "rawNotes": "Updated raw notes...",
  "agenda": "Updated agenda...",
  "discussionSummary": "Updated discussion...",
  "decisions": "Updated decisions...",
  "actionItems": "Updated action items..."
}
```

**Backend**:
- **Service**: `update(id, dto, userId)`

**Backend Flow**:
1. Find MOM by ID (where archived = false)
2. If not found: throw `NotFoundException`
3. Validate updated fields (same as create)
4. Update fields:
   ```typescript
   if (dto.title !== undefined) mom.title = dto.title;
   if (dto.meetingDate !== undefined) {
     mom.meetingDate = this.validateMeetingDate(dto.meetingDate);
   }
   if (dto.rawNotes !== undefined) mom.rawNotes = dto.rawNotes;
   if (dto.agenda !== undefined) mom.agenda = dto.agenda;
   if (dto.discussionSummary !== undefined) mom.discussionSummary = dto.discussionSummary;
   if (dto.decisions !== undefined) mom.decisions = dto.decisions;
   if (dto.actionItems !== undefined) mom.actionItems = dto.actionItems;
   // ... other fields
   ```
5. Update `updatedBy = userId`, `updatedAt = now()`
6. Save MOM

**Response**: Updated MOM object

**UI Update**:
1. Show success toast: "MOM updated"
2. Navigate to detail view

---

## Screen 3: MOM Detail View

**Route**: `/standalone-mom/{momId}`
**Access**: All authenticated users
**Component**: `F:\StandupSnap\frontend\src\pages\StandaloneMomDetailPage.tsx`

### UI Components

1. **Header**
   - MOM Title (large, bold)
   - Meeting Type badge
   - Meeting Date
   - Project name (clickable link)
   - Sprint name (clickable link, if associated)
   - Action buttons:
     - "Edit" (navigate to edit form)
     - "Download TXT"
     - "Download DOCX"
     - "Archive"
     - "Delete"
   - Back to list link

2. **Metadata Panel**
   - Created by: {user name}
   - Created at: {timestamp}
   - Last updated by: {user name}
   - Last updated at: {timestamp}

3. **Content Sections** (Read-only, formatted)

   **Raw Meeting Notes** (Collapsible):
   - Section header: "Raw Meeting Notes"
   - Display raw notes in pre-formatted text or card
   - If empty: "No raw notes"

   **Agenda**:
   - Section header: "Agenda"
   - Display agenda text
   - If AI-generated: Show "AI" badge
   - If empty: "No agenda specified"

   **Discussion Summary**:
   - Section header: "Discussion Summary"
   - Display discussion summary
   - If empty: "No discussion summary"

   **Decisions Taken**:
   - Section header: "Decisions Taken"
   - Display decisions (formatted as list if multiple)
   - If empty: "No decisions recorded"

   **Action Items**:
   - Section header: "Action Items"
   - Display action items (formatted as task list)
   - Parse format: "Task - Owner: Name, Due: Date"
   - If empty: "No action items"

### User Actions

#### Action 1: User Views MOM Details

**What happens**: Display full MOM content

**Frontend**:
1. User navigates to detail page
2. Fetch MOM by ID
3. Display all sections

**API Call**:
```http
GET /api/standalone-mom/{momId}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `findOne(id)`

**Backend Flow**:
1. Find MOM by ID with relations:
   ```sql
   SELECT mom.*, project.*, sprint.*, creator.*, updater.*
   FROM standalone_moms mom
   LEFT JOIN projects project ON mom.project_id = project.id
   LEFT JOIN sprints sprint ON mom.sprint_id = sprint.id
   LEFT JOIN users creator ON mom.created_by = creator.id
   LEFT JOIN users updater ON mom.updated_by = updater.id
   WHERE mom.id = ? AND mom.archived = false
   ```
2. If not found: throw `NotFoundException('MOM not found')`
3. Return MOM

**Response**: Full MOM object (see create response)

**UI Update**: Display formatted content

---

#### Action 2: User Clicks "Edit"

**What happens**: Navigate to edit form

**Frontend**: Navigate to `/standalone-mom/{momId}/edit`

---

#### Action 3: User Downloads MOM

**What happens**: Same as list page download actions (TXT/DOCX)

---

## AI Parsing with Groq API

### Configuration

**Environment Variables**:
```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
```

**Service Initialization**:
```typescript
// F:\StandupSnap\backend\src\standalone-mom\standalone-mom.service.ts

constructor(
  private configService: ConfigService
) {
  this.groqApiKey = this.configService.get<string>('GROQ_API_KEY') || '';
  this.groqModel = this.configService.get<string>('GROQ_MODEL') || 'llama-3.3-70b-versatile';
}
```

---

### AI Prompt Engineering

**System Prompt**:
```
You are an expert meeting minutes assistant. Your task is to analyze raw meeting notes and extract structured information into a JSON format.

IMPORTANT: You must return ONLY a valid JSON object with these exact fields:
- agenda: The main topics/agenda items discussed (bullet points or paragraph)
- discussionSummary: Key discussion points, context, and what was talked about
- decisions: Final decisions or conclusions reached (clearly state each decision)
- actionItems: Action items with owner and due date (format: "Task description - Owner: Name, Due: Date")

INSTRUCTIONS:
1. Extract the agenda from meeting topics, objectives, or discussion points
2. Summarize the main discussion, conversations, and context
3. Identify explicit decisions, agreements, or conclusions
4. List all action items with owners and deadlines when mentioned
5. If a section is not found in the notes, use "Not mentioned" or "No [section] recorded"
6. Use clear, concise language and bullet points where appropriate
7. For action items, always try to identify who is responsible and when it's due

EXAMPLE INPUT:
"Team discussed the new feature release. John presented the progress. We decided to launch on March 15th. Sarah will review documentation by March 10th. Mike raised concerns about testing."

EXAMPLE OUTPUT:
{
  "agenda": "New feature release discussion and launch planning",
  "discussionSummary": "John presented current progress on the new feature. Mike raised concerns about testing coverage and timeline. Team discussed launch readiness and documentation requirements.",
  "decisions": "Launch date confirmed for March 15th. Additional testing will be conducted before launch.",
  "actionItems": "Review and finalize documentation - Owner: Sarah, Due: March 10th"
}

Now parse the following meeting notes:
```

**User Message**:
```
{rawNotes}
```

---

### Groq API Call

**Method**: `generateWithAI(dto: GenerateStandaloneMomDto)`

**Implementation**:
```typescript
async generateWithAI(dto: GenerateStandaloneMomDto) {
  const systemPrompt = `You are an expert meeting minutes assistant...`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: this.groqModel,  // llama-3.3-70b-versatile
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: dto.text }
        ],
        temperature: 0.3,      // Low temp for consistent output
        max_tokens: 2000,      // Enough for long MOMs
        response_format: { type: 'json_object' }  // Force JSON response
      },
      {
        headers: {
          Authorization: `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000  // 30 second timeout
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || '';

    // Parse JSON response
    let parsed: any;
    try {
      // First try: direct parse
      parsed = JSON.parse(content);
    } catch {
      // Fallback: extract JSON from markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.fallbackParse(dto.text);
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    // Return structured data with fallback values
    return {
      agenda: parsed.agenda || parsed.Agenda || 'No agenda specified',
      discussionSummary: parsed.discussionSummary || parsed.discussion_summary || parsed.discussion || parsed.summary || 'No discussion summary',
      decisions: parsed.decisions || parsed.Decisions || parsed.decisionsTaken || 'No decisions recorded',
      actionItems: parsed.actionItems || parsed.action_items || parsed.actions || 'No action items'
    };

  } catch (error) {
    console.error('AI generation error:', error.response?.data || error.message);
    return this.fallbackParse(dto.text);
  }
}
```

---

### Fallback Parsing

If AI fails or API is unavailable:

```typescript
private fallbackParse(text: string) {
  return {
    agenda: 'Meeting discussion',
    discussionSummary: text,  // Use raw text as summary
    decisions: 'To be reviewed',
    actionItems: 'To be determined'
  };
}
```

**When fallback is used**:
- Groq API key not configured
- API timeout (>30 seconds)
- API error (rate limit, server error)
- Invalid JSON response
- Network error

---

### AI Response Examples

**Example 1: Sprint Planning**

Input:
```
Team met for Sprint 5 planning. Discussed API development priorities. John presented current backend progress. Team agreed to focus on authentication first, then dashboard. Decided to use PostgreSQL instead of MongoDB. Sarah volunteered to design the database schema by January 10th. Mike will implement authentication module by January 15th. Target sprint completion: January 30th.
```

AI Output:
```json
{
  "agenda": "Sprint 5 planning, API development priorities, and technology stack decisions",
  "discussionSummary": "John presented current backend development progress. Team evaluated development priorities and discussed the order of feature implementation. Database technology options were compared, with focus on PostgreSQL vs MongoDB trade-offs. Sprint timeline and deliverables were reviewed.",
  "decisions": "Authentication feature will be prioritized as first development task. Dashboard implementation will follow. PostgreSQL selected as the database technology over MongoDB. Sprint 5 target completion date set for January 30th.",
  "actionItems": "Sarah: Design and document database schema - Due: January 10th\nMike: Implement authentication module - Due: January 15th"
}
```

---

**Example 2: Stakeholder Meeting**

Input:
```
Met with client stakeholders. Client expressed concerns about project timeline. We explained current blockers (third-party API delays). Client understood and agreed to 2-week extension. New deadline: February 15th. Action: Send updated project plan to client by end of week (John). Schedule follow-up meeting in 2 weeks (Sarah).
```

AI Output:
```json
{
  "agenda": "Stakeholder meeting to address project timeline concerns",
  "discussionSummary": "Client raised concerns about project delays and timeline. Development team explained current blockers related to third-party API integration delays. Both parties discussed impact on deliverables and feasibility of original deadline. Client expressed understanding of technical constraints.",
  "decisions": "Project deadline extended by 2 weeks to February 15th. Follow-up stakeholder meeting scheduled in 2 weeks.",
  "actionItems": "John: Send updated project plan to client - Due: End of week\nSarah: Schedule follow-up stakeholder meeting - Due: 2 weeks from today"
}
```

---

## File Upload & Text Extraction

### Supported Formats

1. **Plain Text (.txt)**
   - MIME: `text/plain`
   - Extraction: Direct UTF-8 decode
   - Use case: Simple copy-pasted notes

2. **PDF (.pdf)**
   - MIME: `application/pdf`
   - Library: `pdf-parse`
   - Extraction: Text layer extraction
   - Limitation: Scanned PDFs without OCR won't work

3. **Word Document (.docx, .doc)**
   - MIME: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/msword`
   - Library: `mammoth`
   - Extraction: Raw text extraction
   - Preserves: Paragraphs (basic structure)

---

### File Upload Flow

**Frontend**:
1. User selects file via dropzone or file input
2. Validate file:
   - File type (TXT/PDF/DOCX)
   - File size (max 10 MB)
3. Show upload progress
4. Send file to backend via FormData

**Backend**:
1. Receive file via multer middleware
2. Check file size (reject if > 10 MB)
3. Check MIME type
4. Extract text based on type
5. Return extracted text

**Error Handling**:
- File too large: "File size exceeds 10 MB limit"
- Unsupported format: "Unsupported file format. Upload TXT, PDF, or DOCX."
- Extraction failed: "Could not extract content from file. Try uploading a different file."
- Empty file: "File is empty or could not be read"

---

### Text Extraction Code

**TXT**:
```typescript
if (mime === 'text/plain') {
  return file.buffer.toString('utf-8');
}
```

**PDF**:
```typescript
if (mime === 'application/pdf') {
  try {
    const result = await pdfParse(file.buffer);
    if (!result.text || !result.text.trim()) {
      throw new Error('empty');
    }
    return result.text;
  } catch (err) {
    throw new BadRequestException('Could not extract content from PDF. Try a different file.');
  }
}
```

**DOCX**:
```typescript
if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword') {
  try {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    if (!result.value || !result.value.trim()) {
      throw new Error('empty');
    }
    return result.value;
  } catch (err) {
    throw new BadRequestException('Could not extract content from Word document. Try a different file.');
  }
}
```

---

## Export Functionality

### TXT Export

**Format**:
```
Title: Sprint Planning - Sprint 5
Date: 2025-12-28
Meeting Type: Planning
Project: StandupSnap
Sprint: Sprint 5

Agenda:
Sprint 5 planning and story estimation

Discussion Summary:
Team discussed API development priorities. John presented backend progress. Database technology options were evaluated.

Decisions:
Decided to focus on backend APIs first. PostgreSQL selected as database. Launch date set for March 15th.

Action Items:
John: Implement authentication module by Jan 15
Sarah: Design database schema by Jan 10
```

**Implementation**:
```typescript
const textBody = [
  `Title: ${mom.title}`,
  `Date: ${meetingDateString}`,
  `Meeting Type: ${mom.customMeetingType || mom.meetingType}`,
  `Project: ${mom.project?.name}`,
  `Sprint: ${mom.sprint?.name || 'N/A'}`,
  '',
  'Agenda:',
  mom.agenda || '',
  '',
  'Discussion Summary:',
  mom.discussionSummary || '',
  '',
  'Decisions:',
  mom.decisions || '',
  '',
  'Action Items:',
  mom.actionItems || ''
].join('\n');

return {
  buffer: Buffer.from(textBody, 'utf-8'),
  fileName: `MOM_${mom.id}.txt`,
  contentType: 'text/plain'
};
```

---

### DOCX Export

**Library**: `docx` (Document, Packer, Paragraph, HeadingLevel)

**Implementation**:
```typescript
import { Document, Packer, Paragraph, HeadingLevel } from 'docx';

const doc = new Document({
  sections: [
    {
      children: [
        // Title
        new Paragraph({ text: mom.title, heading: HeadingLevel.HEADING_1 }),

        // Metadata
        new Paragraph({ text: `Date: ${meetingDateString}` }),
        new Paragraph({ text: `Meeting Type: ${mom.customMeetingType || mom.meetingType}` }),
        new Paragraph({ text: `Project: ${mom.project?.name}` }),
        new Paragraph({ text: `Sprint: ${mom.sprint?.name || 'N/A'}` }),
        new Paragraph({ text: '' }),

        // Agenda
        new Paragraph({ text: 'Agenda', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: mom.agenda || '' }),

        // Discussion Summary
        new Paragraph({ text: 'Discussion Summary', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: mom.discussionSummary || '' }),

        // Decisions
        new Paragraph({ text: 'Decisions', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: mom.decisions || '' }),

        // Action Items
        new Paragraph({ text: 'Action Items', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: mom.actionItems || '' })
      ]
    }
  ]
});

const buffer = await Packer.toBuffer(doc);
return {
  buffer,
  fileName: `MOM_${mom.id}.docx`,
  contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};
```

**Frontend Download**:
```typescript
const response = await api.get(`/standalone-mom/${momId}/download?format=docx`, {
  responseType: 'blob'
});

const url = window.URL.createObjectURL(new Blob([response.data]));
const link = document.createElement('a');
link.href = url;
link.setAttribute('download', `MOM_${momId}.docx`);
document.body.appendChild(link);
link.click();
link.remove();
```

---

## API Endpoints

### 1. Get All MOMs (with filters)
```http
GET /api/standalone-mom?projectId={uuid}&sprintId={uuid}&meetingType={type}&dateFrom={date}&dateTo={date}&search={query}&createdBy={uuid}&updatedBy={uuid}
Authorization: Bearer {accessToken}

Response: 200 OK
[
  {
    "id": "mom-uuid",
    "title": "Sprint Planning - Sprint 5",
    "meetingDate": "2025-12-28",
    "meetingType": "Planning",
    "project": { ... },
    "sprint": { ... },
    ...
  }
]
```

---

### 2. Get MOM by ID
```http
GET /api/standalone-mom/{momId}
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "id": "mom-uuid",
  "title": "Sprint Planning - Sprint 5",
  "meetingDate": "2025-12-28",
  "meetingType": "Planning",
  "customMeetingType": null,
  "project": { ... },
  "sprint": { ... },
  "rawNotes": "...",
  "agenda": "...",
  "discussionSummary": "...",
  "decisions": "...",
  "actionItems": "...",
  "archived": false,
  "createdBy": { ... },
  "updatedBy": { ... },
  "createdAt": "2025-12-28T10:00:00Z",
  "updatedAt": "2025-12-28T10:30:00Z"
}
```

---

### 3. Create MOM
```http
POST /api/standalone-mom
Authorization: Bearer {accessToken}
Content-Type: application/json

Body:
{
  "title": "Sprint Planning - Sprint 5",
  "meetingDate": "2025-12-28",
  "meetingType": "Planning",
  "customMeetingType": null,
  "projectId": "project-uuid",
  "sprintId": "sprint-uuid",  // Optional
  "rawNotes": "Discussed API development...",
  "agenda": "Sprint 5 planning...",
  "discussionSummary": "Team discussed...",
  "decisions": "Decided to focus...",
  "actionItems": "John: Implement..."
}

Response: 201 Created
{
  "id": "mom-uuid",
  "title": "Sprint Planning - Sprint 5",
  ...
}
```

---

### 4. Update MOM
```http
PATCH /api/standalone-mom/{momId}
Authorization: Bearer {accessToken}
Content-Type: application/json

Body:
{
  "title": "Updated Title",
  "rawNotes": "Updated notes...",
  "agenda": "Updated agenda...",
  ...
}

Response: 200 OK
{
  "id": "mom-uuid",
  "title": "Updated Title",
  ...
}
```

---

### 5. Archive MOM
```http
POST /api/standalone-mom/{momId}/archive
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "id": "mom-uuid",
  "archived": true,
  ...
}
```

---

### 6. Delete MOM
```http
DELETE /api/standalone-mom/{momId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

---

### 7. Extract Transcript from File
```http
POST /api/standalone-mom/extract-transcript
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

Body:
file: [transcript.pdf]

Response: 200 OK
{
  "extractedText": "Meeting started at 10 AM. Discussed..."
}
```

---

### 8. Generate AI Structured MOM
```http
POST /api/standalone-mom/generate-ai
Authorization: Bearer {accessToken}
Content-Type: application/json

Body:
{
  "text": "Raw meeting notes text..."
}

Response: 200 OK
{
  "agenda": "Sprint planning and technology decisions",
  "discussionSummary": "Team discussed API development...",
  "decisions": "Backend APIs prioritized. PostgreSQL selected.",
  "actionItems": "John: Implement auth - Due: Jan 15\nSarah: Design DB - Due: Jan 10"
}
```

---

### 9. Download MOM (TXT or DOCX)
```http
GET /api/standalone-mom/{momId}/download?format={txt|docx}
Authorization: Bearer {accessToken}

Response: 200 OK
Content-Type: text/plain (for TXT) or application/vnd.openxmlformats-officedocument.wordprocessingml.document (for DOCX)
Content-Disposition: attachment; filename="MOM_{momId}.{txt|docx}"

Body: File buffer
```

---

## Complete User Journeys

### Journey 1: Manual MOM Creation

1. **User creates MOM manually**
   - Navigate to Standalone MOM list
   - Click "Create MOM"
   - Fill form:
     - Title: "Sprint 5 Retrospective"
     - Meeting Date: 2025-12-28
     - Meeting Type: Retrospective
     - Project: StandupSnap
     - Sprint: Sprint 5
   - Enter structured fields manually:
     - Agenda: "Sprint 5 retrospective discussion"
     - Discussion Summary: "Team discussed achievements and challenges"
     - Decisions: "Allocate more testing time next sprint"
     - Action Items: "SM: Schedule testing workshop - Due: Jan 10"
   - Click "Save MOM"

2. **System saves MOM**
   - MOM created in database
   - Navigate to detail view

3. **User views MOM**
   - See formatted MOM content

4. **User downloads MOM**
   - Click "Download DOCX"
   - Share with team

---

### Journey 2: AI-Assisted MOM Creation from Notes

1. **User creates MOM with AI**
   - Click "Create MOM"
   - Fill basic info (title, date, type, project, sprint)
   - Enter raw notes in textarea:
     ```
     Sprint planning meeting. Discussed API development priorities. John presented backend progress - authentication nearly complete. Team agreed to focus on dashboard next. Database decision: PostgreSQL over MongoDB due to complex relationships. Sarah will design schema by Jan 10. Mike will start dashboard UI by Jan 15. Target sprint completion: Jan 30.
     ```
   - Click "Parse with AI"

2. **AI processes notes**
   - Loading spinner shown
   - Groq API call made
   - AI extracts structure

3. **AI populates fields**
   - Agenda: "Sprint planning, API development priorities, and database technology selection"
   - Discussion: "John presented authentication module progress. Team evaluated next development priorities. Database options compared..."
   - Decisions: "Dashboard feature prioritized next. PostgreSQL selected over MongoDB..."
   - Action Items: "Sarah: Design database schema - Due: Jan 10\nMike: Start dashboard UI - Due: Jan 15"

4. **User reviews and edits**
   - User reads AI output
   - Makes minor edits for clarity
   - Adds missing action item

5. **User saves MOM**
   - Click "Save MOM"
   - MOM saved with all content

6. **User exports and shares**
   - Download as DOCX
   - Email to team

---

### Journey 3: AI-Assisted MOM from Uploaded Transcript

1. **User has meeting transcript file**
   - Meeting recorded and transcribed to PDF

2. **User creates MOM**
   - Click "Create MOM"
   - Fill basic info
   - Switch to "Upload File" tab
   - Drop PDF file

3. **System extracts text**
   - File uploaded
   - Backend extracts text using pdf-parse
   - Raw notes textarea populated with extracted text

4. **User triggers AI parsing**
   - Click "Parse with AI"
   - AI processes extracted text
   - Structured fields populated

5. **User reviews AI output**
   - Reads AI-generated content
   - Edits for accuracy
   - Fixes any misinterpretations

6. **User saves and shares**
   - Save MOM
   - Download as TXT
   - Post in project documentation

---

### Journey 4: Search and Filter MOMs

1. **User needs to find specific MOM**
   - Navigate to MOM list
   - Select project: "StandupSnap"
   - Filter by meeting type: "Planning"
   - Set date range: Last 30 days

2. **System filters results**
   - Shows only planning meetings from last 30 days

3. **User searches**
   - Types "authentication" in search box
   - System searches across all text fields
   - Shows MOMs mentioning authentication

4. **User finds MOM**
   - Click to view details
   - Review decisions about authentication

---

## Business Rules

### Validation Rules

1. **Meeting Date**
   - Required field
   - Cannot be in the future
   - Can be today or past dates
   - Format: YYYY-MM-DD

2. **Project Association**
   - Required - MOM must belong to a project
   - Project must exist and user must have access

3. **Sprint Association**
   - Optional
   - If provided, sprint must:
     - Exist
     - Belong to the selected project
     - Match: `sprint.project_id === mom.project_id`

4. **Meeting Type**
   - Required
   - Must be one of predefined types or Custom/Other
   - If Custom or Other selected:
     - `customMeetingType` field becomes required
     - User enters custom type name (e.g., "Quarterly Review")

5. **Content Fields**
   - At least one content field should have value:
     - rawNotes OR
     - agenda OR
     - discussionSummary OR
     - decisions OR
     - actionItems
   - All fields are optional individually
   - MOM with only title/date is valid but discouraged

---

### AI Parsing Rules

1. **AI Usage**
   - Optional - user can create MOM without AI
   - AI requires GROQ_API_KEY configured
   - If AI fails, fallback parsing used
   - User can always edit AI output

2. **Fallback Behavior**
   - If AI fails:
     - agenda = "Meeting discussion"
     - discussionSummary = {raw notes}
     - decisions = "To be reviewed"
     - actionItems = "To be determined"
   - User notified: "AI parsing failed. Review and edit manually."

3. **AI Output**
   - AI output is suggestion, not final
   - User can modify all AI-generated fields
   - No validation on AI output format
   - AI flag stored (for future auditing)

---

### File Upload Rules

1. **Supported Formats**
   - TXT (text/plain)
   - PDF (application/pdf)
   - DOCX (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
   - DOC (application/msword)

2. **File Size Limit**
   - Maximum: 10 MB
   - Exceeding limit: "File size exceeds 10 MB limit"

3. **Extraction Behavior**
   - Extracted text replaces raw notes field
   - User can edit extracted text before AI parsing
   - Extraction errors return user-friendly message

4. **Security**
   - File type validated by MIME type
   - No executable files allowed
   - Files not stored permanently (only text extracted)

---

### Export Rules

1. **Export Formats**
   - TXT: Plain text with line breaks
   - DOCX: Formatted Word document with headings

2. **Export Content**
   - Includes all fields (even if empty)
   - Empty fields show as blank lines or "N/A"
   - Metadata included (title, date, type, project, sprint)

3. **File Naming**
   - TXT: `MOM_{momId}.txt`
   - DOCX: `MOM_{momId}.docx`
   - Future: Allow custom naming

---

### Archive Rules

1. **Archive Behavior**
   - Soft delete (archived = true)
   - Archived MOMs hidden by default
   - Can be restored via "Show Archived" filter

2. **Delete Behavior**
   - Hard delete (permanent)
   - Requires confirmation
   - Cannot be undone

---

## Code References

### Backend Files

- **Entity**: `F:\StandupSnap\backend\src\entities\standalone-mom.entity.ts`
- **Service**: `F:\StandupSnap\backend\src\standalone-mom\standalone-mom.service.ts`
- **Controller**: `F:\StandupSnap\backend\src\standalone-mom\standalone-mom.controller.ts`
- **Module**: `F:\StandupSnap\backend\src\standalone-mom\standalone-mom.module.ts`
- **DTOs**:
  - `create-standalone-mom.dto.ts`
  - `update-standalone-mom.dto.ts`
  - `filter-standalone-mom.dto.ts`
  - `generate-ai.dto.ts`

### Frontend Files

- **Pages**:
  - `F:\StandupSnap\frontend\src\pages\StandaloneMomListPage.tsx`
  - `F:\StandupSnap\frontend\src\pages\StandaloneMomFormPage.tsx`
  - `F:\StandupSnap\frontend\src\pages\StandaloneMomDetailPage.tsx`
- **Types**: `F:\StandupSnap\frontend\src\types\standaloneMom.ts`
- **API Service**: `F:\StandupSnap\frontend\src\services\api\standaloneMom.ts`

---

## Error Handling

### Common Errors

1. **MOM Not Found**
   - Status: 404
   - Message: "MOM not found"
   - Cause: Invalid momId or MOM deleted/archived

2. **Project Not Found**
   - Status: 404
   - Message: "Project with ID {id} not found"
   - Cause: Invalid projectId

3. **Sprint Not Found**
   - Status: 404
   - Message: "Sprint with ID {id} not found"
   - Cause: Invalid sprintId

4. **Sprint Does Not Belong to Project**
   - Status: 400
   - Message: "Sprint must belong to the selected project"
   - Cause: sprint.project_id ≠ mom.project_id

5. **Future Meeting Date**
   - Status: 400
   - Message: "Meeting date cannot be in the future"
   - Cause: meetingDate > today

6. **Invalid Date Range**
   - Status: 400
   - Message: "Invalid date range"
   - Cause: dateTo < dateFrom

7. **AI Service Not Configured**
   - Status: 200 (doesn't throw error)
   - Behavior: Uses fallback parsing
   - Message: "AI service not available. Using fallback parsing."

8. **File Upload Error**
   - Status: 400
   - Message: "Unsupported file format. Upload TXT, PDF, or DOCX."
   - Cause: Invalid file type

9. **File Extraction Error**
   - Status: 400
   - Message: "Could not extract content from file. Try uploading a different file."
   - Cause: Corrupted file, password-protected PDF, scanned PDF without OCR

---

## Performance Considerations

1. **Full-Text Search**
   - PostgreSQL ILIKE used for search
   - Consider adding full-text search index (GIN) for large datasets
   - Current implementation: Case-insensitive substring match

2. **AI API Timeout**
   - Groq API timeout: 30 seconds
   - Frontend shows loading state
   - Fallback if timeout

3. **File Upload**
   - Max file size: 10 MB
   - Large PDFs may take time to parse
   - Consider async processing for very large files

4. **Export Generation**
   - TXT export: Instant (string concatenation)
   - DOCX export: <1 second for typical MOM
   - Generated on-demand (not cached)

5. **Pagination**
   - Frontend: Client-side pagination (if < 100 MOMs)
   - Backend: Consider server-side pagination for large datasets

---

## Summary

Standalone MOM is an **AI-powered meeting documentation system** that:

- **Captures** unstructured meeting notes (typed or uploaded)
- **Parses** notes into structured format using Groq AI (llama-3.3-70b-versatile)
- **Extracts** text from TXT, PDF, and DOCX files
- **Generates** agenda, discussion summary, decisions, and action items
- **Exports** to TXT and DOCX formats for sharing
- **Associates** MOMs with projects and optionally sprints
- **Searches** across all MOM content

**Key Features**:
- AI-assisted parsing via Groq API
- File upload with text extraction (pdf-parse, mammoth)
- Structured output (Agenda, Discussion, Decisions, Actions)
- Export to TXT/DOCX (using docx library)
- Fallback parsing if AI fails
- Full-text search and filtering
- Archive/restore functionality

This module **streamlines meeting documentation** and ensures **no decisions or action items are lost**.
