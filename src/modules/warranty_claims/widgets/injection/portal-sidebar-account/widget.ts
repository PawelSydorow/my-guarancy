import { InjectionPosition } from '@open-mercato/shared/modules/widgets/injection-position'
import type { InjectionMenuItemWidget } from '@open-mercato/shared/modules/widgets/injection'

const widget: InjectionMenuItemWidget = {
  metadata: {
    id: 'warranty_claims.injection.portal-sidebar-account',
  },
  menuItems: [
    {
      id: 'warranty-claims-backoffice',
      label: 'Panel obslugi',
      icon: 'lucide:shield',
      href: '/backend/warranty-claims',
      groupId: 'warranty-claims-account',
      groupLabel: 'Obsluga',
      placement: { position: InjectionPosition.First },
    },
  ],
}

export default widget
