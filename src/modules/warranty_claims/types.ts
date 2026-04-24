import { formatWarrantyClaimNumber } from './lib/format'

export type WarrantyClaimRecord = {
  id: string
  organization_id: string
  tenant_id: string
  is_active: boolean
  project_id: string
  claim_number: number
  claim_number_formatted: string
  title: string
  issue_description: string
  location_text: string
  priority_key: string
  category_key: string
  bas_number: string
  status_key: string
  reported_at: string
  assigned_user_id: string | null
  resolved_at: string | null
  subcontractor_id: string | null
  subcontractor_name: string | null
  subcontractor_address: string | null
  subcontractor_email: string | null
  subcontractor_phone: string | null
  subcontractor_contact_person: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export type WarrantyClaimApiRecord = Partial<WarrantyClaimRecord> & {
  id: string
  title: string
  organizationId?: string
  tenantId?: string
  isActive?: boolean
  projectId?: string
  claimNumber?: number
  claim_number?: number
  claimNumberFormatted?: string
  claim_number_formatted?: string
  issueDescription?: string
  locationText?: string
  priorityKey?: string
  categoryKey?: string
  basNumber?: string
  statusKey?: string
  reportedAt?: string
  assignedUserId?: string | null
  resolvedAt?: string | null
  subcontractorId?: string | null
  subcontractorName?: string | null
  subcontractorAddress?: string | null
  subcontractorEmail?: string | null
  subcontractorPhone?: string | null
  subcontractorContactPerson?: string | null
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

export function normalizeWarrantyClaimRecord(input: WarrantyClaimApiRecord): WarrantyClaimRecord {
  const claimNumber = input.claim_number ?? input.claimNumber ?? 0
  return {
    id: input.id,
    organization_id: input.organization_id ?? input.organizationId ?? '',
    tenant_id: input.tenant_id ?? input.tenantId ?? '',
    is_active: input.is_active ?? input.isActive ?? true,
    project_id: input.project_id ?? input.projectId ?? '',
    claim_number: claimNumber,
    claim_number_formatted: input.claim_number_formatted ?? input.claimNumberFormatted ?? formatWarrantyClaimNumber(claimNumber),
    title: input.title,
    issue_description: input.issue_description ?? input.issueDescription ?? '',
    location_text: input.location_text ?? input.locationText ?? '',
    priority_key: input.priority_key ?? input.priorityKey ?? '',
    category_key: input.category_key ?? input.categoryKey ?? '',
    bas_number: input.bas_number ?? input.basNumber ?? '',
    status_key: input.status_key ?? input.statusKey ?? '',
    reported_at: input.reported_at ?? input.reportedAt ?? '',
    assigned_user_id: input.assigned_user_id ?? input.assignedUserId ?? null,
    resolved_at: input.resolved_at ?? input.resolvedAt ?? null,
    subcontractor_id: input.subcontractor_id ?? input.subcontractorId ?? null,
    subcontractor_name: input.subcontractor_name ?? input.subcontractorName ?? null,
    subcontractor_address: input.subcontractor_address ?? input.subcontractorAddress ?? null,
    subcontractor_email: input.subcontractor_email ?? input.subcontractorEmail ?? null,
    subcontractor_phone: input.subcontractor_phone ?? input.subcontractorPhone ?? null,
    subcontractor_contact_person: input.subcontractor_contact_person ?? input.subcontractorContactPerson ?? null,
    created_at: input.created_at ?? input.createdAt ?? '',
    updated_at: input.updated_at ?? input.updatedAt ?? '',
    deleted_at: input.deleted_at ?? input.deletedAt ?? null,
  }
}

export type LookupOption = {
  id: string
  label: string
  description?: string | null
  address?: string | null
  email?: string | null
  phone?: string | null
  contactPerson?: string | null
}

export type LookupBundle = {
  projects: LookupOption[]
  users: LookupOption[]
  statuses: LookupOption[]
  priorities: LookupOption[]
  categories: LookupOption[]
  subcontractors: LookupOption[]
}
