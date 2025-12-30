# Form Builder (Artifact Templates & Instances) - How It Works

## Overview
- **Purpose**: Dynamic document template creation system for building custom project artifacts (Project Charter, Risk Plan, Communication Plan, etc.) with reusable templates and filled instances
- **Key Features**: Drag-and-drop template builder with 15+ field types, template versioning, instance creation from templates, AI-enabled fields via Groq API, export to PDF/DOCX/TXT, category-based organization
- **Integration**: Project-scoped templates, system-wide templates, version control for instances
- **Complexity Level**: VERY HIGH - Dynamic form builder with JSON schema, versioning, AI integration, and multi-format export

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Database Schema](#database-schema)
3. [Template Management](#template-management)
4. [Screen 1: Template Library](#screen-1-template-library)
5. [Screen 2: Template Builder](#screen-2-template-builder)
6. [Instance Management](#instance-management)
7. [Screen 3: Instance List](#screen-3-instance-list)
8. [Screen 4: Document Creation (Fill Instance)](#screen-4-document-creation-fill-instance)
9. [Screen 5: Instance Detail View](#screen-5-instance-detail-view)
10. [Version Control](#version-control)
11. [AI Integration](#ai-integration)
12. [Export Functionality](#export-functionality)
13. [API Endpoints](#api-endpoints)
14. [Complete User Journeys](#complete-user-journeys)
15. [Business Rules](#business-rules)

---

## Core Concepts

### Template vs. Instance

**Template** (artifact_templates):
- **Definition**: Reusable document structure with field definitions
- **Purpose**: Define what fields a document should have
- **Content**: Does NOT contain actual data, only field metadata
- **Example**: "Project Charter Template" with fields like "Project Name", "Objectives", "Budget"
- **Analogy**: Like a blank form or questionnaire

**Instance** (artifact_instances):
- **Definition**: Filled-out document created from a template
- **Purpose**: Actual document with user-entered data
- **Content**: Contains real values for each field defined in template
- **Example**: "StandupSnap Project Charter" with filled values
- **Analogy**: Like a completed form

**Version** (artifact_versions):
- **Definition**: Snapshot of instance data at a point in time
- **Purpose**: Track changes to instance over time
- **Content**: Complete data snapshot + change summary
- **Example**: v1.0, v1.1, v2.0 of "StandupSnap Project Charter"
- **Analogy**: Like Git commits for a document

---

### Field Types

**Input Fields**:
1. **Single-line Text**: Short text input (name, title)
2. **Multi-line Text Area**: Long text input (description, objectives)
3. **Number**: Numeric input (budget, duration)
4. **Date Picker**: Date selection (start date, deadline)
5. **Dropdown Selection**: Single choice from options (priority, status)
6. **Yes/No Toggle**: Boolean field (approved?, completed?)
7. **Tag/Chip Input**: Multiple tags (stakeholders, keywords)

**Structured Fields**:
8. **Table Block**: Multi-row table with defined columns
9. **File Upload**: File attachment placeholder

**AI-Powered Fields**:
10. **AI Summary Field**: User inputs raw text, AI structures it
11. **AI Assist Block**: AI generates content based on context

**Structural Elements** (not data fields):
12. **Section Header**: Visual divider with title
13. **Description Text**: Helper text or instructions
14. **Divider Line**: Visual separator
15. **Collapsible Section**: Expandable/collapsible group

---

### Template Categories

Templates organized by category for easy discovery:

- **PROJECT_GOVERNANCE**: Project Charter, Project Plan, Governance Framework
- **PLANNING_BUDGETING**: Budget Plan, Resource Plan, WBS
- **EXECUTION_MONITORING**: Status Report, Progress Report, Milestone Tracker
- **RISK_QUALITY**: Risk Management Plan, Quality Assurance Plan
- **CLOSURE_REPORTING**: Lessons Learned, Project Closure Report
- **CUSTOM**: User-defined templates

---

### System vs. Project Templates

**System Templates**:
- Created by admin or system
- Available to all projects
- Cannot be edited by regular users
- Marked with `isSystemTemplate = true`
- Examples: Standard PMI templates

**Project Templates**:
- Created by Scrum Masters for specific project
- Only visible within that project
- Can be edited by creator
- Marked with `isSystemTemplate = false`
- Examples: Company-specific templates

---

## Database Schema

### Table 1: `artifact_templates`
**Purpose**: Store template definitions with field structure

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique template identifier |
| name | VARCHAR(255) | NOT NULL | Template name (e.g., "Project Charter") |
| category | ENUM | DEFAULT CUSTOM | Template category |
| description | TEXT | NULLABLE | Template description |
| template_structure | JSONB | NOT NULL | Field definitions (JSON schema) |
| is_system_template | BOOLEAN | DEFAULT false | System-wide template flag |
| is_published | BOOLEAN | DEFAULT false | Published/draft status |
| project_id | UUID | FK → projects, CASCADE DELETE, NULLABLE | Parent project (if project-scoped) |
| created_by | UUID | FK → users, NULLABLE | Creator user |
| created_at | TIMESTAMP | AUTO | Creation timestamp |
| updated_at | TIMESTAMP | AUTO | Last update timestamp |

**Enums**:
```typescript
enum ArtifactCategory {
  PROJECT_GOVERNANCE = 'PROJECT_GOVERNANCE',
  PLANNING_BUDGETING = 'PLANNING_BUDGETING',
  EXECUTION_MONITORING = 'EXECUTION_MONITORING',
  RISK_QUALITY = 'RISK_QUALITY',
  CLOSURE_REPORTING = 'CLOSURE_REPORTING',
  CUSTOM = 'CUSTOM'
}
```

**Relationships**:
- N:1 with `projects` (optional - if project_id is null, it's system-wide)
- N:1 with `users` (createdBy)
- 1:N with `artifact_instances` (template has many instances)

**Indexes**:
- `category` (for filtering by category)
- `is_system_template` (for filtering system templates)
- `project_id` (for project-scoped templates)
- `created_at` (for sorting)

---

### Table 2: `artifact_instances`
**Purpose**: Store document instances created from templates

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique instance identifier |
| template_id | UUID | FK → artifact_templates, CASCADE DELETE | Parent template |
| project_id | UUID | FK → projects, CASCADE DELETE | Associated project (required) |
| name | VARCHAR(255) | NOT NULL | Instance/document name |
| description | TEXT | NULLABLE | Instance description |
| status | ENUM | DEFAULT DRAFT | DRAFT, IN_PROGRESS, COMPLETED, ARCHIVED |
| current_version_id | UUID | FK → artifact_versions, NULLABLE | Pointer to current version |
| created_by | UUID | FK → users | Creator user |
| created_at | TIMESTAMP | AUTO | Creation timestamp |
| updated_at | TIMESTAMP | AUTO | Last update timestamp |

**Enums**:
```typescript
enum ArtifactStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}
```

**Relationships**:
- N:1 with `artifact_templates` (instance created from template)
- N:1 with `projects` (instance belongs to project)
- 1:N with `artifact_versions` (instance has multiple versions)
- N:1 with `artifact_versions` (currentVersion pointer)
- N:1 with `users` (createdBy)

**Indexes**:
- `template_id` (for finding instances of template)
- `project_id` (for project filtering)
- `status` (for filtering by status)
- `created_at`, `updated_at` (for sorting)

---

### Table 3: `artifact_versions`
**Purpose**: Store version snapshots of instance data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique version identifier |
| instance_id | UUID | FK → artifact_instances, CASCADE DELETE | Parent instance |
| version_number | VARCHAR(20) | NOT NULL | Version number (e.g., "1.0", "1.1", "2.0") |
| data | JSONB | DEFAULT {} | Actual filled form data |
| change_summary | TEXT | NULLABLE | Description of changes in this version |
| is_major_version | BOOLEAN | DEFAULT false | Major (2.0) vs. minor (1.1) version |
| created_by | UUID | FK → users, NULLABLE | User who created this version |
| created_at | TIMESTAMP | AUTO | Version creation timestamp |

**Relationships**:
- N:1 with `artifact_instances` (version belongs to instance)
- N:1 with `users` (createdBy)

**Indexes**:
- `instance_id` (for finding versions of instance)
- `created_at` (for sorting versions)

**Version Numbering**:
- Format: `{major}.{minor}`
- Example: v1.0 (initial), v1.1 (minor edit), v2.0 (major change)
- Auto-incremented based on `is_major_version` flag

---

### Template Structure JSON Schema

**Example Template Structure** (stored in `template_structure` JSONB field):

```json
{
  "fields": [
    {
      "id": "fld-001",
      "type": "text",
      "label": "Project Title",
      "placeholder": "Enter project name",
      "required": true,
      "order": 0
    },
    {
      "id": "fld-002",
      "type": "textarea",
      "label": "Project Objectives",
      "placeholder": "Describe main objectives",
      "required": true,
      "aiEnabled": true,
      "helpText": "You can use AI to structure raw notes",
      "order": 1
    },
    {
      "id": "fld-003",
      "type": "date",
      "label": "Project Start Date",
      "required": true,
      "order": 2
    },
    {
      "id": "fld-004",
      "type": "dropdown",
      "label": "Project Priority",
      "required": true,
      "options": ["High", "Medium", "Low"],
      "defaultValue": "Medium",
      "order": 3
    },
    {
      "id": "fld-005",
      "type": "number",
      "label": "Budget (USD)",
      "required": false,
      "min": 0,
      "order": 4
    },
    {
      "id": "fld-006",
      "type": "tags",
      "label": "Stakeholders",
      "placeholder": "Add stakeholder names",
      "required": false,
      "order": 5
    },
    {
      "id": "fld-007",
      "type": "table",
      "label": "Milestones",
      "required": false,
      "columns": [
        { "id": "col-1", "label": "Milestone Name", "type": "text" },
        { "id": "col-2", "label": "Due Date", "type": "date" },
        { "id": "col-3", "label": "Status", "type": "dropdown", "options": ["Not Started", "In Progress", "Complete"] }
      ],
      "order": 6
    },
    {
      "id": "fld-008",
      "type": "section-header",
      "label": "Risk Assessment",
      "order": 7
    },
    {
      "id": "fld-009",
      "type": "textarea",
      "label": "Key Risks",
      "placeholder": "List major risks",
      "required": false,
      "order": 8
    }
  ]
}
```

**Field Type Definitions**:

```typescript
interface TemplateField {
  id: string;                    // Unique field ID (fld-001, fld-002...)
  type: FieldType;               // Field type enum
  label: string;                 // Display label
  placeholder?: string;          // Placeholder text
  required?: boolean;            // Required flag
  helpText?: string;             // Helper text below field
  defaultValue?: any;            // Default value
  order: number;                 // Display order
  aiEnabled?: boolean;           // AI assist enabled (for textarea)

  // Type-specific properties
  options?: string[];            // For dropdown, radio
  min?: number;                  // For number
  max?: number;                  // For number
  columns?: TableColumn[];       // For table
  validation?: ValidationRule;   // Validation rules
}

enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  DATE = 'date',
  DROPDOWN = 'dropdown',
  TOGGLE = 'toggle',
  TAGS = 'tags',
  TABLE = 'table',
  FILE_UPLOAD = 'file-upload',
  AI_SUMMARY = 'ai-summary',
  AI_ASSIST = 'ai-assist',
  SECTION_HEADER = 'section-header',
  DESCRIPTION = 'description',
  DIVIDER = 'divider',
  COLLAPSIBLE = 'collapsible'
}

interface TableColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'dropdown';
  options?: string[];            // For dropdown columns
}
```

---

### Instance Data JSON Schema

**Example Instance Data** (stored in `artifact_versions.data` JSONB field):

```json
{
  "fld-001": "StandupSnap Migration Project",
  "fld-002": "Migrate existing project management system to modern cloud-based solution. Improve team collaboration and real-time tracking capabilities.",
  "fld-003": "2025-01-15",
  "fld-004": "High",
  "fld-005": 150000,
  "fld-006": ["John Doe", "Jane Smith", "PMO Director"],
  "fld-007": [
    {
      "col-1": "Requirements Gathering",
      "col-2": "2025-02-01",
      "col-3": "Complete"
    },
    {
      "col-1": "Development Phase 1",
      "col-2": "2025-03-15",
      "col-3": "In Progress"
    },
    {
      "col-1": "UAT and Go-Live",
      "col-2": "2025-04-30",
      "col-3": "Not Started"
    }
  ],
  "fld-009": "1. Data migration complexity\n2. User adoption resistance\n3. Third-party integration delays"
}
```

**Structure**:
- Key: Field ID from template
- Value: User-entered data (type varies by field type)
- Missing keys: Field not filled (use default or empty)

---

## Template Management

### Template Lifecycle

1. **Create** → Template builder with drag-and-drop
2. **Save Draft** → `isPublished = false`
3. **Publish** → `isPublished = true`, visible to users
4. **Edit** → Modify template structure (only affects new instances)
5. **Duplicate** → Create copy to modify independently
6. **Archive** → Soft delete (if no instances exist)

---

## Screen 1: Template Library

**Route**: `/artifacts/templates`
**Access**: All authenticated users
**Component**: `F:\StandupSnap\frontend\src\pages\TemplateLibraryPage.tsx` (conceptual)

### UI Components

1. **Page Header**
   - Title: "Artifact Templates"
   - Subtitle: "Create and manage document templates"
   - "Create Template" button (primary, for Scrum Masters)

2. **Filter Bar**
   - **Category Filter**: Dropdown (All, Project Governance, Planning & Budgeting, etc.)
   - **Template Type**: "System Templates" / "My Project Templates" / "All"
   - **Search**: Search by name or description

3. **Template Grid/Cards**
   - Card layout for each template:
     - Template name (bold, large)
     - Category badge (colored)
     - Description (truncated)
     - "System Template" badge (if isSystemTemplate)
     - Instance count: "5 documents created"
     - Created by (if project template)
     - Action buttons:
       - "Use Template" (create instance)
       - "View Details"
       - "Edit" (only if owner and project template)
       - "Duplicate"
       - "Delete" (only if owner, no instances)

4. **Template Categories Section**
   - Tabs or sidebar to filter by category:
     - Project Governance
     - Planning & Budgeting
     - Execution & Monitoring
     - Risk & Quality
     - Closure & Reporting
     - Custom

5. **Empty State**
   - "No templates yet"
   - "Create your first template to get started"

### User Actions

#### Action 1: User Views Template Library

**What happens**: Load and display templates

**Frontend**:
1. On page load, fetch system templates + project templates
2. Display in grid layout
3. Group by category (optional)

**API Call**:
```http
GET /api/artifact-templates?projectId={uuid}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Controller**: `F:\StandupSnap\backend\src\artifacts\artifact-templates.controller.ts` - `@Get()`
- **Service**: `F:\StandupSnap\backend\src\artifacts\artifact-templates.service.ts` - `findAll(projectId?)`

**Backend Flow**:
1. If projectId provided:
   ```sql
   SELECT * FROM artifact_templates
   WHERE is_system_template = true
      OR project_id = ?
   ORDER BY category ASC, name ASC
   ```
2. If no projectId (show only system templates):
   ```sql
   SELECT * FROM artifact_templates
   WHERE is_system_template = true
   ORDER BY category ASC, name ASC
   ```

3. For each template, count instances:
   ```sql
   SELECT COUNT(*) FROM artifact_instances WHERE template_id = ?
   ```

**Response**:
```json
[
  {
    "id": "template-uuid",
    "name": "Project Charter",
    "category": "PROJECT_GOVERNANCE",
    "description": "Formal project authorization document",
    "templateStructure": { ... },
    "isSystemTemplate": true,
    "isPublished": true,
    "projectId": null,
    "createdBy": {
      "id": "admin-uuid",
      "name": "System Admin"
    },
    "instanceCount": 12,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  },
  {
    "id": "template-uuid-2",
    "name": "Sprint Review Template",
    "category": "CUSTOM",
    "description": "Custom template for sprint reviews",
    "isSystemTemplate": false,
    "isPublished": true,
    "projectId": "project-uuid",
    "createdBy": {
      "id": "user-uuid",
      "name": "John Doe"
    },
    "instanceCount": 3,
    "createdAt": "2025-12-20T10:00:00Z"
  }
]
```

**UI Update**: Display templates in grid with badges

---

#### Action 2: User Filters Templates

**What happens**: Filter by category or type

**Frontend**:
1. User selects category filter
2. Client-side filtering (or re-fetch from server)
3. Display filtered templates

**No API Call**: Client-side filtering on loaded templates

---

#### Action 3: User Searches Templates

**What happens**: Search by name or description

**Frontend**:
1. User types in search box
2. Debounce input
3. Client-side filtering

---

#### Action 4: User Clicks "Create Template"

**What happens**: Navigate to template builder

**Frontend**: Navigate to `/artifacts/templates/create`

---

#### Action 5: User Clicks "Use Template"

**What happens**: Navigate to instance creation

**Frontend**: Navigate to `/artifacts/instances/create?templateId={templateId}`

---

#### Action 6: User Duplicates Template

**What happens**: Create copy of template

**Frontend**:
1. User clicks "Duplicate"
2. Confirm: "Duplicate this template?"
3. Call duplicate API (create new template with same structure)

**API Call**:
```http
POST /api/artifact-templates/{templateId}/duplicate
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Copy of Project Charter",
  "projectId": "project-uuid"
}
```

**Backend**: Create new template with same `templateStructure`

**UI Update**: Navigate to edit page of new template

---

## Screen 2: Template Builder

**Routes**:
- Create: `/artifacts/templates/create`
- Edit: `/artifacts/templates/{templateId}/edit`

**Access**: Scrum Masters only
**Component**: `F:\StandupSnap\frontend\src\pages\TemplateBuilderPage.tsx` (conceptual)

### UI Components

1. **Builder Header**
   - Title: "Template Builder"
   - Back to library button
   - "Save Draft" button (secondary)
   - "Publish Template" button (primary)

2. **Template Metadata Panel** (Top)
   - **Template Name** (text input, required)
     - Placeholder: "e.g., Project Charter"
   - **Category** (dropdown, required)
     - Options: Project Governance, Planning & Budgeting, etc.
   - **Description** (textarea)
     - Placeholder: "Describe this template's purpose"
   - **Visibility** (radio buttons)
     - "Project-wide" (available to selected project only)
     - "Private" (only visible to me)
   - **Project** (dropdown, if visibility = Project-wide)
     - Select project

3. **Field Palette** (Left Sidebar)
   - **Input Fields**:
     - Single-line Text
     - Multi-line Text Area
     - Number
     - Date Picker
     - Dropdown
     - Yes/No Toggle
     - Tags/Chips

   - **Structured Fields**:
     - Table Block
     - File Upload

   - **AI Fields**:
     - AI Summary Field
     - AI Assist Block

   - **Layout Elements**:
     - Section Header
     - Description Text
     - Divider
     - Collapsible Section

   - Drag from palette to canvas

4. **Canvas** (Center)
   - **Drop Zone**: Drag fields here
   - **Field List**: Added fields displayed in order
   - Each field shows:
     - Drag handle (reorder)
     - Field type icon
     - Field label
     - "Edit" button (open properties)
     - "Delete" button
   - Empty state: "Drag fields from left to build your template"

5. **Field Properties Panel** (Right Sidebar, shown when field selected)
   - **Common Properties**:
     - Label (text input)
     - Placeholder (text input)
     - Help Text (text input)
     - Required (checkbox)
     - Default Value (varies by type)

   - **Type-Specific Properties**:
     - **Dropdown**: Options (add/remove)
     - **Number**: Min, Max
     - **Table**: Column definitions
     - **AI Fields**: AI prompt template

   - "Save Field" button

6. **Preview Panel** (Toggleable)
   - Live preview of template
   - Shows how form will look to users

### User Actions

#### Action 1: User Creates Template

**What happens**: Build template structure with drag-and-drop

**Frontend**:
1. User navigates to template builder
2. Enters template metadata (name, category, description)
3. Drags fields from palette to canvas
4. Configures each field's properties
5. Reorders fields via drag handles
6. Clicks "Save Draft" or "Publish Template"

**Template Building Steps**:

**Step 1: Add Field**
1. User drags "Single-line Text" from palette to canvas
2. Field appears in canvas with default label "Untitled Field"
3. Properties panel opens automatically

**Step 2: Configure Field**
1. User edits properties:
   - Label: "Project Title"
   - Placeholder: "Enter project name"
   - Required: true
   - Help Text: ""
2. Click "Save Field"
3. Field updates in canvas

**Step 3: Add More Fields**
1. Drag "Multi-line Text Area"
2. Configure:
   - Label: "Project Objectives"
   - AI Enabled: true
   - Help Text: "You can use AI to structure raw notes"
3. Save field

**Step 4: Add Dropdown**
1. Drag "Dropdown"
2. Configure:
   - Label: "Project Priority"
   - Options: ["High", "Medium", "Low"]
   - Default Value: "Medium"
3. Save field

**Step 5: Add Table**
1. Drag "Table Block"
2. Configure:
   - Label: "Milestones"
   - Add columns:
     - Column 1: "Milestone Name" (text)
     - Column 2: "Due Date" (date)
     - Column 3: "Status" (dropdown: Not Started, In Progress, Complete)
3. Save field

**Step 6: Add Section Header**
1. Drag "Section Header"
2. Configure:
   - Label: "Risk Assessment"
3. Save

**Step 7: Reorder Fields**
1. User drags fields up/down via drag handle
2. Order updates in canvas

**Step 8: Save Template**
1. User reviews all fields
2. Clicks "Save Draft" or "Publish Template"

**API Call**:
```http
POST /api/artifact-templates
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Project Charter",
  "category": "PROJECT_GOVERNANCE",
  "description": "Formal project authorization document",
  "templateStructure": {
    "fields": [
      {
        "id": "fld-001",
        "type": "text",
        "label": "Project Title",
        "placeholder": "Enter project name",
        "required": true,
        "order": 0
      },
      {
        "id": "fld-002",
        "type": "textarea",
        "label": "Project Objectives",
        "aiEnabled": true,
        "helpText": "You can use AI to structure raw notes",
        "order": 1
      },
      ... all other fields ...
    ]
  },
  "isPublished": true,
  "projectId": "project-uuid"
}
```

**Backend**:
- **Service**: `create(dto, projectId, userId)`

**Backend Flow**:
1. Validate input:
   - Name required
   - Category required
   - templateStructure must be valid JSON
   - All fields must have unique IDs

2. Generate field IDs (if not provided):
   ```typescript
   fields.forEach((field, index) => {
     if (!field.id) {
       field.id = `fld-${Date.now()}-${index}`;
     }
   });
   ```

3. Create template:
   ```sql
   INSERT INTO artifact_templates
     (id, name, category, description, template_structure, is_published, is_system_template,
      project_id, created_by, created_at, updated_at)
   VALUES
     (?, ?, ?, ?, ?, ?, false, ?, ?, NOW(), NOW())
   ```

4. Return created template

**Response**:
```json
{
  "id": "template-uuid",
  "name": "Project Charter",
  "category": "PROJECT_GOVERNANCE",
  "description": "Formal project authorization document",
  "templateStructure": { ... },
  "isSystemTemplate": false,
  "isPublished": true,
  "projectId": "project-uuid",
  "createdBy": {
    "id": "user-uuid",
    "name": "John Doe"
  },
  "createdAt": "2025-12-30T18:00:00Z"
}
```

**UI Update**:
1. Show success toast: "Template created"
2. Navigate to template library

---

#### Action 2: User Edits Existing Template

**What happens**: Load template and modify structure

**Frontend**:
1. Navigate to `/artifacts/templates/{templateId}/edit`
2. Fetch template
3. Load fields into canvas
4. User modifies fields
5. Save template

**Important**: Editing template only affects NEW instances. Existing instances retain old structure.

**API Call (Update)**:
```http
PATCH /api/artifact-templates/{templateId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Updated Project Charter",
  "templateStructure": { ... updated fields ... }
}
```

**Backend**:
- **Service**: `update(id, dto, userId)`

**Backend Flow**:
1. Find template by ID
2. Check if user owns template (or is admin)
   - If `isSystemTemplate = true`: throw `ForbiddenException('Cannot update system templates')`
   - If `createdBy !== userId`: throw `ForbiddenException('You can only update your own templates')`
3. Update template fields
4. Save template

**UI Update**: Show success toast

---

#### Action 3: User Deletes Template

**What happens**: Delete template (only if no instances)

**Frontend**:
1. User clicks delete
2. Check instance count
3. If instances exist: Show error "Cannot delete template with existing instances. Archive instances first."
4. If no instances: Confirm "Permanently delete this template?"
5. Call delete API

**API Call**:
```http
DELETE /api/artifact-templates/{templateId}
Authorization: Bearer {accessToken}
```

**Backend**:
- Check instance count:
  ```sql
  SELECT COUNT(*) FROM artifact_instances WHERE template_id = ?
  ```
- If count > 0: throw `BadRequestException('Cannot delete template with instances')`
- Else: Delete template

---

## Instance Management

### Instance Lifecycle

1. **Create from Template** → Select template, fill initial data
2. **Fill/Edit Data** → Update field values (creates new version)
3. **Save** → Update current version data
4. **Create New Version** → Snapshot current state (v1.0 → v1.1)
5. **Restore Version** → Rollback to previous version
6. **Export** → Download as PDF/DOCX/TXT
7. **Archive** → Set status to ARCHIVED

---

## Screen 3: Instance List

**Route**: `/artifacts/instances`
**Access**: All authenticated users
**Component**: `F:\StandupSnap\frontend\src\pages\InstanceListPage.tsx` (conceptual)

### UI Components

1. **Page Header**
   - Title: "Project Artifacts"
   - Subtitle: "Documents and deliverables"
   - "Create Document" button (opens template selector)

2. **Filter Bar**
   - **Project** (dropdown, required)
   - **Template Type** (dropdown): All templates + specific templates
   - **Status** (dropdown): All, Draft, In Progress, Completed, Archived
   - **Search**: Search by name

3. **Instance Grid/Table**
   - Table layout:
     - **Name** (clickable)
     - **Template** (which template used)
     - **Status** badge (colored)
     - **Current Version** (e.g., "v1.3")
     - **Last Updated** (timestamp)
     - **Created By**
     - **Actions**:
       - "View"
       - "Edit"
       - "Export PDF"
       - "Export DOCX"
       - "Archive"
       - "Delete"

4. **Empty State**
   - "No documents yet"
   - "Create your first document from a template"

### User Actions

#### Action 1: User Views Instance List

**What happens**: Load instances for project

**API Call**:
```http
GET /api/artifact-instances?projectId={uuid}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `findByProject(projectId)`

**Backend Flow**:
```sql
SELECT inst.*, tmpl.name as template_name, ver.version_number,
       creator.name as created_by_name
FROM artifact_instances inst
LEFT JOIN artifact_templates tmpl ON inst.template_id = tmpl.id
LEFT JOIN artifact_versions ver ON inst.current_version_id = ver.id
LEFT JOIN users creator ON inst.created_by = creator.id
WHERE inst.project_id = ?
ORDER BY inst.updated_at DESC
```

**Response**:
```json
[
  {
    "id": "instance-uuid",
    "name": "StandupSnap Project Charter",
    "description": "Project charter for StandupSnap migration",
    "status": "COMPLETED",
    "template": {
      "id": "template-uuid",
      "name": "Project Charter"
    },
    "currentVersion": {
      "id": "version-uuid",
      "versionNumber": "1.2"
    },
    "project": {
      "id": "project-uuid",
      "name": "StandupSnap"
    },
    "createdBy": {
      "id": "user-uuid",
      "name": "John Doe"
    },
    "createdAt": "2025-12-20T10:00:00Z",
    "updatedAt": "2025-12-28T15:30:00Z"
  }
]
```

---

#### Action 2: User Clicks "Create Document"

**What happens**: Show template selector modal

**Frontend**:
1. Open modal: "Select Template"
2. Display list of available templates
3. User selects template
4. Navigate to `/artifacts/instances/create?templateId={templateId}`

---

## Screen 4: Document Creation (Fill Instance)

**Routes**:
- Create: `/artifacts/instances/create?templateId={templateId}`
- Edit: `/artifacts/instances/{instanceId}/edit`

**Access**: All authenticated users
**Component**: `F:\StandupSnap\frontend\src\pages\InstanceFormPage.tsx` (conceptual)

### UI Components

1. **Form Header**
   - Title: "Create Document: [Template Name]" or "Edit Document"
   - Template badge
   - Back to instances button
   - "Save Draft" button
   - "Save Document" button (primary)

2. **Instance Metadata Panel**
   - **Document Name** (text input, required)
     - Placeholder: "e.g., StandupSnap Project Charter"
   - **Description** (textarea, optional)
   - **Status** (dropdown)
     - Options: Draft, In Progress, Completed
   - **Project** (dropdown, auto-filled if from project context)

3. **Dynamic Form** (Center)
   - Rendered based on template structure
   - Each field type renders differently:

   **Text Field**:
   ```tsx
   <TextField
     label="Project Title"
     placeholder="Enter project name"
     value={data['fld-001']}
     onChange={handleChange}
     required={true}
     helperText="Helper text here"
   />
   ```

   **Textarea (with AI)**:
   ```tsx
   <TextArea
     label="Project Objectives"
     value={data['fld-002']}
     onChange={handleChange}
     aiEnabled={true}
   />
   {aiEnabled && (
     <Button onClick={handleAIParse}>Generate with AI</Button>
   )}
   ```

   **Dropdown**:
   ```tsx
   <Select
     label="Project Priority"
     value={data['fld-004']}
     onChange={handleChange}
     options={['High', 'Medium', 'Low']}
   />
   ```

   **Date Picker**:
   ```tsx
   <DatePicker
     label="Project Start Date"
     value={data['fld-003']}
     onChange={handleChange}
   />
   ```

   **Tags**:
   ```tsx
   <TagInput
     label="Stakeholders"
     value={data['fld-006']}  // Array
     onChange={handleChange}
   />
   ```

   **Table**:
   ```tsx
   <TableInput
     label="Milestones"
     columns={[
       { id: 'col-1', label: 'Milestone Name', type: 'text' },
       { id: 'col-2', label: 'Due Date', type: 'date' },
       { id: 'col-3', label: 'Status', type: 'dropdown', options: [...] }
     ]}
     rows={data['fld-007']}  // Array of row objects
     onAddRow={handleAddRow}
     onDeleteRow={handleDeleteRow}
     onEditCell={handleEditCell}
   />
   ```

   **Section Header**:
   ```tsx
   <Divider textAlign="left">
     <Typography variant="h6">Risk Assessment</Typography>
   </Divider>
   ```

4. **Action Buttons** (Bottom)
   - "Cancel" (navigate back)
   - "Save Draft" (save without changing status)
   - "Save Document" (save and optionally change status)

### User Actions

#### Action 1: User Creates Instance from Template

**What happens**: Fill form based on template structure

**Frontend**:
1. Navigate to create page with templateId
2. Fetch template by ID
3. Parse `templateStructure` JSON
4. Dynamically render form fields
5. User fills fields
6. User clicks "Save Document"

**API Call (Create)**:
```http
POST /api/artifact-instances
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "templateId": "template-uuid",
  "projectId": "project-uuid",
  "name": "StandupSnap Project Charter",
  "description": "Project charter for migration project",
  "status": "IN_PROGRESS"
}
```

**Backend**:
- **Service**: `create(dto, projectId, userId)`

**Backend Flow**:
1. Validate template exists
2. Validate project exists
3. Create instance:
   ```sql
   INSERT INTO artifact_instances
     (id, template_id, project_id, name, description, status, created_by, created_at, updated_at)
   VALUES
     (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
   ```

4. **Create initial version (v1.0)**:
   ```sql
   INSERT INTO artifact_versions
     (id, instance_id, version_number, data, change_summary, is_major_version, created_by, created_at)
   VALUES
     (?, ?, '1.0', '{}', 'Initial version', true, ?, NOW())
   ```

5. **Update instance with current_version_id**:
   ```sql
   UPDATE artifact_instances
   SET current_version_id = ?
   WHERE id = ?
   ```

6. Return created instance

**Response**:
```json
{
  "id": "instance-uuid",
  "name": "StandupSnap Project Charter",
  "status": "IN_PROGRESS",
  "template": { ... },
  "currentVersion": {
    "id": "version-uuid",
    "versionNumber": "1.0",
    "data": {}
  },
  "createdAt": "2025-12-30T18:00:00Z"
}
```

**UI Update**: Navigate to edit page to fill data

---

#### Action 2: User Fills Form Data

**What happens**: Enter values for each field

**Frontend**:
1. User fills text field: "StandupSnap Migration Project"
2. User fills textarea: "Migrate existing PM system..."
3. User selects date: "2025-01-15"
4. User selects dropdown: "High"
5. User enters number: 150000
6. User adds tags: ["John Doe", "Jane Smith"]
7. User fills table:
   - Row 1: Milestone Name = "Requirements", Due Date = "2025-02-01", Status = "Complete"
   - Row 2: Milestone Name = "Development", Due Date = "2025-03-15", Status = "In Progress"

**State Management**:
```typescript
const [instanceData, setInstanceData] = useState<Record<string, any>>({});

const handleFieldChange = (fieldId: string, value: any) => {
  setInstanceData(prev => ({
    ...prev,
    [fieldId]: value
  }));
};
```

---

#### Action 3: User Uses AI Assist on Field

**What happens**: AI generates/structures content for AI-enabled field

**Frontend**:
1. User has textarea field with `aiEnabled: true`
2. User enters raw notes: "Project aims to modernize PM system, improve collaboration, enable real-time tracking, reduce manual reporting"
3. User clicks "Generate with AI" button
4. Show loading spinner
5. Call AI API with raw input
6. AI returns structured content
7. Replace field value with AI output

**API Call**:
```http
POST /api/artifact-instances/ai-assist
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fieldId": "fld-002",
  "fieldLabel": "Project Objectives",
  "rawInput": "Project aims to modernize PM system, improve collaboration, enable real-time tracking, reduce manual reporting"
}
```

**Backend**:
- Uses Groq API similar to Standalone MOM

**AI Prompt**:
```
You are a project documentation assistant. The user is filling out a field labeled "{fieldLabel}".

Raw input:
{rawInput}

Transform this into structured, professional content suitable for formal project documentation. Use clear, concise language. Format with bullet points if appropriate.

Return ONLY the structured content (no JSON, no extra explanation).
```

**Groq API Call**:
```typescript
const response = await axios.post(
  'https://api.groq.com/openai/v1/chat/completions',
  {
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a project documentation assistant. Structure raw notes into professional content.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 1000
  },
  {
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json'
    }
  }
);

const structuredContent = response.data?.choices?.[0]?.message?.content || rawInput;
```

**Response**:
```json
{
  "structuredContent": "Project Objectives:\n\n• Modernize existing project management system with cloud-based solution\n• Improve team collaboration capabilities with real-time features\n• Enable real-time project tracking and status visibility\n• Reduce manual reporting overhead through automation\n• Enhance stakeholder communication and transparency"
}
```

**UI Update**:
1. Replace field value with AI-generated content
2. Show "AI Generated" badge
3. User can edit further

---

#### Action 4: User Saves Instance Data

**What happens**: Update current version with filled data

**Frontend**:
1. User fills all required fields
2. Clicks "Save Document"
3. Validate required fields
4. Send data to backend

**API Call**:
```http
PATCH /api/artifact-instances/{instanceId}/current-version-data
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "data": {
    "fld-001": "StandupSnap Migration Project",
    "fld-002": "Project Objectives:\n• Modernize existing PM system...",
    "fld-003": "2025-01-15",
    "fld-004": "High",
    "fld-005": 150000,
    "fld-006": ["John Doe", "Jane Smith", "PMO Director"],
    "fld-007": [
      {
        "col-1": "Requirements Gathering",
        "col-2": "2025-02-01",
        "col-3": "Complete"
      },
      {
        "col-1": "Development Phase 1",
        "col-2": "2025-03-15",
        "col-3": "In Progress"
      }
    ],
    "fld-009": "1. Data migration complexity\n2. User adoption resistance"
  }
}
```

**Backend**:
- **Service**: `updateCurrentVersionData(instanceId, data)`

**Backend Flow**:
1. Find instance by ID
2. Get current_version_id
3. **Update current version's data directly** (no new version):
   ```sql
   UPDATE artifact_versions
   SET data = ?
   WHERE id = ?
   ```
4. Update instance's updated_at:
   ```sql
   UPDATE artifact_instances
   SET updated_at = NOW()
   WHERE id = ?
   ```

**Response**: Updated version with new data

**UI Update**:
1. Show success toast: "Document saved"
2. Update local state

---

#### Action 5: User Creates New Version

**What happens**: Snapshot current state as new version

**Frontend**:
1. User clicks "Create New Version" button
2. Modal opens: "Create Version"
   - Version Type: Minor (1.1) or Major (2.0)
   - Change Summary: (textarea)
3. User enters summary: "Updated milestones and budget"
4. Clicks "Create Version"

**API Call**:
```http
POST /api/artifact-instances/{instanceId}/versions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "data": { ...current form data... },
  "changeSummary": "Updated milestones and budget",
  "isMajorVersion": false
}
```

**Backend**:
- **Service**: `createVersion(instanceId, dto, userId)`

**Backend Flow**:
1. Find instance
2. Get all existing versions for this instance
3. **Calculate next version number**:
   ```typescript
   const versions = await this.getVersions(instanceId);
   const latestVersion = versions[0].versionNumber;  // e.g., "1.0"
   const [major, minor] = latestVersion.split('.').map(Number);

   const nextVersion = isMajorVersion
     ? `${major + 1}.0`    // 1.0 → 2.0
     : `${major}.${minor + 1}`;  // 1.0 → 1.1
   ```

4. **Create new version**:
   ```sql
   INSERT INTO artifact_versions
     (id, instance_id, version_number, data, change_summary, is_major_version, created_by, created_at)
   VALUES
     (?, ?, ?, ?, ?, ?, ?, NOW())
   ```

5. **Update instance current_version_id**:
   ```sql
   UPDATE artifact_instances
   SET current_version_id = ?
   WHERE id = ?
   ```

**Response**:
```json
{
  "id": "new-version-uuid",
  "versionNumber": "1.1",
  "data": { ... },
  "changeSummary": "Updated milestones and budget",
  "isMajorVersion": false,
  "createdBy": { ... },
  "createdAt": "2025-12-30T18:30:00Z"
}
```

**UI Update**: Show "Version 1.1 created"

---

## Screen 5: Instance Detail View

**Route**: `/artifacts/instances/{instanceId}`
**Access**: All authenticated users
**Component**: `F:\StandupSnap\frontend\src\pages\InstanceDetailPage.tsx` (conceptual)

### UI Components

1. **Header**
   - Document name (large, bold)
   - Template badge
   - Status badge
   - Current version: "v1.2"
   - Action buttons:
     - "Edit"
     - "Export PDF"
     - "Export DOCX"
     - "Export TXT"
     - "Create New Version"
     - "Archive"
     - "Delete"
   - Back to instances button

2. **Metadata Panel**
   - Created by: {user}
   - Created at: {date}
   - Last updated: {date}
   - Template: {template name} (clickable)
   - Project: {project name}

3. **Version History Panel** (Collapsible)
   - List of versions:
     - v1.2 - "Updated budget" - Dec 28, 2025 by John Doe (current)
     - v1.1 - "Added risk section" - Dec 25, 2025 by Jane Smith
     - v1.0 - "Initial version" - Dec 20, 2025 by John Doe
   - Actions per version:
     - "View" (show version data)
     - "Restore" (make this version current)

4. **Document Content** (Read-only)
   - Rendered based on template structure
   - Shows current version data
   - Each field displays:
     - Label (bold)
     - Value (formatted based on type)

   **Example**:
   ```
   Project Title
   StandupSnap Migration Project

   Project Objectives
   • Modernize existing PM system
   • Improve collaboration
   • Enable real-time tracking

   Project Start Date
   January 15, 2025

   Project Priority
   High

   Budget (USD)
   $150,000

   Stakeholders
   John Doe, Jane Smith, PMO Director

   Milestones
   ┌────────────────────────┬────────────┬─────────────┐
   │ Milestone Name         │ Due Date   │ Status      │
   ├────────────────────────┼────────────┼─────────────┤
   │ Requirements Gathering │ 2025-02-01 │ Complete    │
   │ Development Phase 1    │ 2025-03-15 │ In Progress │
   │ UAT and Go-Live        │ 2025-04-30 │ Not Started │
   └────────────────────────┴────────────┴─────────────┘

   Risk Assessment

   Key Risks
   1. Data migration complexity
   2. User adoption resistance
   3. Third-party integration delays
   ```

### User Actions

#### Action 1: User Views Instance Details

**What happens**: Display document content

**API Call**:
```http
GET /api/artifact-instances/{instanceId}
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `findOne(id)`

**Backend Flow**:
```sql
SELECT inst.*, tmpl.*, ver.*,
       creator.name as created_by_name, project.name as project_name
FROM artifact_instances inst
LEFT JOIN artifact_templates tmpl ON inst.template_id = tmpl.id
LEFT JOIN artifact_versions ver ON inst.current_version_id = ver.id
LEFT JOIN users creator ON inst.created_by = creator.id
LEFT JOIN projects project ON inst.project_id = project.id
WHERE inst.id = ?
```

**Response**:
```json
{
  "id": "instance-uuid",
  "name": "StandupSnap Project Charter",
  "status": "COMPLETED",
  "template": {
    "id": "template-uuid",
    "name": "Project Charter",
    "templateStructure": { ... }
  },
  "currentVersion": {
    "id": "version-uuid",
    "versionNumber": "1.2",
    "data": {
      "fld-001": "StandupSnap Migration Project",
      "fld-002": "Project Objectives:\n• Modernize...",
      ...
    }
  },
  "project": { ... },
  "createdBy": { ... },
  "createdAt": "2025-12-20T10:00:00Z",
  "updatedAt": "2025-12-28T15:30:00Z"
}
```

**UI Rendering**:
1. Parse template structure
2. For each field in template:
   - Get field definition (label, type, etc.)
   - Get value from `currentVersion.data[fieldId]`
   - Render field based on type:
     - Text: Display as paragraph
     - Date: Format as "January 15, 2025"
     - Tags: Display as comma-separated or chips
     - Table: Render as HTML table
     - Section Header: Render as divider

---

#### Action 2: User Views Version History

**What happens**: List all versions of instance

**API Call**:
```http
GET /api/artifact-instances/{instanceId}/versions
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `getVersions(instanceId)`

**Backend Flow**:
```sql
SELECT ver.*, creator.name as created_by_name
FROM artifact_versions ver
LEFT JOIN users creator ON ver.created_by = creator.id
WHERE ver.instance_id = ?
ORDER BY ver.created_at DESC
```

**Response**:
```json
[
  {
    "id": "version-3-uuid",
    "versionNumber": "1.2",
    "changeSummary": "Updated budget and milestones",
    "isMajorVersion": false,
    "createdBy": { "id": "user-uuid", "name": "John Doe" },
    "createdAt": "2025-12-28T15:30:00Z"
  },
  {
    "id": "version-2-uuid",
    "versionNumber": "1.1",
    "changeSummary": "Added risk assessment section",
    "isMajorVersion": false,
    "createdBy": { "id": "user-uuid-2", "name": "Jane Smith" },
    "createdAt": "2025-12-25T10:00:00Z"
  },
  {
    "id": "version-1-uuid",
    "versionNumber": "1.0",
    "changeSummary": "Initial version",
    "isMajorVersion": true,
    "createdBy": { "id": "user-uuid", "name": "John Doe" },
    "createdAt": "2025-12-20T10:00:00Z"
  }
]
```

**UI Update**: Display version timeline

---

#### Action 3: User Restores Previous Version

**What happens**: Rollback to previous version

**Frontend**:
1. User clicks "Restore" on version v1.1
2. Confirm: "Restore to version 1.1? This will create a new version with this data."
3. Call restore API

**API Call**:
```http
POST /api/artifact-instances/{instanceId}/versions/{versionId}/restore
Authorization: Bearer {accessToken}
```

**Backend**:
- **Service**: `restoreVersion(instanceId, versionId, userId)`

**Backend Flow**:
1. Find version to restore
2. Verify version belongs to instance
3. Get version data
4. **Create NEW version** with restored data:
   - Calculate next version number (e.g., 1.2 → 1.3)
   - Change summary: "Restored from version 1.1"
   - Copy data from old version
5. Update instance current_version_id

**Response**: New version object

**UI Update**: Show "Restored to version 1.1 (now v1.3)"

---

## Version Control

### Version Numbering

**Format**: `{major}.{minor}`

**Rules**:
- **Initial version**: v1.0
- **Minor update**: Increment minor (1.0 → 1.1 → 1.2)
- **Major update**: Increment major, reset minor (1.5 → 2.0)

**User chooses** version type when creating new version:
- Minor: Small edits, updates
- Major: Significant changes, complete rewrites

---

### Version Operations

**Create Version**:
- Snapshots current data
- Creates new version record
- Updates instance current_version_id

**Restore Version**:
- Doesn't delete newer versions
- Creates NEW version with old data
- Example: v1.0, v1.1, v1.2 → restore v1.0 → creates v1.3 with v1.0 data

**View Version**:
- Read-only view of version data
- Shows what document looked like at that time

---

## AI Integration

### AI-Enabled Fields

**Configuration** (in template):
```json
{
  "id": "fld-002",
  "type": "textarea",
  "label": "Project Objectives",
  "aiEnabled": true,
  "aiPromptTemplate": "Structure these project objectives into clear bullet points"
}
```

**Usage**:
1. User enters raw notes in field
2. Clicks "Generate with AI" button
3. AI processes raw input using prompt template
4. AI returns structured content
5. Field value replaced with AI output

---

### AI Prompt Template

**Generic Prompt**:
```
You are a project documentation assistant. The user is filling out a field labeled "{fieldLabel}".

Raw input:
{rawInput}

{customPrompt || "Transform this into structured, professional content suitable for formal project documentation. Use clear, concise language. Format with bullet points if appropriate."}

Return ONLY the structured content (no JSON, no extra explanation).
```

**Custom Prompts** (template can define):
- "Summarize these risks in order of severity"
- "Convert these meeting notes into action items with owners"
- "Structure these requirements into functional and non-functional categories"

---

### Groq API Integration

**Service Method**:
```typescript
async generateFieldContent(fieldLabel: string, rawInput: string, customPrompt?: string): Promise<string> {
  const prompt = `You are a project documentation assistant. The user is filling out a field labeled "${fieldLabel}".

Raw input:
${rawInput}

${customPrompt || "Transform this into structured, professional content suitable for formal project documentation."}

Return ONLY the structured content.`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a project documentation assistant.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          Authorization: `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data?.choices?.[0]?.message?.content || rawInput;
  } catch (error) {
    console.error('AI generation error:', error.message);
    return rawInput;  // Fallback to raw input
  }
}
```

---

## Export Functionality

### Supported Formats

1. **PDF**: Formatted document (requires PDF generation library)
2. **DOCX**: Microsoft Word format
3. **TXT**: Plain text

---

### DOCX Export

**Implementation** (using `docx` library):

```typescript
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell } from 'docx';

async exportInstanceToDocx(instanceId: string) {
  const instance = await this.findOne(instanceId);
  const template = instance.template;
  const data = instance.currentVersion.data;

  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({ text: instance.name, heading: HeadingLevel.TITLE })
  );

  // Metadata
  children.push(
    new Paragraph({ text: `Template: ${template.name}` }),
    new Paragraph({ text: `Status: ${instance.status}` }),
    new Paragraph({ text: `Version: ${instance.currentVersion.versionNumber}` }),
    new Paragraph({ text: '' })
  );

  // Render fields
  for (const field of template.templateStructure.fields) {
    const value = data[field.id];

    if (field.type === 'section-header') {
      children.push(
        new Paragraph({ text: field.label, heading: HeadingLevel.HEADING_1 })
      );
    } else if (field.type === 'divider') {
      children.push(new Paragraph({ text: '─'.repeat(50) }));
    } else if (field.type === 'description') {
      children.push(new Paragraph({ text: field.label, italics: true }));
    } else if (field.type === 'table') {
      // Render table
      children.push(
        new Paragraph({ text: field.label, heading: HeadingLevel.HEADING_2 })
      );

      const tableRows: TableRow[] = [];
      // Header row
      tableRows.push(
        new TableRow({
          children: field.columns.map(col =>
            new TableCell({ children: [new Paragraph({ text: col.label, bold: true })] })
          )
        })
      );
      // Data rows
      if (Array.isArray(value)) {
        value.forEach(row => {
          tableRows.push(
            new TableRow({
              children: field.columns.map(col =>
                new TableCell({ children: [new Paragraph({ text: String(row[col.id] || '') })] })
              )
            })
          );
        });
      }

      children.push(new Table({ rows: tableRows }));
    } else {
      // Regular fields
      children.push(
        new Paragraph({ text: field.label, bold: true }),
        new Paragraph({ text: formatValue(value, field.type) }),
        new Paragraph({ text: '' })
      );
    }
  }

  const doc = new Document({
    sections: [{ children }]
  });

  const buffer = await Packer.toBuffer(doc);
  return {
    buffer,
    fileName: `${instance.name}.docx`,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
}

function formatValue(value: any, type: string): string {
  if (value === null || value === undefined) return '';

  switch (type) {
    case 'text':
    case 'textarea':
      return String(value);
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'number':
      return String(value);
    case 'tags':
      return Array.isArray(value) ? value.join(', ') : '';
    case 'toggle':
      return value ? 'Yes' : 'No';
    default:
      return String(value);
  }
}
```

---

### TXT Export

**Implementation**:
```typescript
async exportInstanceToTxt(instanceId: string) {
  const instance = await this.findOne(instanceId);
  const template = instance.template;
  const data = instance.currentVersion.data;

  const lines: string[] = [];

  // Title
  lines.push(instance.name);
  lines.push('='.repeat(instance.name.length));
  lines.push('');
  lines.push(`Template: ${template.name}`);
  lines.push(`Status: ${instance.status}`);
  lines.push(`Version: ${instance.currentVersion.versionNumber}`);
  lines.push('');

  // Fields
  for (const field of template.templateStructure.fields) {
    const value = data[field.id];

    if (field.type === 'section-header') {
      lines.push('');
      lines.push(field.label);
      lines.push('-'.repeat(field.label.length));
    } else if (field.type === 'divider') {
      lines.push('─'.repeat(50));
    } else if (field.type === 'table') {
      lines.push('');
      lines.push(field.label + ':');
      if (Array.isArray(value)) {
        value.forEach((row, index) => {
          lines.push(`  Row ${index + 1}:`);
          field.columns.forEach(col => {
            lines.push(`    ${col.label}: ${row[col.id] || ''}`);
          });
        });
      }
    } else {
      lines.push('');
      lines.push(`${field.label}:`);
      lines.push(formatValue(value, field.type));
    }
  }

  const textBody = lines.join('\n');
  return {
    buffer: Buffer.from(textBody, 'utf-8'),
    fileName: `${instance.name}.txt`,
    contentType: 'text/plain'
  };
}
```

---

## API Endpoints

### Template Endpoints

#### 1. Get All Templates
```http
GET /api/artifact-templates?projectId={uuid}
Authorization: Bearer {accessToken}

Response: 200 OK
[ ...templates array... ]
```

#### 2. Get Template by ID
```http
GET /api/artifact-templates/{templateId}
Authorization: Bearer {accessToken}

Response: 200 OK
{ ...template object... }
```

#### 3. Create Template
```http
POST /api/artifact-templates
Authorization: Bearer {accessToken}
Content-Type: application/json

Body:
{
  "name": "Project Charter",
  "category": "PROJECT_GOVERNANCE",
  "description": "...",
  "templateStructure": { "fields": [...] },
  "isPublished": true,
  "projectId": "project-uuid"
}

Response: 201 Created
```

#### 4. Update Template
```http
PATCH /api/artifact-templates/{templateId}
Authorization: Bearer {accessToken}

Body:
{
  "name": "Updated Template Name",
  "templateStructure": { ... }
}

Response: 200 OK
```

#### 5. Delete Template
```http
DELETE /api/artifact-templates/{templateId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

---

### Instance Endpoints

#### 6. Get Instances by Project
```http
GET /api/artifact-instances?projectId={uuid}
Authorization: Bearer {accessToken}

Response: 200 OK
[ ...instances array... ]
```

#### 7. Get Instance by ID
```http
GET /api/artifact-instances/{instanceId}
Authorization: Bearer {accessToken}

Response: 200 OK
{ ...instance with template and currentVersion... }
```

#### 8. Create Instance
```http
POST /api/artifact-instances
Authorization: Bearer {accessToken}

Body:
{
  "templateId": "template-uuid",
  "projectId": "project-uuid",
  "name": "StandupSnap Project Charter",
  "description": "...",
  "status": "IN_PROGRESS"
}

Response: 201 Created
```

#### 9. Update Instance Metadata
```http
PATCH /api/artifact-instances/{instanceId}
Authorization: Bearer {accessToken}

Body:
{
  "name": "Updated Name",
  "status": "COMPLETED"
}

Response: 200 OK
```

#### 10. Update Current Version Data
```http
PATCH /api/artifact-instances/{instanceId}/current-version-data
Authorization: Bearer {accessToken}

Body:
{
  "data": {
    "fld-001": "value",
    "fld-002": "value",
    ...
  }
}

Response: 200 OK
```

#### 11. Delete Instance
```http
DELETE /api/artifact-instances/{instanceId}
Authorization: Bearer {accessToken}

Response: 204 No Content
```

---

### Version Endpoints

#### 12. Get All Versions of Instance
```http
GET /api/artifact-instances/{instanceId}/versions
Authorization: Bearer {accessToken}

Response: 200 OK
[ ...versions array... ]
```

#### 13. Get Specific Version
```http
GET /api/artifact-instances/{instanceId}/versions/{versionId}
Authorization: Bearer {accessToken}

Response: 200 OK
{ ...version object with data... }
```

#### 14. Create New Version
```http
POST /api/artifact-instances/{instanceId}/versions
Authorization: Bearer {accessToken}

Body:
{
  "data": { ...new data... },
  "changeSummary": "Updated budget and timeline",
  "isMajorVersion": false
}

Response: 201 Created
```

#### 15. Restore Version
```http
POST /api/artifact-instances/{instanceId}/versions/{versionId}/restore
Authorization: Bearer {accessToken}

Response: 200 OK
{ ...new version created from restored data... }
```

---

### Export Endpoints

#### 16. Export Instance to DOCX
```http
GET /api/artifact-instances/{instanceId}/export/docx
Authorization: Bearer {accessToken}

Response: 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="{instanceName}.docx"
```

#### 17. Export Instance to TXT
```http
GET /api/artifact-instances/{instanceId}/export/txt
Authorization: Bearer {accessToken}

Response: 200 OK
Content-Type: text/plain
Content-Disposition: attachment; filename="{instanceName}.txt"
```

---

### AI Endpoints

#### 18. AI Field Assist
```http
POST /api/artifact-instances/ai-assist
Authorization: Bearer {accessToken}

Body:
{
  "fieldId": "fld-002",
  "fieldLabel": "Project Objectives",
  "rawInput": "Raw notes...",
  "customPrompt": "Optional custom prompt"
}

Response: 200 OK
{
  "structuredContent": "AI-generated structured content..."
}
```

---

## Complete User Journeys

### Journey 1: Create Template and Use It

1. **Scrum Master creates Project Charter template**
   - Navigate to Template Library
   - Click "Create Template"
   - Enter metadata:
     - Name: "Project Charter"
     - Category: Project Governance
     - Description: "Formal project authorization"
     - Project: StandupSnap

2. **SM builds template structure**
   - Drag "Single-line Text" → Configure: "Project Title", required
   - Drag "Multi-line Text Area" → Configure: "Project Objectives", AI enabled
   - Drag "Date Picker" → Configure: "Start Date"
   - Drag "Dropdown" → Configure: "Priority", options: High/Medium/Low
   - Drag "Number" → Configure: "Budget (USD)"
   - Drag "Tags" → Configure: "Stakeholders"
   - Drag "Section Header" → Configure: "Milestones"
   - Drag "Table" → Configure columns: Milestone Name, Due Date, Status
   - Drag "Section Header" → Configure: "Risks"
   - Drag "Multi-line Text" → Configure: "Key Risks"

3. **SM saves and publishes template**
   - Click "Publish Template"
   - Template now available to team

4. **Team member creates document from template**
   - Navigate to Artifacts
   - Click "Create Document"
   - Select "Project Charter" template
   - Redirected to form

5. **User fills document**
   - Enter "StandupSnap Migration Project"
   - Enter raw objectives, click "Generate with AI"
   - AI structures objectives
   - Fill start date, priority, budget
   - Add stakeholder tags
   - Fill milestone table (3 rows)
   - Enter key risks

6. **User saves document**
   - Click "Save Document"
   - Document created with v1.0

7. **User later updates document**
   - Edit document
   - Update budget and add milestone
   - Click "Save" (updates v1.0 data)

8. **User creates new version**
   - Click "Create New Version"
   - Select "Minor Version"
   - Enter change summary: "Updated budget and added Q2 milestone"
   - Creates v1.1

9. **User exports document**
   - Click "Export DOCX"
   - Download formatted Word document
   - Share with stakeholders

---

### Journey 2: Version Rollback

1. **User has document at v1.3**
   - Current version has recent changes

2. **User realizes mistake**
   - Needs to revert to v1.1 data

3. **User views version history**
   - Clicks "Version History"
   - Sees: v1.3, v1.2, v1.1, v1.0

4. **User restores v1.1**
   - Clicks "Restore" on v1.1
   - Confirms restoration

5. **System creates v1.4**
   - New version with v1.1 data
   - Change summary: "Restored from version 1.1"
   - Current version now v1.4 (with v1.1 content)

6. **User reviews restored data**
   - Sees old values restored
   - Can edit further if needed

---

## Business Rules

### Template Rules

1. **Template Structure**
   - All fields must have unique IDs
   - Field order determines display order
   - Template structure is immutable once instances exist (editing creates new template version conceptually, but doesn't affect old instances)

2. **System Templates**
   - Cannot be edited by regular users
   - Can be duplicated and customized
   - Always visible to all projects

3. **Project Templates**
   - Only visible within project
   - Only creator can edit (or project admin)
   - Can be deleted if no instances exist

4. **Template Deletion**
   - Cannot delete if instances exist
   - Must archive/delete all instances first

---

### Instance Rules

1. **Instance Creation**
   - Must be created from template
   - Must belong to project
   - Initial version (v1.0) created automatically

2. **Data Validation**
   - Required fields enforced on save
   - Type validation (date format, number range, etc.)
   - Custom validation rules (if defined in template)

3. **Version Creation**
   - Manual action (user chooses when to version)
   - Auto-save updates current version (no new version)
   - Major vs. minor controlled by user

4. **Version Numbering**
   - Always increments (never decrements)
   - Format: {major}.{minor}
   - Restore creates new version (doesn't delete newer versions)

---

### AI Rules

1. **AI Availability**
   - Requires GROQ_API_KEY configured
   - If AI fails, fallback to raw input
   - User can always edit AI output

2. **AI Usage**
   - Optional on all AI-enabled fields
   - User triggers manually
   - Results are suggestions, not final

---

### Export Rules

1. **Export Formats**
   - DOCX: Full formatting, tables, sections
   - TXT: Plain text, basic structure
   - PDF: (Future) Formatted document

2. **Export Content**
   - Exports current version data
   - Includes all filled fields
   - Respects template structure

---

## Code References

### Backend Files

- **Entities**:
  - `F:\StandupSnap\backend\src\entities\artifact-template.entity.ts`
  - `F:\StandupSnap\backend\src\entities\artifact-instance.entity.ts`
  - `F:\StandupSnap\backend\src\entities\artifact-version.entity.ts`
- **Services**:
  - `F:\StandupSnap\backend\src\artifacts\artifact-templates.service.ts`
  - `F:\StandupSnap\backend\src\artifacts\artifact-instances.service.ts`
- **Controllers**:
  - `F:\StandupSnap\backend\src\artifacts\artifact-templates.controller.ts`
  - `F:\StandupSnap\backend\src\artifacts\artifact-instances.controller.ts`
- **Module**: `F:\StandupSnap\backend\src\artifacts\artifacts.module.ts`

### Frontend Files

- **Types**: `F:\StandupSnap\frontend\src\types\artifact.ts`
- **API Service**: `F:\StandupSnap\frontend\src\services\api\artifacts.ts`

---

## Summary

Form Builder (Artifact Templates & Instances) is a **powerful dynamic document creation system** that:

- **Templates**: Define reusable document structures with 15+ field types
- **Instances**: Create filled documents from templates
- **Versioning**: Track document changes over time with version snapshots
- **AI Integration**: AI-assisted content generation for specific fields
- **Export**: Download documents as DOCX or TXT
- **Flexibility**: Supports simple forms to complex multi-section documents

**Key Features**:
- Drag-and-drop template builder
- Dynamic form rendering based on JSON schema
- Version control with rollback capability
- AI field assistance via Groq API
- Table support for structured data
- Category-based organization
- System-wide and project-scoped templates
- Export to multiple formats

This module enables **standardized project documentation** while maintaining **flexibility and version history**.
