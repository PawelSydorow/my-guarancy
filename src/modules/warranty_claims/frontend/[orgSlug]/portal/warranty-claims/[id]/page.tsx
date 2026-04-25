import PortalClaimDetail from '../../../../../components/portal/PortalClaimDetail'
import PortalClaimCreateForm from '../../../../../components/portal/PortalClaimCreateForm'

type Props = {
  params: Promise<{
    orgSlug: string
    id: string
  }>
}

export default async function PortalWarrantyClaimDetailPage({ params }: Props) {
  const resolvedParams = await params
  if (resolvedParams.id === 'create') {
    return <PortalClaimCreateForm orgSlug={resolvedParams.orgSlug} />
  }
  return <PortalClaimDetail orgSlug={resolvedParams.orgSlug} claimId={resolvedParams.id} />
}
