import WarrantyClaimForm from '../../../../components/WarrantyClaimForm'

export default async function EditWarrantyClaimPage({ params }: { params?: Promise<{ id?: string }> }) {
  const resolvedParams = params ? await params : undefined
  return <WarrantyClaimForm mode="edit" claimId={resolvedParams?.id} />
}
