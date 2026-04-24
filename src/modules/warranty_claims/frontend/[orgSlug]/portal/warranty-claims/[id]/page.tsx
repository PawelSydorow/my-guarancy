import PortalClaimDetail from '../../../../../components/portal/PortalClaimDetail'

type Props = {
  params: {
    orgSlug: string
    id: string
  }
}

export default function PortalWarrantyClaimDetailPage({ params }: Props) {
  return <PortalClaimDetail orgSlug={params.orgSlug} claimId={params.id} />
}
