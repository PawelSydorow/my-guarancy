export const WARRANTY_CLAIM_ENTITY_ID = 'warranty_claims:claim' as const

export const WARRANTY_DICTIONARY_KEYS = {
  status: 'warranty_claims.status',
  priority: 'warranty_claims.priority',
  category: 'warranty_claims.category',
} as const

export const WARRANTY_STATUS_KEYS = {
  pending: 'oczekuje',
  inProgress: 'w_trakcie',
  completed: 'zakonczone',
} as const

export const WARRANTY_PRIORITY_ORDER = ['niski', 'sredni', 'wysoki', 'krytyczny'] as const

export type WarrantyDictionaryKind = keyof typeof WARRANTY_DICTIONARY_KEYS
