export const WARRANTY_CLAIM_ENTITY_ID = 'warranty_claims:claim' as const

export const WARRANTY_DICTIONARY_KEYS = {
  status: 'warranty_claims.status',
  priority: 'warranty_claims.priority',
  category: 'warranty_claims.category',
} as const

export const WARRANTY_STATUS_KEYS = {
  pending: 'oczekuje',
  transferredUnresolved: 'przekazana_nieusunięta',
  resolved: 'usunięta',
  rejected: 'odrzucona',
} as const

export const WARRANTY_STATUS_ORDER = ['oczekuje', 'przekazana_nieusunięta', 'usunięta', 'odrzucona'] as const
export const WARRANTY_PRIORITY_ORDER = ['niski', 'sredni', 'wysoki', 'krytyczny'] as const
export const WARRANTY_DEFAULT_CREATE_STATUS_KEY = WARRANTY_STATUS_KEYS.pending
export const WARRANTY_DEFAULT_CREATE_PRIORITY_KEY = WARRANTY_PRIORITY_ORDER[1]

export type WarrantyDictionaryKind = keyof typeof WARRANTY_DICTIONARY_KEYS
