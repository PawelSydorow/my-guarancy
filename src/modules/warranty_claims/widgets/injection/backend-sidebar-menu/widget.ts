import { InjectionPosition } from '@open-mercato/shared/modules/widgets/injection-position'
import type { InjectionMenuItemWidget } from '@open-mercato/shared/modules/widgets/injection'

const widget: InjectionMenuItemWidget = {
  metadata: {
    id: 'warranty_claims.injection.backend-sidebar-menu',
  },
  menuItems: [
    {
      id: 'warranty-claims-projects-add',
      label: 'Dodaj projekt',
      icon: 'lucide:circle-plus',
      href: '/backend/warranty-claims/projects/add',
      groupId: 'warranty-claims-projects',
      groupLabel: 'Projekty',
      placement: { position: InjectionPosition.First },
    },
    {
      id: 'warranty-claims-projects-list',
      label: 'Lista projektów',
      icon: 'lucide:files',
      href: '/backend/warranty-claims/projects/list',
      groupId: 'warranty-claims-projects',
      groupLabel: 'Projekty',
      placement: { position: InjectionPosition.After, relativeTo: 'warranty-claims-projects-add' },
    },
    {
      id: 'warranty-claims-subcontractors-add',
      label: 'Dodaj podwykonawcę',
      icon: 'lucide:circle-plus',
      href: '/backend/warranty-claims/subcontractors/add',
      groupId: 'warranty-claims-subcontractors',
      groupLabel: 'Podwykonawcy',
      placement: { position: InjectionPosition.After, relativeTo: 'warranty-claims-projects-list' },
    },
    {
      id: 'warranty-claims-subcontractors-list',
      label: 'Lista podwykonawców',
      icon: 'lucide:files',
      href: '/backend/warranty-claims/subcontractors/list',
      groupId: 'warranty-claims-subcontractors',
      groupLabel: 'Podwykonawcy',
      placement: { position: InjectionPosition.After, relativeTo: 'warranty-claims-subcontractors-add' },
    },
  ],
}

export default widget
