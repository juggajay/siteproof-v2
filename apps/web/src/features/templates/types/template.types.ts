export type FieldType = 'text' | 'number' | 'checkbox' | 'select' | 'date' | 'signature' | 'photo' | 'textarea';

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  required?: boolean;
}

export interface TemplateField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  validation?: FieldValidation;
  options?: string[]; // For select fields
  multiple?: boolean; // For photo fields
  defaultValue?: any;
}

export interface TemplateItem {
  id: string;
  type: 'checkpoint';
  title: string;
  description?: string;
  order: number;
  required?: boolean;
  fields: TemplateField[];
}

export interface TemplateSection {
  id: string;
  type: 'section';
  title: string;
  description?: string;
  order: number;
  items: TemplateItem[];
}

export type TemplateStructureItem = TemplateSection | TemplateItem;

export interface ITPTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category?: string;
  structure: TemplateStructureItem[];
  isActive: boolean;
  version: number;
  usageCount: number;
  lastUsedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  category?: string;
  structure: TemplateStructureItem[];
}

export interface UpdateTemplateData extends Partial<CreateTemplateData> {
  isActive?: boolean;
}