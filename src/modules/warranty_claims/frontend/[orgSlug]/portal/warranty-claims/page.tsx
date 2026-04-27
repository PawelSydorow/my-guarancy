import PortalClaimsTable from '../../../../components/portal/PortalClaimsTable'

type Props = {
  params: {
    orgSlug: string
  }
}

export default function PortalWarrantyClaimsPage({ params }: Props) {
  return <PortalClaimsTable orgSlug={params.orgSlug} />
}
