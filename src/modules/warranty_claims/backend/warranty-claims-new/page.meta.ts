export const metadata = {
  requireAuth: true,
  requireFeatures: ['warranty_claims.create'],
  pageTitle: 'Dodaj zgłoszenie',
  pageGroup: 'Serwis',
  pageOrder: 119,
  icon: 'plus-circle',
  breadcrumb: [
    { label: 'Zgłoszenia gwarancyjne', href: '/backend/warranty-claims' },
    { label: 'Dodaj zgłoszenie' },
  ],
}
