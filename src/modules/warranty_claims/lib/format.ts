export function formatWarrantyClaimNumber(value: number | null | undefined): string {
  if (!Number.isInteger(value) || value === null || value === undefined || value <= 0) return ''
  return String(value).padStart(3, '0')
}
