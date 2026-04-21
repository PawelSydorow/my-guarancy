export type WarrantyClaimRecord = {
  id: string
  organization_id: string
  tenant_id: string
  is_active: boolean
  project_id: string
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

export type LookupOption = {
  id: string
  label: string
  description?: string | null
}

export type LookupBundle = {
  projects: LookupOption[]
  users: LookupOption[]
  statuses: LookupOption[]
  priorities: LookupOption[]
  categories: LookupOption[]
}
