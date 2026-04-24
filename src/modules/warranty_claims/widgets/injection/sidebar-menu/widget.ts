import { InjectionPosition } from '@open-mercato/shared/modules/widgets/injection-position'
import type { InjectionMenuItemWidget } from '@open-mercato/shared/modules/widgets/injection'

const widget: InjectionMenuItemWidget = {
  metadata: {
    id: 'warranty_claims.injection.sidebar-menu',
  },
  menuItems: [
    {
      id: 'warranty-claims-create',
      label: 'Nowe zgłoszenie',
      icon: 'plus-square',
      href: '/backend/warranty-claims/create',
      features: ['warranty_claims.create'],
      groupId: 'Serwis',
      groupLabel: 'Serwis',
      placement: { position: InjectionPosition.First },
    },
  ],
}

export default widget
