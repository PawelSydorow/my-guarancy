import PortalClaimCreateForm from '../../../../../components/portal/PortalClaimCreateForm'

type Props = {
  params: {
    orgSlug: string
  }
}

export default function PortalWarrantyClaimCreatePage({ params }: Props) {
  return <PortalClaimCreateForm orgSlug={params.orgSlug} />
}
