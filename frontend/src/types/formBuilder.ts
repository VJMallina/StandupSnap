// ========== ENUMS ==========

export enum TemplateCategory {
  GOVERNANCE = 'GOVERNANCE',
  PLANNING = 'PLANNING',
  REPORTING = 'REPORTING',
  COMMUNICATION = 'COMMUNICATION',
  CUSTOM = 'CUSTOM',
}

export enum TemplateStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum TemplateVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum InstanceStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum FieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  RICH_TEXT = 'RICH_TEXT',
  DROPDOWN = 'DROPDOWN',
  YES_NO = 'YES_NO',
  DATE = 'DATE',
  NUMBER = 'NUMBER',
  TAG = 'TAG',
  TABLE = 'TABLE',
  AI_ASSIST = 'AI_ASSIST',
  FILE_UPLOAD = 'FILE_UPLOAD',
  SECTION_HEADER = 'SECTION_HEADER',
  DESCRIPTION = 'DESCRIPTION',
  DIVIDER = 'DIVIDER',
  COLLAPSIBLE = 'COLLAPSIBLE',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  RATING = 'RATING',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  MULTI_SELECT = 'MULTI_SELECT',
  DATE_RANGE = 'DATE_RANGE',
  SLIDER = 'SLIDER',
}

// ========== INTERFACES ==========

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customValidation?: string;
}

export interface FieldProperties {
  options?: FieldOption[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  allowMultiple?: boolean;
  maxRating?: number;
  ratingIcon?: string;
  columns?: Array<{
    id: string;
    label: string;
    type: string;
  }>;
  aiPrompt?: string;
  aiContext?: string;
  enableMarkdown?: boolean;
  rows?: number;
  step?: number;
  showValue?: boolean;
  width?: 'FULL' | 'HALF' | 'THIRD';
  columnStart?: number;
  columnSpan?: number;
}

export interface ConditionalLogic {
  show: boolean;
  when?: {
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN';
    value: any;
  };
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  helpText?: string;
  required: boolean;
  order: number;
  defaultValue?: any;
  properties?: FieldProperties;
  validation?: FieldValidation;
  conditional?: ConditionalLogic;
}

export interface TemplateSettings {
  allowAnonymous?: boolean;
  allowMultipleSubmissions?: boolean;
  showProgressBar?: boolean;
  enableAutoSave?: boolean;
  submitButtonText?: string;
  successMessage?: string;
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
  };
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  status: TemplateStatus;
  visibility: TemplateVisibility;
  version: number;
  fields: FormField[];
  settings?: TemplateSettings;
  isArchived: boolean;
  archivedAt?: string;
  publishedAt?: string;
  project?: {
    id: string;
    name: string;
  };
  createdBy?: {
    id: string;
    email: string;
  };
  updatedBy?: {
    id: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InstanceMetadata {
  ipAddress?: string;
  userAgent?: string;
  submissionTime?: number;
  deviceType?: string;
  location?: string;
}

export interface FormInstance {
  id: string;
  name?: string;
  template: FormTemplate;
  project: {
    id: string;
    name: string;
  };
  version: number;
  values: Record<string, any>;
  status: InstanceStatus;
  templateVersion: number;
  metadata?: InstanceMetadata;
  isArchived: boolean;
  archivedAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: {
    id: string;
    email: string;
  };
  approvalNotes?: string;
  createdBy?: {
    id: string;
    email: string;
  };
  updatedBy?: {
    id: string;
    email: string;
  };
  submittedBy?: {
    id: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ========== INPUT TYPES ==========

export interface CreateFormTemplateInput {
  projectId?: string;
  name: string;
  description?: string;
  category?: TemplateCategory;
  status?: TemplateStatus;
  visibility?: TemplateVisibility;
  fields?: FormField[];
  settings?: TemplateSettings;
}

export interface UpdateFormTemplateInput {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  status?: TemplateStatus;
  visibility?: TemplateVisibility;
  fields?: FormField[];
  settings?: TemplateSettings;
  version?: number;
}

export interface CreateFormInstanceInput {
  templateId: string;
  projectId: string;
  name?: string;
  values?: Record<string, any>;
  status?: InstanceStatus;
}

export interface UpdateFormInstanceInput {
  name?: string;
  values?: Record<string, any>;
  status?: InstanceStatus;
  approvalNotes?: string;
  approvedBy?: string;
}

export interface UpdateFieldOrderInput {
  fieldIds: string[];
}

// ========== FILTER TYPES ==========

export interface TemplateFilters {
  status?: TemplateStatus;
  category?: TemplateCategory;
  includeArchived?: boolean;
  search?: string;
}

export interface InstanceFilters {
  templateId?: string;
  status?: InstanceStatus;
  includeArchived?: boolean;
  search?: string;
}
